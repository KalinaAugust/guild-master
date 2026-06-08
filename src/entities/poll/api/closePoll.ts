import { createClient } from '@/shared/api/supabase/server';
import type { Poll } from '../model/types';
import { getPollById } from './getGuildPolls';

export const closePoll = async (pollId: string): Promise<Poll> => {
  const supabase = await createClient();
  const { error } = await supabase
    .from('polls')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', pollId);
  if (error) throw error;
  return getPollById(pollId);
};
