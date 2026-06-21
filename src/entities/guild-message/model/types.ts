export type ChatScope = 'all' | 'officers';

export interface GuildMessage {
  id: string;
  guildId: string;
  userId: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    publicId: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    alias: string | null;
    displayAsAlias: boolean;
    icon: string | null;
  };
}
