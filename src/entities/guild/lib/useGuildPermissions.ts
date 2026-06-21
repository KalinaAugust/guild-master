'use client';

import { useGetGuildMembersQuery, useGetGuildsQuery } from '../api/guildApi';
import { canPerform } from '@/shared/api/guildPermissions';

export function useGuildPermissions(
  guildId: string | null | undefined,
  userId: string | null | undefined,
) {
  const { data: members = [] } = useGetGuildMembersQuery(guildId ?? '', {
    skip: !guildId || !userId,
  });
  const { data: guilds = [] } = useGetGuildsQuery(undefined, { skip: !guildId });

  const myRole = members.find((m) => m.userId === userId)?.role;
  const isOwner = myRole === 'OWNER';
  const elevated = isOwner || myRole === 'ADMIN';

  const permissions = guilds.find((g) => g.id === guildId)?.permissions ?? null;

  return {
    canEditEvents: elevated,
    canDeleteEvents: elevated,
    canManageMembers: elevated,
    isOwner,
    canCreateEvents: canPerform(permissions, 'events', myRole),
    canCreateAnnouncements: canPerform(permissions, 'announcements', myRole),
    canCreatePolls: canPerform(permissions, 'polls', myRole),
    canCreateCallToActions: canPerform(permissions, 'call_to_actions', myRole),
  };
}
