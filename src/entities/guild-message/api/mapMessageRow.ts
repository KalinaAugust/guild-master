import type { GuildMessage } from '../model/types';

export const MESSAGE_SELECT =
  'id, guild_id, user_id, body, attachment_url, created_at, updated_at, profiles(public_id, full_name, avatar_url, alias, display_as_alias, icon)';

interface MessageRow {
  id: string;
  guild_id: string;
  user_id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  profiles: { public_id: string | null; full_name: string | null; avatar_url: string | null; alias: string | null; display_as_alias: boolean | null; icon: string | null } | null;
}

export const mapMessageRow = (row: MessageRow): GuildMessage => ({
  id: row.id,
  guildId: row.guild_id,
  userId: row.user_id,
  body: row.body,
  attachmentUrl: row.attachment_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  profile: {
    publicId: row.profiles?.public_id ?? null,
    fullName: row.profiles?.full_name ?? null,
    avatarUrl: row.profiles?.avatar_url ?? null,
    alias: row.profiles?.alias ?? null,
    displayAsAlias: row.profiles?.display_as_alias ?? false,
    icon: row.profiles?.icon ?? null,
  },
});
