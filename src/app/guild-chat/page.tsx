import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { getUser } from '@/entities/user/api/getUser';
import { GuildChat } from '@/widgets/chat';
import styles from './GuildChatPage.module.css';

export default async function GuildChatPage() {
  const user = await getUser();
  const guilds = await getMyGuilds(user?.id);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const lastActiveGuildId = user?.profile?.lastActiveGuildId;
  const defaultGuildId = lastActiveGuildId && guilds.some((g) => g.id === lastActiveGuildId)
    ? lastActiveGuildId
    : guilds[0].id;

  return (
    <main className={styles.main}>
      <GuildChat
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
