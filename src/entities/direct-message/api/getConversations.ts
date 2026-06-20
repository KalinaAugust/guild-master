import { createClient } from '@/shared/api/supabase/server';
import type { DmConversation } from '../model/types';

/** Builds the conversation list for the current user: newest message per peer,
 *  peer profile + presence, and an unread flag from direct_message_reads. */
export const getConversations = async (): Promise<DmConversation[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // All messages in either direction, newest first (bounded window).
  const { data: rows, error } = await supabase
    .from('direct_messages')
    .select('id, sender_id, recipient_id, body, attachment_url, created_at')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;

  // Reduce to the newest message per peer.
  const byPeer = new Map<string, { last: typeof rows[number] }>();
  for (const r of rows ?? []) {
    const peer = r.sender_id === user.id ? r.recipient_id : r.sender_id;
    if (!byPeer.has(peer)) byPeer.set(peer, { last: r });
  }
  const peerIds = [...byPeer.keys()];
  if (peerIds.length === 0) return [];

  const [{ data: profiles }, { data: reads }] = await Promise.all([
    supabase.from('profiles')
      .select('id, public_id, full_name, avatar_url, alias, display_as_alias, icon, last_seen_at')
      .in('id', peerIds),
    supabase.from('direct_message_reads')
      .select('peer_id, last_read_at').eq('user_id', user.id).in('peer_id', peerIds),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const readByPeer = new Map((reads ?? []).map((r) => [r.peer_id, r.last_read_at]));

  return peerIds.map((peerId) => {
    const { last } = byPeer.get(peerId)!;
    const p = profileById.get(peerId);
    const lastRead = readByPeer.get(peerId);
    const senderIsMe = last.sender_id === user.id;
    const hasUnread = !senderIsMe && (!lastRead || last.created_at > lastRead);
    return {
      peer: {
        id: peerId,
        publicId: p?.public_id ?? null,
        fullName: p?.full_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
        alias: p?.alias ?? null,
        displayAsAlias: p?.display_as_alias ?? false,
        icon: p?.icon ?? null,
        lastSeenAt: p?.last_seen_at ?? null,
      },
      lastMessage: { body: last.body, attachmentUrl: last.attachment_url, createdAt: last.created_at, senderIsMe },
      hasUnread,
    };
  });
};
