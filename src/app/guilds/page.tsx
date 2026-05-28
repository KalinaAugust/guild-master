import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/shared/api/supabase/server';
import { GuildManagePage } from '@/features/manage-guilds';
import styles from './GuildsPage.module.css';

export default async function GuildsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const t = await getTranslations('Common');

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.backLink}>
        <ChevronLeft size={20} />
        {t('backToCalendar')}
      </Link>
      <GuildManagePage userId={user.id} />
    </main>
  );
}
