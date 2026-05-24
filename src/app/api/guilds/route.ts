import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('guild_members')
    .select('guild_id, guilds (id, name, owner_id, description)')
    .eq('user_id', user.id);

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 });
  }

  const guilds = data.reduce<Array<{ id: string; name: string; ownerId: string; description?: string }>>(
    (acc, m) => {
      const g = m.guilds as unknown as {
        id: string;
        name: string;
        owner_id: string;
        description: string | null;
      };
      if (g) {
        acc.push({
          id: g.id,
          name: g.name,
          ownerId: g.owner_id,
          description: g.description || undefined,
        });
      }
      return acc;
    },
    []
  );

  return NextResponse.json(guilds);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description } = await request.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  await supabase.from('profiles').upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
  });

  const { data: guild, error: guildError } = await supabase
    .from('guilds')
    .insert({ name, description: description || null, owner_id: user.id })
    .select()
    .single();

  if (guildError || !guild) {
    return NextResponse.json({ error: 'Failed to create guild' }, { status: 500 });
  }

  const { error: memberError } = await supabase
    .from('guild_members')
    .insert({ guild_id: guild.id, user_id: user.id, role: 'OWNER' });

  if (memberError) {
    return NextResponse.json({ error: 'Failed to add owner as member' }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: guild.id,
      name: guild.name,
      ownerId: guild.owner_id,
      description: guild.description || undefined,
    },
    { status: 201 }
  );
}
