import { createClient } from '@/shared/api/supabase/server';
import type { Poll, VoteInput } from '../model/types';
import { getPollById } from './getGuildPolls';
import { MAX_OPTION } from './createPoll';

/** Thrown when a vote is not allowed (poll closed, bad option, custom not allowed, …). */
export class InvalidVoteError extends Error {}

export const votePoll = async (pollId: string, input: VoteInput): Promise<Poll> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('id, allow_multiple, allow_custom, closed_at')
    .eq('id', pollId)
    .single();
  if (pollError) throw pollError;
  if (poll.closed_at) throw new InvalidVoteError('Poll is closed');

  let optionId = input.optionId;
  let createdCustom = false;

  const customBody = input.customBody?.trim();
  if (customBody) {
    if (!poll.allow_custom) throw new InvalidVoteError('Custom answers are not allowed');
    if (customBody.length > MAX_OPTION) throw new InvalidVoteError('Option is too long');
    const { data: option, error: optionError } = await supabase
      .from('poll_options')
      .insert({ poll_id: pollId, body: customBody, position: 1000, is_custom: true, created_by: user.id })
      .select('id')
      .single();
    if (optionError) throw optionError;
    optionId = option.id;
    createdCustom = true;
  }

  if (!optionId) throw new InvalidVoteError('No option specified');

  if (!createdCustom) {
    const { data: option } = await supabase
      .from('poll_options')
      .select('poll_id')
      .eq('id', optionId)
      .single();
    if (!option || option.poll_id !== pollId) throw new InvalidVoteError('Option does not belong to this poll');
  }

  const { data: existing } = await supabase
    .from('poll_votes')
    .select('id')
    .eq('option_id', optionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing && !createdCustom) {
    // Toggle the vote off.
    const { error } = await supabase.from('poll_votes').delete().eq('id', existing.id);
    if (error) throw error;
  } else {
    if (!poll.allow_multiple) {
      // Single-choice: replace any previous vote in this poll.
      const { error: clearError } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id);
      if (clearError) throw clearError;
    }
    const { error } = await supabase
      .from('poll_votes')
      .insert({ poll_id: pollId, option_id: optionId, user_id: user.id });
    if (error) throw error;
  }

  return getPollById(pollId);
};
