/**
 * Client environment.
 *
 * Expo inlines `EXPO_PUBLIC_*` at build time, so these must be read as static
 * property accesses — `process.env[key]` does not get replaced and yields
 * undefined in a production bundle.
 *
 * Only the publishable/anon key ever appears here. It is safe in a client
 * precisely because RLS (migration 004) enforces access: the key identifies the
 * project, it does not grant permission. The service_role key bypasses RLS
 * entirely and must never reach a bundle.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy apps/printflow/.env.example to .env.local and fill it in. ` +
        `For local development, \`supabase status\` prints the values.`,
    );
  }
  return value;
}

export const Env = {
  supabaseUrl: required(url, 'EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: required(anonKey, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
} as const;
