import { ScreenScaffold } from '@/components/screen-scaffold';

export default function MoreScreen() {
  return (
    <ScreenScaffold
      title="More"
      subtitle="Reports, pricing, expenses, tax, and settings. Settings render themselves from the database, so adding one is a row rather than a release."
      arrivesIn="Stages 4-5"
    />
  );
}
