import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

interface RouteParams {
  params: Promise<{ targetUserId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { targetUserId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { note: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const note = body.note?.trim();
  if (!note || note.length > 2000) {
    return NextResponse.json({ error: 'Note must be between 1 and 2000 characters' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_notes')
    .upsert({
      user_id: user.id,
      target_user_id: targetUserId,
      note,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating user note:', error);
    return NextResponse.json({ error: 'Failed to update user note' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { targetUserId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('user_notes')
    .delete()
    .eq('user_id', user.id)
    .eq('target_user_id', targetUserId);

  if (error) {
    console.error('Error deleting user note:', error);
    return NextResponse.json({ error: 'Failed to delete user note' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
