export interface DmProfile {
  publicId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  alias: string | null;
  displayAsAlias: boolean;
  icon: string | null;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  senderProfile: DmProfile;
}

export interface DmConversation {
  peer: DmProfile & { id: string; lastSeenAt: string | null };
  lastMessage: { body: string; attachmentUrl: string | null; createdAt: string; senderIsMe: boolean };
  hasUnread: boolean;
}
