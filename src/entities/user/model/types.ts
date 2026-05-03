export interface UserProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface User {
  id: string;
  email?: string;
  profile: UserProfile | null;
}
