import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { getUser } from '@/entities/user/api/getUser';
import { getPublicProfile } from '@/entities/user/api/getPublicProfile';
import { ChatPage } from '@/widgets/chat';
import styles from './GuildChatPage.module.css';

export default async function GuildChatPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const dm = typeof searchParams?.dm === 'string' ? searchParams.dm : undefined;

  const user = await getUser();
  const guilds = await getMyGuilds(user?.id);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const lastActiveGuildId = user?.profile?.lastActiveGuildId;
  const defaultGuildId = lastActiveGuildId && guilds.some((g) => g.id === lastActiveGuildId)
    ? lastActiveGuildId
    : guilds[0].id;

  const initialPeerProfile = dm ? await getPublicProfile(dm) : null;
  const initialPeer = initialPeerProfile ? {
    id: initialPeerProfile.id,
    publicId: initialPeerProfile.publicId,
    fullName: initialPeerProfile.fullName,
    avatarUrl: initialPeerProfile.avatarUrl,
    alias: initialPeerProfile.alias,
    displayAsAlias: false,
    icon: initialPeerProfile.icon,
    lastSeenAt: initialPeerProfile.lastSeenAt,
  } : null;

  return (
    <main className={styles.main}>
      <div className={styles.chatWrapper}>
        <ChatPage
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
          initialDmPublicId={dm}
          initialPeer={initialPeer ?? undefined}
        />
      </div>
    </main>
  );
}
