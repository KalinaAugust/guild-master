export interface Guild {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
}

export interface GuildDetail {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string | null;
  description?: string;
  memberCount: number;
}

export interface GuildMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}
