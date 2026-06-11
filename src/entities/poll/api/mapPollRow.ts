import type { Poll } from '../model/types';

export const POLL_SELECT =
  'id, guild_id, created_by, title, description, is_anonymous, allow_multiple, allow_custom, allow_revote, closed_at, created_at, ' +
  'poll_options(id, body, position, is_custom, created_at), ' +
  'poll_votes(option_id, user_id, created_at, profiles(public_id, full_name, avatar_url, alias, display_as_alias))';

interface OptionRow {
  id: string;
  body: string;
  position: number;
  is_custom: boolean;
  created_at: string;
}

interface VoteRow {
  option_id: string;
  user_id: string;
  created_at: string;
  profiles: { public_id: string | null; full_name: string | null; avatar_url: string | null; alias: string | null; display_as_alias: boolean | null } | null;
}

export interface PollRow {
  id: string;
  guild_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  is_anonymous: boolean;
  allow_multiple: boolean;
  allow_custom: boolean;
  allow_revote: boolean;
  closed_at: string | null;
  created_at: string;
  poll_options: OptionRow[] | null;
  poll_votes: VoteRow[] | null;
}

/**
 * Maps a joined poll row to the domain `Poll`. Aggregates vote counts per option,
 * fills voter profiles only for non-anonymous polls, and derives the current user's
 * votes plus the distinct voter total.
 */
export const buildPoll = (row: PollRow, currentUserId: string | null, canManage: boolean): Poll => {
  const votes = row.poll_votes ?? [];
  const options = [...(row.poll_options ?? [])]
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
    .map((o) => {
      const optionVotes = votes.filter((v) => v.option_id === o.id);
      return {
        id: o.id,
        body: o.body,
        isCustom: o.is_custom,
        voteCount: optionVotes.length,
        voters: row.is_anonymous
          ? []
          : optionVotes
              .slice()
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((v) => ({
                publicId: v.profiles?.public_id ?? null,
                fullName: v.profiles?.full_name ?? null,
                avatarUrl: v.profiles?.avatar_url ?? null,
                alias: v.profiles?.alias ?? null,
                displayAsAlias: v.profiles?.display_as_alias ?? false,
                votedAt: v.created_at,
              })),
      };
    });

  const myVoteOptionIds = currentUserId
    ? votes.filter((v) => v.user_id === currentUserId).map((v) => v.option_id)
    : [];
  const totalVotes = new Set(votes.map((v) => v.user_id)).size;

  return {
    id: row.id,
    guildId: row.guild_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    isAnonymous: row.is_anonymous,
    allowMultiple: row.allow_multiple,
    allowCustom: row.allow_custom,
    allowRevote: row.allow_revote,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    options,
    myVoteOptionIds,
    totalVotes,
    canManage,
  };
};
