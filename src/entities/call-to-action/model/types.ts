import type { ActivityType } from '@/shared/types';

export interface CtaAuthor {
  publicId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  alias: string | null;
  displayAsAlias: boolean;
  icon: string | null;
}

/** A user who has confirmed participation ("I'm in") in a call to action. */
export interface CtaParticipant extends CtaAuthor {
  userId: string;
}

export interface CallToAction {
  id: string;
  guildId: string;
  createdBy: string | null;
  title: string;
  description: string;
  type: ActivityType;
  eventDate: string; // ISO timestamptz
  endTime?: string; // HH:mm, undefined when no end set
  endsNextDay?: boolean;
  targetCount: number;
  interestedCount: number;
  /** Confirmed participants, ordered by join time. */
  participants: CtaParticipant[];
  /** Whether the current user has pressed "Want". */
  interested: boolean;
  eventId: string | null; // set once launched
  launchedAt: string | null;
  createdAt: string;
  author: CtaAuthor;
  /** Current user may delete (author or guild admin/owner). */
  canManage: boolean;
}

/** List query result: the feed plus whether the viewer may create CTAs. */
export interface CallToActionsResult {
  callToActions: CallToAction[];
  canCreate: boolean;
}

export interface CreateCallToActionInput {
  title: string;
  description: string;
  type: ActivityType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string; // HH:mm, '' or undefined = no end
  targetCount: number;
}
