import { ScreenScaffold } from '@/components/screen-scaffold';

export default function HomeScreen() {
  return (
    <ScreenScaffold
      title="Home"
      subtitle="KPI cards for today, this week, this month, and year to date. Alerts for low filament, stock below build-to, unpriced products, and anything selling at a loss."
      arrivesIn="Task 6.4"
    />
  );
}
