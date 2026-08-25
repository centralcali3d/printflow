import { ScreenScaffold } from '@/components/screen-scaffold';

export default function QueueScreen() {
  return (
    <ScreenScaffold
      title="Queue"
      subtitle="Print jobs grouped as Printing, Up Next, and Blocked. Start a job, complete it with actual time and failed count, or reprioritise by dragging."
      arrivesIn="Task 3.9"
    />
  );
}
