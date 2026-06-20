import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';

export interface FindMembersArgs {
  keyword?: string;
}

interface FoundMember {
  userId: string;
  name: string;
  alias: string | null;
}

export const executeFindMembers = async (
  args: FindMembersArgs,
  guildId: string,
): Promise<{ members: FoundMember[]; error?: string }> => {
  try {
    const members = await getGuildMembers(guildId);

    const mapped: FoundMember[] = members.map((m) => {
      const { fullName, alias, displayAsAlias } = m.profile;
      const name = (displayAsAlias && alias ? alias : fullName ?? alias) ?? 'Unknown';
      return { userId: m.userId, name, alias };
    });

    const keyword = args.keyword?.toLowerCase().trim();
    if (!keyword) return { members: mapped };

    const filtered = mapped.filter((m) =>
      m.name.toLowerCase().includes(keyword) ||
      (m.alias?.toLowerCase().includes(keyword) ?? false),
    );
    return { members: filtered };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { members: [], error: message };
  }
};
