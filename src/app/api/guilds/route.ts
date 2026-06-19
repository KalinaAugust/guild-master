import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

const MAX_GUILDS_PER_USER = 10;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('guild_members')
    .select('guild_id, guilds (id, public_id, name, owner_id, description, avatar_url)')
    .eq('user_id', user.id)
    .eq('status', 'ACCEPTED');

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 });
  }

  const guilds = data.reduce<
    Array<{
      id: string;
      publicId: string;
      name: string;
      ownerId: string;
      description?: string;
      avatarUrl?: string;
      memberCount: number;
      pendingRequestCount: number;
    }>
  >(
    (acc, m) => {
      const g = m.guilds as unknown as {
        id: string;
        public_id: string;
        name: string;
        owner_id: string;
        description: string | null;
        avatar_url: string | null;
      };
      if (g) {
        acc.push({
          id: g.id,
          publicId: g.public_id,
          name: g.name,
          ownerId: g.owner_id,
          description: g.description || undefined,
          avatarUrl: g.avatar_url || undefined,
          memberCount: 0,
          pendingRequestCount: 0,
        });
      }
      return acc;
    },
    []
  );

  const guildIds = guilds.map((g) => g.id);

  if (guildIds.length > 0) {
    const ownedIds = guilds.filter((g) => g.ownerId === user.id).map((g) => g.id);

    // Count at the DB level (head requests) instead of transferring member rows.
    const memberCounts = new Map<string, number>();
    await Promise.all(
      guildIds.map(async (id) => {
        const { count, error: countError } = await supabase
          .from('guild_members')
          .select('*', { count: 'exact', head: true })
          .eq('guild_id', id)
          .eq('status', 'ACCEPTED');
        if (countError) {
          console.error(`Failed to count members for guild ${id}:`, countError);
          return;
        }
        memberCounts.set(id, count ?? 0);
      })
    );

    // Pending join requests only for owned guilds (RLS hides them otherwise).
    const pendingCounts = new Map<string, number>();
    await Promise.all(
      ownedIds.map(async (id) => {
        const { count, error: countError } = await supabase
          .from('guild_join_requests')
          .select('*', { count: 'exact', head: true })
          .eq('guild_id', id)
          .eq('status', 'pending');
        if (countError) {
          console.error(`Failed to count pending requests for guild ${id}:`, countError);
          return;
        }
        pendingCounts.set(id, count ?? 0);
      })
    );

    for (const g of guilds) {
      g.memberCount = memberCounts.get(g.id) ?? 0;
      g.pendingRequestCount = pendingCounts.get(g.id) ?? 0;
    }
  }

  return NextResponse.json(guilds);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description } = await request.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const { count, error: countError } = await supabase
    .from('guilds')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  if (countError) {
    return NextResponse.json({ error: 'Failed to verify guild limit' }, { status: 500 });
  }

  if ((count ?? 0) >= MAX_GUILDS_PER_USER) {
    return NextResponse.json(
      { error: `Guild limit reached. You can create up to ${MAX_GUILDS_PER_USER} guilds.` },
      { status: 403 }
    );
  }

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
    .insert({ guild_id: guild.id, user_id: user.id, role: 'OWNER', status: 'ACCEPTED' });

  if (memberError) {
    return NextResponse.json({ error: 'Failed to add owner as member' }, { status: 500 });
  }

  const g = guild as unknown as { id: string; public_id: string; name: string; owner_id: string; description: string | null; avatar_url: string | null };

  return NextResponse.json(
    {
      id: g.id,
      publicId: g.public_id,
      name: g.name,
      ownerId: g.owner_id,
      description: g.description || undefined,
      avatarUrl: g.avatar_url || undefined,
    },
    { status: 201 }
  );
}
