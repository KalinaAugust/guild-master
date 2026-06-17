import { NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

interface UserNoteRow {
  target_user_id: string;
  note: string;
  profiles: {
    public_id: string | null;
  } | null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: notes, error } = await supabase
    .from('user_notes')
    .select(`
      target_user_id,
      note,
      profiles!user_notes_target_user_id_fkey(public_id)
    `);

  if (error) {
    console.error('Error fetching user notes:', error);
    return NextResponse.json({ error: 'Failed to fetch user notes' }, { status: 500 });
  }

  const formattedNotes = ((notes as unknown as UserNoteRow[]) || []).map((row) => ({
    target_user_id: row.target_user_id,
    note: row.note,
    target_public_id: row.profiles?.public_id || null,
  }));

  return NextResponse.json(formattedNotes);
}
