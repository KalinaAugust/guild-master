import { redirect } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('public_id')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/home');

  redirect(`/profile/${profile.public_id}`);
}
