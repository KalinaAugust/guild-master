export interface Guild {
  id: string;
  publicId?: string;
  name: string;
  ownerId: string;
  description?: string;
  avatarUrl?: string;
  /** Total members in the guild (populated by the guild list endpoint). */
  memberCount?: number;
  /** Pending join requests awaiting the owner's action (0 unless the viewer owns the guild). */
  pendingRequestCount?: number;
}

export interface GuildDetail {
  id: string;
  publicId: string;
  name: string;
  ownerId: string;
  ownerName: string | null;
  description?: string;
  avatarUrl?: string;
  memberCount: number;
}

export interface GuildMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  profile: {
    publicId: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    alias: string | null;
    displayAsAlias: boolean;
    icon: string | null;
  };
}

export interface JoinRequest {
  id: string;
  userId: string;
  publicId: string | null;
  userName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}
