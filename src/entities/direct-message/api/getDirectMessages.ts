import { createClient } from '@/shared/api/supabase/server';
import type { DirectMessage } from '../model/types';
import { DM_SELECT, mapDmRow } from './mapDmRow';

export interface DirectMessagesPage {
  messages: DirectMessage[];
  hasMore: boolean;
}

interface FetchOpts {
  /** Page size for the newest/older windows. */
  limit?: number;
  /** Keyset cursor (created_at): fetch the page strictly older than this. */
  before?: string;
  /** Keyset cursor (created_at): fetch everything strictly newer than this. */
  after?: string;
}

/**
 * Cursor-paginated DM thread reads between the current user and `peerId` (uuid).
 * Three modes:
 * - default / `before`: newest `limit` messages (or the page older than `before`),
 *   fetched descending then reversed to ascending; `hasMore` via a `limit + 1` probe.
 * - `after`: the incremental delta of messages newer than the cursor (ascending,
 *   unbounded — there are few between Realtime ticks); `hasMore` is always false.
 */
export const getDirectMessages = async (
  peerId: string,
  { limit = 50, before, after }: FetchOpts = {},
): Promise<DirectMessagesPage> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const pair = `and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`;

  if (after) {
    const { data, error } = await supabase
      .from('direct_messages')
      .select(DM_SELECT)
      .or(pair)
      .gt('created_at', after)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { messages: (data ?? []).map(mapDmRow), hasMore: false };
  }

  let q = supabase.from('direct_messages').select(DM_SELECT).or(pair);
  if (before) q = q.lt('created_at', before);

  const { data, error } = await q
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (error) throw error;

  const rows = (data ?? []).map(mapDmRow);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return { messages: page.reverse(), hasMore };
};
