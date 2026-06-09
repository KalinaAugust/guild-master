import { createClient } from '@/shared/api/supabase/server';
import type { Poll } from '../model/types';
import { getPollById } from './getGuildPolls';
import { InvalidVoteError } from './votePoll';
import { MAX_OPTION } from './createPoll';

/**
 * Adds a custom option to a poll without casting a vote for it. Used by deferred
 * (revote) polls, where the new option should join the user's pending selection
 * and only be submitted once they press "Vote". Returns the refreshed poll and
 * the id of the option that was created.
 */
export const addPollOption = async (
  pollId: string,
  body: string,
): Promise<{ poll: Poll; optionId: string }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('id, allow_custom, closed_at')
    .eq('id', pollId)
    .single();
  if (pollError) throw pollError;
  if (poll.closed_at) throw new InvalidVoteError('Poll is closed');
  if (!poll.allow_custom) throw new InvalidVoteError('Custom answers are not allowed');

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidVoteError('Option is empty');
  if (trimmed.length > MAX_OPTION) throw new InvalidVoteError('Option is too long');

  const { data: option, error: optionError } = await supabase
    .from('poll_options')
    .insert({ poll_id: pollId, body: trimmed, position: 1000, is_custom: true, created_by: user.id })
    .select('id')
    .single();
  if (optionError) throw optionError;

  return { poll: await getPollById(pollId), optionId: option.id };
};
