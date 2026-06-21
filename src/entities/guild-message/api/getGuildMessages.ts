import { createClient } from '@/shared/api/supabase/server';
import type { GuildMessage } from '../model/types';
import { MESSAGE_SELECT, mapMessageRow } from './mapMessageRow';

export interface GuildMessagesPage {
  messages: GuildMessage[];
  hasMore: boolean;
}

interface FetchOpts {
  /** Page size for the newest/older windows. */
  limit?: number;
  /** Keyset cursor (created_at): fetch the page strictly older than this. */
  before?: string;
  /** Keyset cursor (created_at): fetch everything strictly newer than this. */
  after?: string;
  scope?: import('../model/types').ChatScope;
}

/**
 * Cursor-paginated guild chat reads. Three modes:
 * - default / `before`: newest `limit` messages (or the page older than `before`),
 *   fetched descending then reversed to ascending; `hasMore` via a `limit + 1` probe.
 * - `after`: the incremental delta of messages newer than the cursor (ascending,
 *   unbounded — there are few between Realtime ticks); `hasMore` is always false.
 */
export const getGuildMessages = async (
  guildId: string,
  { limit = 50, before, after, scope = 'all' }: FetchOpts = {},
): Promise<GuildMessagesPage> => {
  const supabase = await createClient();

  if (after) {
    const { data, error } = await supabase
      .from('guild_messages')
      .select(MESSAGE_SELECT)
      .eq('guild_id', guildId)
      .eq('scope', scope)
      .gt('created_at', after)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { messages: (data ?? []).map(mapMessageRow), hasMore: false };
  }

  let q = supabase
    .from('guild_messages')
    .select(MESSAGE_SELECT)
    .eq('guild_id', guildId)
    .eq('scope', scope);
  if (before) q = q.lt('created_at', before);

  const { data, error } = await q
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (error) throw error;

  const rows = (data ?? []).map(mapMessageRow);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return { messages: page.reverse(), hasMore };
};
