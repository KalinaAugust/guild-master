export interface Guild {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
}

export interface GuildMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  };
}
