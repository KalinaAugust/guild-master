import type { EventComment } from '../model/types';

export const COMMENT_SELECT =
  'id, event_id, user_id, body, created_at, updated_at, profiles(public_id, full_name, avatar_url, alias, display_as_alias)';

interface CommentRow {
  id: string;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  profiles: { public_id: string | null; full_name: string | null; avatar_url: string | null; alias: string | null; display_as_alias: boolean | null } | null;
}

export const mapCommentRow = (row: CommentRow): EventComment => ({
  id: row.id,
  eventId: row.event_id,
  userId: row.user_id,
  body: row.body,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  profile: {
    publicId: row.profiles?.public_id ?? null,
    fullName: row.profiles?.full_name ?? null,
    avatarUrl: row.profiles?.avatar_url ?? null,
    alias: row.profiles?.alias ?? null,
    displayAsAlias: row.profiles?.display_as_alias ?? false,
  },
});
