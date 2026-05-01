import { CalendarGrid } from '@/components/CalendarGrid';

export default function Home() {
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>Guild Master</h1>
      <CalendarGrid />
    </main>
  );
}
