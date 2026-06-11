import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';
import type { Json, TablesUpdate } from '@/shared/api/supabase/types';
import { sanitizeSettings, type ProfileSettingsInput } from '@/features/update-profile-settings/model/types';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: ProfileSettingsInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const clean = sanitizeSettings(body);
  const update: TablesUpdate<'profiles'> = {};
  if ('alias' in clean) update.alias = clean.alias;
  if ('displayAsAlias' in clean) update.display_as_alias = clean.displayAsAlias;
  if ('icon' in clean) update.icon = clean.icon;
  if ('about' in clean) update.about = clean.about;
  if ('interests' in clean) update.interests = clean.interests;
  if ('socials' in clean) update.socials = clean.socials as unknown as Json;
  if ('privacy' in clean) update.privacy = clean.privacy as unknown as Json;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  // RLS restricts updates to the caller's own row.
  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
