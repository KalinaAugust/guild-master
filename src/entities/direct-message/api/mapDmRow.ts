import type { DirectMessage } from '../model/types';

// Aliased FK so the joined profile is the SENDER (sender_id -> profiles).
export const DM_SELECT =
  'id, sender_id, recipient_id, body, attachment_url, created_at, updated_at, sender:profiles!direct_messages_sender_id_fkey(public_id, full_name, avatar_url, alias, display_as_alias, icon)';

interface DmRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  sender: { public_id: string | null; full_name: string | null; avatar_url: string | null; alias: string | null; display_as_alias: boolean | null; icon: string | null } | null;
}

export const mapDmRow = (row: DmRow): DirectMessage => ({
  id: row.id,
  senderId: row.sender_id,
  recipientId: row.recipient_id,
  body: row.body,
  attachmentUrl: row.attachment_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  senderProfile: {
    publicId: row.sender?.public_id ?? null,
    fullName: row.sender?.full_name ?? null,
    avatarUrl: row.sender?.avatar_url ?? null,
    alias: row.sender?.alias ?? null,
    displayAsAlias: row.sender?.display_as_alias ?? false,
    icon: row.sender?.icon ?? null,
  },
});
