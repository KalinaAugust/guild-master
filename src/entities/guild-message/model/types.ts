export interface GuildMessage {
  id: string;
  guildId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  profile: {
    publicId: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
}
