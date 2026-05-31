'use client';

import { useGetGuildMembersQuery } from '@/entities/guild';

export function useGuildPermissions(
  guildId: string | null | undefined,
  userId: string | null | undefined,
) {
  const { data: members = [] } = useGetGuildMembersQuery(guildId ?? '', {
    skip: !guildId || !userId,
  });
  const myRole = members.find((m) => m.userId === userId)?.role;
  const elevated = myRole === 'OWNER' || myRole === 'ADMIN';
  return { canManageEvents: elevated, canManageMembers: elevated };
}
