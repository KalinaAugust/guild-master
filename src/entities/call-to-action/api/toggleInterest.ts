import { createClient } from '@/shared/api/supabase/server';
import type { CallToAction } from '../model/types';
import { getCallToActionById } from './getCallToActions';

export const toggleInterest = async (ctaId: string): Promise<CallToAction> => {
  const supabase = await createClient();
  const { error } = await supabase.rpc('toggle_call_to_action_interest', { p_cta_id: ctaId });
  if (error) throw error;
  return getCallToActionById(ctaId);
};
