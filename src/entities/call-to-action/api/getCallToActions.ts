import { createClient } from '@/shared/api/supabase/server';
import type { CallToAction, CallToActionsResult } from '../model/types';
import { CTA_SELECT, buildCallToAction, type CallToActionRow } from './mapCallToActionRow';

const MANAGER_ROLES = ['ADMIN', 'OWNER'];

export const resolveCaller = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  guildId: string,
): Promise<{ userId: string | null; role: string | null; isMember: boolean }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null, isMember: false };
  const { data: membership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();
  return { userId: user.id, role: membership?.role ?? null, isMember: !!membership };
};

const canManage = (createdBy: string | null, userId: string | null, role: string | null): boolean =>
  (!!userId && createdBy === userId) || MANAGER_ROLES.includes(role ?? '');

export const getCallToActions = async (guildId: string): Promise<CallToActionsResult> => {
  const supabase = await createClient();
  const { userId, role, isMember } = await resolveCaller(supabase, guildId);

  const { data, error } = await supabase
    .from('call_to_actions')
    .select(CTA_SELECT)
    .eq('guild_id', guildId)
    .order('launched_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false });
  if (error) throw error;

  const callToActions = ((data ?? []) as unknown as CallToActionRow[]).map((row) =>
    buildCallToAction(row, userId, canManage(row.created_by, userId, role)),
  );
  return { callToActions, canCreate: isMember };
};

/** Re-reads a single CTA (used after mutations) and maps it for the caller. */
export const getCallToActionById = async (id: string): Promise<CallToAction> => {
  const supabase = await createClient();
  const { data: head, error: headError } = await supabase
    .from('call_to_actions')
    .select('guild_id')
    .eq('id', id)
    .single();
  if (headError) throw headError;

  const { userId, role } = await resolveCaller(supabase, head.guild_id);
  const { data, error } = await supabase
    .from('call_to_actions')
    .select(CTA_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;

  const row = data as unknown as CallToActionRow;
  return buildCallToAction(row, userId, canManage(row.created_by, userId, role));
};
