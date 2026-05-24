import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: guild } = await supabase
    .from('guilds')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (!guild || guild.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('guilds').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to delete guild' }, { status: 500 });

  return NextResponse.json({ success: true });
}
