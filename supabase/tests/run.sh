#!/usr/bin/env bash
# Run the PrintFlow schema verification suite against the local stack.
#
# The suite is NOT idempotent -- it inserts fixed test users and asserts exact
# row counts -- so it owns the reset rather than trusting the caller to have
# done one. Any assertion failure aborts with a non-zero exit.
#
# Usage:  ./supabase/tests/run.sh
set -euo pipefail

cd "$(dirname "$0")/../.."

if ! docker info >/dev/null 2>&1; then
  echo "error: docker is not running (start OrbStack or Docker Desktop)" >&2
  exit 1
fi

if ! supabase status >/dev/null 2>&1; then
  echo "→ local stack is not running, starting it"
  supabase start >/dev/null
fi

DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
if [[ -z "$DB_CONTAINER" ]]; then
  echo "error: could not find the supabase db container" >&2
  exit 1
fi

echo "→ resetting database (migrations 001-007)"
supabase db reset >/dev/null

failed=0
for f in supabase/tests/*.sql; do
  echo "→ $(basename "$f")"
  if docker exec -i "$DB_CONTAINER" \
       psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < "$f" 2>&1 \
     | sed -e 's/^NOTICE:  //' -e 's/^ERROR:/\n  ERROR:/'
  then
    :
  else
    failed=1
  fi
done

if [[ $failed -ne 0 ]]; then
  echo -e "\n✗ schema verification FAILED"
  exit 1
fi
echo -e "\n✓ schema verification passed"
