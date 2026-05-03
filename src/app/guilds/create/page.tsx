import { CreateGuildForm } from '@/features/create-guild';

export default function CreateGuildPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
      <h1 style={{ marginBottom: '20px' }}>Создание новой гильдии</h1>
      <p style={{ marginBottom: '30px', opacity: 0.8 }}>
        Похоже, вы еще не состоите ни в одной гильдии. Создайте свою, чтобы начать работу с календарем!
      </p>
      <div style={{ padding: '30px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CreateGuildForm />
      </div>
    </main>
  );
}
