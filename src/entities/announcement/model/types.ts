export type ReactionType = 'like' | 'dislike' | 'heart' | 'celebrate' | 'insightful';

export const REACTION_TYPES: ReactionType[] = ['like', 'dislike', 'heart', 'celebrate', 'insightful'];

export interface ReactionSummary {
  type: ReactionType;
  count: number;
  /** Whether the current user has reacted with this type. */
  reacted: boolean;
}

export interface AnnouncementProfile {
  publicId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  alias: string | null;
  displayAsAlias: boolean;
  icon: string | null;
}

export interface AnnouncementComment {
  id: string;
  announcementId: string;
  userId: string;
  body: string;
  createdAt: string;
  /** Current user may delete this comment (author or guild admin/owner). */
  canDelete: boolean;
  profile: AnnouncementProfile;
}

export interface Announcement {
  id: string;
  guildId: string;
  createdBy: string | null;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: AnnouncementProfile;
  reactions: ReactionSummary[];
  commentCount: number;
  /** Current user may edit/pin/delete (author or guild admin/owner). */
  canManage: boolean;
}

/** List query result: the feed plus whether the viewer may create posts. */
export interface GuildAnnouncementsResult {
  announcements: Announcement[];
  canCreate: boolean;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  isPinned: boolean;
}

export interface UpdateAnnouncementInput {
  title: string;
  content: string;
}
