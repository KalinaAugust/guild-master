import { CreateGuildForm } from '@/features/create-guild';
import { getTranslations } from 'next-intl/server';
import styles from './CreateGuildPage.module.css';

export default async function CreateGuildPage() {
  const t = await getTranslations('Guild');

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{t('createTitle')}</h1>
      <p className={styles.description}>
        {t('welcomeText')}
      </p>
      <div className={styles.formContainer}>
        <CreateGuildForm />
      </div>
    </main>
  );
}

