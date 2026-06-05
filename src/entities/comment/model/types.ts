export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  };
}
