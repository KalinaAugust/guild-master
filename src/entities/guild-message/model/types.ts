export interface GuildMessage {
  id: string;
  guildId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  };
}
