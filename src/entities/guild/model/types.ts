export interface Guild {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  avatarUrl?: string;
}

export interface GuildDetail {
  id: string;
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
