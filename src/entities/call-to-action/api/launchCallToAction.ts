import { createClient } from '@/shared/api/supabase/server';
import type { CallToAction } from '../model/types';
import { getCallToActionById } from './getCallToActions';

export const launchCallToAction = async (ctaId: string): Promise<CallToAction> => {
  const supabase = await createClient();
  const { error } = await supabase.rpc('launch_call_to_action', { p_cta_id: ctaId });
  if (error) throw error;
  return getCallToActionById(ctaId);
};
