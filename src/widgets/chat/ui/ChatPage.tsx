'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GuildThread } from './GuildThread';
import { DirectThread } from './DirectThread';
import { ConversationList } from './ConversationList';
import type { Guild } from '@/entities/guild';
import type { GuildMessage } from '@/entities/guild-message';
import type { DmProfile } from '@/entities/direct-message';
import { useGetConversationsQuery } from '@/entities/direct-message';
import { useAppSelector } from '@/shared/lib/hooks';
import styles from './ChatPage.module.css';

interface ChatPageProps {
  guilds: Guild[];
  userId?: string;
  viewerProfile?: GuildMessage['profile'];
  initialGuildId?: string;
  initialDmPublicId?: string;
  initialPeer?: DmProfile & { id: string; lastSeenAt: string | null };
}

export const ChatPage: React.FC<ChatPageProps> = ({
  guilds,
  userId,
  viewerProfile,
  initialGuildId,
  initialDmPublicId,
  initialPeer,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dmParam = searchParams.get('dm');
  const scopeParam = searchParams.get('scope');
  
  // Use param from URL if present, otherwise initial prop from SSR
  const activeDm = dmParam !== null ? dmParam : initialDmPublicId;
  const isOfficerChat = scopeParam === 'officers' && !activeDm;

  const activeGuildId = useAppSelector((s) => s.guild.currentGuildId) ?? initialGuildId ?? guilds[0]?.id;
  const activeGuildRole = guilds.find((g) => g.id === activeGuildId)?.role;
  const isOfficer = activeGuildRole === 'ADMIN' || activeGuildRole === 'OWNER';

  const effectiveOfficer = isOfficerChat && isOfficer;
  const isGuildChat = !activeDm && !effectiveOfficer;

  const { data: conversations = [] } = useGetConversationsQuery();

  const handleSelectGuild = () => {
    router.replace('/guild-chat', { scroll: false });
  };

  const handleSelectOfficer = () => {
    router.replace('/guild-chat?scope=officers', { scroll: false });
  };

  const handleSelectPeer = (publicId: string) => {
    router.replace(`/guild-chat?dm=${publicId}`, { scroll: false });
  };

  const resolvedPeer = useMemo(() => {
    if (!activeDm) return null;
    const conv = conversations.find(c => c.peer.publicId === activeDm);
    if (conv) return conv.peer;
    if (initialPeer && initialPeer.publicId === activeDm) return initialPeer;
    return null;
  }, [activeDm, conversations, initialPeer]);

  return (
    <div className={styles.container}>
      <div className={`${styles.sidebar} ${!isGuildChat ? styles.mobileHidden : ''}`}>
        <ConversationList
          guilds={guilds}
          userId={userId}
          initialGuildId={initialGuildId}
          activePeerId={activeDm}
          guildSelected={isGuildChat}
          onSelectGuild={handleSelectGuild}
          onSelectPeer={handleSelectPeer}
          isOfficer={isOfficer}
          officerSelected={effectiveOfficer}
          onSelectOfficer={handleSelectOfficer}
        />
      </div>
      <div className={`${styles.main} ${isGuildChat || effectiveOfficer ? styles.mobileHidden : ''}`}>
        {effectiveOfficer ? (
          <GuildThread
            guilds={guilds}
            userId={userId}
            viewerProfile={viewerProfile}
            initialGuildId={initialGuildId}
            scope="officers"
          />
        ) : isGuildChat ? (
          <GuildThread
            guilds={guilds}
            userId={userId}
            viewerProfile={viewerProfile}
            initialGuildId={initialGuildId}
            scope="all"
          />
        ) : activeDm && resolvedPeer ? (
          <DirectThread
            peerPublicId={activeDm}
            peer={resolvedPeer}
            viewerProfile={viewerProfile}
            userId={userId}
          />
        ) : (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
          </div>
        )}
      </div>
    </div>
  );
};
