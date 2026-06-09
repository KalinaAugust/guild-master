export interface UserProfile {
  id: string;
  publicId: string;
  fullName: string | null;
  avatarUrl: string | null;
  lastActiveGuildId?: string | null;
}

export interface User {
  id: string;
  email?: string;
  profile: UserProfile | null;
}

export interface PublicProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
  guildsCount: number | null;
  eventsCount: number | null;
}
