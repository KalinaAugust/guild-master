import { createClient } from '@/shared/api/supabase/server';

export class PeerNotFoundError extends Error {}

/** Resolves a peer profile `public_id` to its uuid. */
export const resolvePeerId = async (publicId: string): Promise<string> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('public_id', publicId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PeerNotFoundError('Peer not found');
  return data.id;
};
