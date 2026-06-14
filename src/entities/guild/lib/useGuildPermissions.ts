'use client';

import { useGetGuildMembersQuery } from '../api/guildApi';

export function useGuildPermissions(
  guildId: string | null | undefined,
  userId: string | null | undefined,
) {
  const { data: members = [] } = useGetGuildMembersQuery(guildId ?? '', {
    skip: !guildId || !userId,
  });
  const myRole = members.find((m) => m.userId === userId)?.role;
  const isOwner = myRole === 'OWNER';
  const elevated = isOwner || myRole === 'ADMIN';
  return { canManageEvents: elevated, canManageMembers: elevated, isOwner };
}
