import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { getUser } from '@/entities/user/api/getUser';
import { UpcomingEventsStrip } from '@/widgets/upcoming-events';
import { GuildAnnouncements } from '@/widgets/guild-announcements';
import { getServerEvents } from '@/entities/event/api/getEvents';
import styles from './AnnouncementsPage.module.css';

export default async function AnnouncementsPage() {
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
  const initialEvents = await getServerEvents(defaultGuildId);

  return (
    <main className={styles.main}>
      <UpcomingEventsStrip
        guilds={guilds}
        userId={user?.id}
        initialEvents={initialEvents}
        initialGuildId={defaultGuildId}
      />
      <GuildAnnouncements
        guilds={guilds}
        userId={user?.id}
        viewerProfile={
          user?.profile
            ? {
                publicId: user.profile.publicId,
                fullName: user.profile.fullName,
                avatarUrl: user.profile.avatarUrl,
                alias: user.profile.alias ?? null,
                displayAsAlias: user.profile.displayAsAlias ?? false,
                icon: user.profile.icon ?? null,
              }
            : undefined
        }
        initialGuildId={defaultGuildId}
      />
    </main>
  );
}
