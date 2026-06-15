import type {
  Announcement,
  AnnouncementComment,
  AnnouncementProfile,
  ReactionSummary,
} from '../model/types';
import { REACTION_TYPES } from '../model/types';

const PROFILE_FIELDS = 'public_id, full_name, avatar_url, alias, display_as_alias, icon';

export const ANNOUNCEMENT_SELECT =
  `id, guild_id, created_by, title, content, is_pinned, created_at, updated_at, ` +
  `profiles(${PROFILE_FIELDS}), ` +
  `announcement_reactions(type, user_id), ` +
  `announcement_comments(id)`;

export const COMMENT_SELECT =
  `id, announcement_id, user_id, body, created_at, profiles(${PROFILE_FIELDS})`;

interface ProfileRow {
  public_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  alias: string | null;
  display_as_alias: boolean | null;
  icon: string | null;
}

export interface AnnouncementRow {
  id: string;
  guild_id: string;
  created_by: string | null;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  profiles: ProfileRow | null;
  announcement_reactions: { type: string; user_id: string }[] | null;
  announcement_comments: { id: string }[] | null;
}

export interface AnnouncementCommentRow {
  id: string;
  announcement_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: ProfileRow | null;
}

const mapProfile = (p: ProfileRow | null): AnnouncementProfile => ({
  publicId: p?.public_id ?? null,
  fullName: p?.full_name ?? null,
  avatarUrl: p?.avatar_url ?? null,
  alias: p?.alias ?? null,
  displayAsAlias: p?.display_as_alias ?? false,
  icon: p?.icon ?? null,
});

const buildReactions = (
  rows: { type: string; user_id: string }[],
  currentUserId: string | null,
): ReactionSummary[] =>
  REACTION_TYPES.map((type) => {
    const ofType = rows.filter((r) => r.type === type);
    return {
      type,
      count: ofType.length,
      reacted: !!currentUserId && ofType.some((r) => r.user_id === currentUserId),
    };
  });

export const buildAnnouncement = (
  row: AnnouncementRow,
  currentUserId: string | null,
  canManage: boolean,
): Announcement => ({
  id: row.id,
  guildId: row.guild_id,
  createdBy: row.created_by,
  title: row.title,
  content: row.content,
  isPinned: row.is_pinned,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: mapProfile(row.profiles),
  reactions: buildReactions(row.announcement_reactions ?? [], currentUserId),
  commentCount: (row.announcement_comments ?? []).length,
  canManage,
});

export const mapCommentRow = (row: AnnouncementCommentRow, canDelete: boolean): AnnouncementComment => ({
  id: row.id,
  announcementId: row.announcement_id,
  userId: row.user_id,
  body: row.body,
  createdAt: row.created_at,
  canDelete,
  profile: mapProfile(row.profiles),
});
