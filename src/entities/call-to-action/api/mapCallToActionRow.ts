import { deriveEnd } from '@/shared/lib/eventInterval';
import type { ActivityType } from '@/shared/types';
import type { CallToAction, CtaAuthor, CtaParticipant } from '../model/types';

const PROFILE_FIELDS = 'public_id, full_name, avatar_url, alias, display_as_alias, icon';

export const CTA_SELECT =
  `id, guild_id, created_by, title, description, type, event_date, end_date, target_count, ` +
  `event_id, launched_at, created_at, ` +
  `profiles(${PROFILE_FIELDS}), ` +
  `call_to_action_interests(user_id, created_at, profiles(${PROFILE_FIELDS}))`;

interface ProfileRow {
  public_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  alias: string | null;
  display_as_alias: boolean | null;
  icon: string | null;
}

interface InterestRow {
  user_id: string;
  created_at: string;
  profiles: ProfileRow | null;
}

export interface CallToActionRow {
  id: string;
  guild_id: string;
  created_by: string | null;
  title: string;
  description: string;
  type: string;
  event_date: string;
  end_date: string | null;
  target_count: number;
  event_id: string | null;
  launched_at: string | null;
  created_at: string;
  profiles: ProfileRow | null;
  call_to_action_interests: InterestRow[] | null;
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
  const interests = [...(row.call_to_action_interests ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const participants: CtaParticipant[] = interests.map((i) => ({
    userId: i.user_id,
    ...mapAuthor(i.profiles),
  }));
  return {
    id: row.id,
    guildId: row.guild_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    type: row.type as ActivityType,
    eventDate: row.event_date,
    ...deriveEnd(row.event_date, row.end_date),
    targetCount: row.target_count,
    interestedCount: participants.length,
    participants,
    interested: !!currentUserId && participants.some((p) => p.userId === currentUserId),
    eventId: row.event_id,
    launchedAt: row.launched_at,
    createdAt: row.created_at,
    author: mapAuthor(row.profiles),
    canManage,
  };
};
