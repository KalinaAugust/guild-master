import { createClient } from '@/shared/api/supabase/server';
import type { CreatePollInput, Poll } from '../model/types';
import { getPollById } from './getGuildPolls';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
/** A guild keeps at most this many polls; creating more prunes the oldest. */
const MAX_POLLS_PER_GUILD = 20;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 1000;
export const MAX_OPTION = 200;

/** Thrown when poll input is invalid (empty title, too few/long options, …). */
export class InvalidPollError extends Error {}

export const createPoll = async (guildId: string, input: CreatePollInput): Promise<Poll> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const title = input.title.trim();
  if (!title) throw new InvalidPollError('Title is empty');
  if (title.length > MAX_TITLE) throw new InvalidPollError('Title is too long');

  const description = input.description.trim();
  if (description.length > MAX_DESCRIPTION) throw new InvalidPollError('Description is too long');

  const options = input.options.map((o) => o.trim()).filter(Boolean);
  if (options.length < MIN_OPTIONS) throw new InvalidPollError('At least two options are required');
  if (options.length > MAX_OPTIONS) throw new InvalidPollError('Too many options');
  if (options.some((o) => o.length > MAX_OPTION)) throw new InvalidPollError('An option is too long');

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      guild_id: guildId,
      created_by: user.id,
      title,
      description: description || null,
      is_anonymous: input.isAnonymous,
      allow_multiple: input.allowMultiple,
      allow_custom: input.allowCustom,
      allow_revote: input.allowRevote,
    })
    .select('id')
    .single();
  if (pollError) throw pollError;
  if (!poll) throw new Error('Failed to create poll');

  const { error: optionsError } = await supabase.from('poll_options').insert(
    options.map((body, position) => ({
      poll_id: poll.id,
      body,
      position,
      is_custom: false,
      created_by: user.id,
    })),
  );
  if (optionsError) throw optionsError;

  // Keep only the newest MAX_POLLS_PER_GUILD polls; older ones are pruned (with
  // their options and votes) by a SECURITY DEFINER helper so the cap is enforced
  // regardless of who authored the polls being removed.
  const { error: pruneError } = await supabase.rpc('prune_guild_polls', {
    p_guild_id: guildId,
    p_keep: MAX_POLLS_PER_GUILD,
  });
  if (pruneError) throw pruneError;

  return getPollById(poll.id);
};
