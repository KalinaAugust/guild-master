import { Calendar, UserRoundPlus, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Notification {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  event_title: string | null;
  event_date: string | null;
  guild_name: string | null;
}

export type NotificationTranslationFn = (key: string, values?: Record<string, string>) => string;

export const NOTIFICATION_TYPE_CONFIG: Record<string, {
  Icon: LucideIcon;
  getLabel?: (t: NotificationTranslationFn, n: Notification) => string;
  // Guild-membership notifications render the guild name as an inline link.
  // The label is rendered via `t.rich` in the component, so only the message
  // key is stored here (the `<guild>` tag wraps `{guildName}`).
  messageKey?: string;
  linksToGuild?: boolean;
}> = {
  new_event: {
    Icon: Calendar,
    getLabel: (t, n) => t('newEvent', { guildName: n.guild_name ?? '' }),
  },
  invitation: {
    Icon: UserRoundPlus,
    getLabel: (t) => t('invitation'),
  },
  join_request: {
    Icon: UserPlus,
    messageKey: 'joinRequest',
    linksToGuild: true,
  },
  join_request_approved: {
    Icon: CheckCircle,
    messageKey: 'joinRequestApproved',
    linksToGuild: true,
  },
  join_request_declined: {
    Icon: XCircle,
    messageKey: 'joinRequestDeclined',
    linksToGuild: true,
  },
  event_join_request: {
    Icon: UserPlus,
    getLabel: (t, n) => t('eventJoinRequest', { eventTitle: n.event_title ?? '' }),
  },
  event_join_request_approved: {
    Icon: CheckCircle,
    getLabel: (t, n) => t('eventJoinRequestApproved', { eventTitle: n.event_title ?? '' }),
  },
  event_join_request_declined: {
    Icon: XCircle,
    getLabel: (t, n) => t('eventJoinRequestDeclined', { eventTitle: n.event_title ?? '' }),
  },
};
