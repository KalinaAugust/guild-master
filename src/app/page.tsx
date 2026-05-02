import { CalendarGrid } from '@/widgets/calendar';
import { CreateEventModal } from '@/features/create-event';

export default function Home() {
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
      <h1 style={{ marginBottom: '20px' }}>Guild Master</h1>
      <CalendarGrid />
      <CreateEventModal />
    </main>
  );
}
