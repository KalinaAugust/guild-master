import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';
import { getEventParticipantUserIds } from '@/entities/event/api/getEventParticipantUserIds';
import { syncParticipants } from '@/entities/event/api/syncParticipants';

export interface AddParticipantsArgs {
  eventId: string;
  userIds: string[];
}

export const executeAddParticipants = async (
  args: AddParticipantsArgs,
  guildId: string,
): Promise<{ success: boolean; eventId?: string; addedCount?: number; error?: string }> => {
  if (!Array.isArray(args.userIds) || args.userIds.length === 0) {
    return { success: false, error: 'No userIds provided' };
  }
  try {
    const members = await getGuildMembers(guildId);
    const memberIds = new Set(members.map((m) => m.userId));
    const validIds = [...new Set(args.userIds)].filter((id) => memberIds.has(id));
    if (validIds.length === 0) {
      return { success: false, error: 'No valid guild members in the provided list' };
    }

    const current = await getEventParticipantUserIds(args.eventId);
    const currentSet = new Set(current);
    const addedCount = validIds.filter((id) => !currentSet.has(id)).length;
    const union = [...new Set([...current, ...validIds])];

    await syncParticipants(args.eventId, union);
    return { success: true, eventId: args.eventId, addedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
};
