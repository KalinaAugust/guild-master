import { CreateGuildForm } from '@/features/create-guild';
import { getTranslations } from 'next-intl/server';

export default async function CreateGuildPage() {
  const t = await getTranslations('Guild');

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
      <h1 style={{ marginBottom: '20px' }}>{t('createTitle')}</h1>
      <p style={{ marginBottom: '30px', opacity: 0.8 }}>
        {t('welcomeText')}
      </p>
      <div style={{ padding: '30px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CreateGuildForm />
      </div>
    </main>
  );
}

