export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  profile: {
    publicId: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    alias: string | null;
    displayAsAlias: boolean;
  };
}
