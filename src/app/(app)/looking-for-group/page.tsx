import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { getUser } from '@/entities/user/api/getUser';
import { CallToActionBoard } from '@/widgets/call-to-action-board';
import styles from './CallToActionPage.module.css';

export default async function CallToActionPage() {
  const user = await getUser();
  const guilds = await getMyGuilds(user?.id);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const lastActiveGuildId = user?.profile?.lastActiveGuildId;
  const defaultGuildId =
    lastActiveGuildId && guilds.some((g) => g.id === lastActiveGuildId)
      ? lastActiveGuildId
      : guilds[0].id;

  return (
    <main className={styles.main}>
      <CallToActionBoard guilds={guilds} userId={user?.id} initialGuildId={defaultGuildId} />
    </main>
  );
}
