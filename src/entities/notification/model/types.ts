import { Calendar, Mail } from 'lucide-react';
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
  getLabel: (t: NotificationTranslationFn, n: Notification) => string;
}> = {
  new_event: {
    Icon: Calendar,
    getLabel: (t, n) => t('newEvent', { guildName: n.guild_name ?? '' }),
  },
  invitation: {
    Icon: Mail,
    getLabel: (t) => t('invitation'),
  },
};
