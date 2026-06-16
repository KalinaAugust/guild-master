import type { ActivityType } from '@/shared/types';
import type { CallToAction, CtaAuthor } from '../model/types';

const PROFILE_FIELDS = 'public_id, full_name, avatar_url, alias, display_as_alias, icon';

export const CTA_SELECT =
  `id, guild_id, created_by, title, description, type, event_date, target_count, ` +
  `event_id, launched_at, created_at, ` +
  `profiles(${PROFILE_FIELDS}), ` +
  `call_to_action_interests(user_id)`;

interface ProfileRow {
  public_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  alias: string | null;
  display_as_alias: boolean | null;
  icon: string | null;
}

export interface CallToActionRow {
  id: string;
  guild_id: string;
  created_by: string | null;
  title: string;
  description: string;
  type: string;
  event_date: string;
  target_count: number;
  event_id: string | null;
  launched_at: string | null;
  created_at: string;
  profiles: ProfileRow | null;
  call_to_action_interests: { user_id: string }[] | null;
}

const mapAuthor = (p: ProfileRow | null): CtaAuthor => ({
  publicId: p?.public_id ?? null,
  fullName: p?.full_name ?? null,
  avatarUrl: p?.avatar_url ?? null,
  alias: p?.alias ?? null,
  displayAsAlias: p?.display_as_alias ?? false,
  icon: p?.icon ?? null,
});

export const buildCallToAction = (
  row: CallToActionRow,
  currentUserId: string | null,
  canManage: boolean,
): CallToAction => {
  const interests = row.call_to_action_interests ?? [];
  return {
    id: row.id,
    guildId: row.guild_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    type: row.type as ActivityType,
    eventDate: row.event_date,
    targetCount: row.target_count,
    interestedCount: interests.length,
    interested: !!currentUserId && interests.some((i) => i.user_id === currentUserId),
    eventId: row.event_id,
    launchedAt: row.launched_at,
    createdAt: row.created_at,
    author: mapAuthor(row.profiles),
    canManage,
  };
};
