import { createClient } from '@/shared/api/supabase/server';
import { canPerform, type GuildPermissions } from '@/shared/api/guildPermissions';
import type { GuildAnnouncementsResult } from '../model/types';
import { ANNOUNCEMENT_SELECT, buildAnnouncement, type AnnouncementRow } from './mapAnnouncementRow';

const MANAGER_ROLES = ['ADMIN', 'OWNER'];

export const resolveCaller = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  guildId: string,
): Promise<{ userId: string | null; role: string | null }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null };
  const { data: membership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();
  return { userId: user.id, role: membership?.role ?? null };
};

export const isManager = (role: string | null): boolean => MANAGER_ROLES.includes(role ?? '');

const canManage = (createdBy: string | null, userId: string | null, role: string | null): boolean =>
  (!!userId && createdBy === userId) || isManager(role);

export const getGuildAnnouncements = async (guildId: string): Promise<GuildAnnouncementsResult> => {
  const supabase = await createClient();
  const { userId, role } = await resolveCaller(supabase, guildId);

  const { data: guildRow } = await supabase
    .from('guilds')
    .select('permissions')
    .eq('id', guildId)
    .maybeSingle();
  const permissions = (guildRow?.permissions ?? null) as GuildPermissions | null;

  const { data, error } = await supabase
    .from('announcements')
    .select(ANNOUNCEMENT_SELECT)
    .eq('guild_id', guildId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;

  const announcements = ((data ?? []) as unknown as AnnouncementRow[]).map((row) =>
    buildAnnouncement(row, userId, canManage(row.created_by, userId, role)),
  );
  return { announcements, canCreate: canPerform(permissions, 'announcements', role) };
};

/** Re-reads a single announcement (used after mutations) and maps it for the caller. */
export const getAnnouncementById = async (announcementId: string): Promise<import('../model/types').Announcement> => {
  const supabase = await createClient();
  const { data: head, error: headError } = await supabase
    .from('announcements')
    .select('guild_id')
    .eq('id', announcementId)
    .single();
  if (headError) throw headError;

  const { userId, role } = await resolveCaller(supabase, head.guild_id);
  const { data, error } = await supabase
    .from('announcements')
    .select(ANNOUNCEMENT_SELECT)
    .eq('id', announcementId)
    .single();
  if (error) throw error;

  const row = data as unknown as AnnouncementRow;
  return buildAnnouncement(row, userId, canManage(row.created_by, userId, role));
};
