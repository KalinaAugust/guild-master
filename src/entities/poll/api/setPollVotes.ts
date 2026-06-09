import { createClient } from '@/shared/api/supabase/server';
import type { Poll } from '../model/types';
import { getPollById } from './getGuildPolls';
import { InvalidVoteError } from './votePoll';

/**
 * Replaces the current user's votes for a poll with exactly `optionIds` in a single
 * round-trip. Used by deferred (revote) polls: "Vote" submits the whole selection
 * at once, "Revote" clears it with an empty array.
 */
export const setPollVotes = async (pollId: string, optionIds: string[]): Promise<Poll> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('id, allow_multiple, closed_at')
    .eq('id', pollId)
    .single();
  if (pollError) throw pollError;
  if (poll.closed_at) throw new InvalidVoteError('Poll is closed');

  const ids = [...new Set(optionIds)];
  if (!poll.allow_multiple && ids.length > 1) throw new InvalidVoteError('Only one option allowed');

  if (ids.length > 0) {
    const { data: opts, error: optsError } = await supabase
      .from('poll_options')
      .select('id')
      .eq('poll_id', pollId)
      .in('id', ids);
    if (optsError) throw optsError;
    if (!opts || opts.length !== ids.length) {
      throw new InvalidVoteError('Option does not belong to this poll');
    }
  }

  // Replace the user's votes: clear existing, then insert the new set.
  const { error: deleteError } = await supabase
    .from('poll_votes')
    .delete()
    .eq('poll_id', pollId)
    .eq('user_id', user.id);
  if (deleteError) throw deleteError;

  if (ids.length > 0) {
    const { error: insertError } = await supabase
      .from('poll_votes')
      .insert(ids.map((option_id) => ({ poll_id: pollId, option_id, user_id: user.id })));
    if (insertError) throw insertError;
  }

  return getPollById(pollId);
};
