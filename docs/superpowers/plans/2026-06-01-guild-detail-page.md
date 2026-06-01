# Guild Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public `/guilds/[id]` page showing guild info, with a join-request flow (submit → owner approve/decline) and notifications for both parties.

**Architecture:** Public Server Component determines `membershipStatus` from Supabase, passes it as a prop to the `'use client'` `GuildDetailContent` feature component. RTK Query handles all client-side data. Join request logic lives in two new route handlers; notifications are inserted server-side via admin client.

**Tech Stack:** Next.js 15 App Router, RTK Query (`baseApi.injectEndpoints`), Supabase (RLS + admin client for cross-user notification writes), CSS Modules, next-intl.

---

## File Map

**Create:**
- `src/app/guilds/[id]/page.tsx`
- `src/app/guilds/[id]/GuildDetailPage.module.css`
- `src/app/api/guilds/[id]/join-requests/route.ts`
- `src/app/api/guilds/[id]/join-requests/[requestId]/route.ts`
- `src/features/guild-detail/index.ts`
- `src/features/guild-detail/ui/GuildDetailContent.tsx`
- `src/features/guild-detail/ui/GuildDetailContent.module.css`
- `src/features/guild-detail/ui/JoinRequestItem.tsx`
- `src/features/guild-detail/ui/JoinRequestItem.module.css`

**Modify:**
- `src/shared/api/baseApi.ts` — add `'JoinRequest'` tag type
- `src/shared/api/supabase/types.ts` — add `guild_join_requests` table
- `src/app/api/guilds/[id]/route.ts` — add GET handler
- `src/app/api/notifications/route.ts` — enrich `entity_type='guild'` notifications
- `src/entities/guild/model/types.ts` — add `GuildDetail`, `JoinRequest` types
- `src/entities/guild/api/guildApi.ts` — add 4 new endpoints
- `src/entities/guild/index.ts` — export new hooks/types
- `src/entities/notification/model/types.ts` — add 3 notification type configs
- `src/features/notification-panel/ui/NotificationItem.tsx` — add guild link
- `src/features/manage-guilds/ui/GuildList.tsx` — wrap name/info in Link
- `src/features/manage-guilds/ui/GuildList.module.css` — add `.rowLink` style
- `src/proxy.ts` — exempt `/guilds/` from auth redirect
- `messages/en.json` — `GuildDetail` namespace + notification strings
- `messages/ru.json` — `GuildDetail` namespace + notification strings

---

## Task 1: Database — guild_join_requests table + RLS

**Files:**
- Supabase SQL editor (or `mcp__supabase__apply_migration`)
- Modify: `src/shared/api/supabase/types.ts`

- [ ] **Step 1: Run SQL migration in Supabase**

```sql
-- Create guild_join_requests table
CREATE TABLE IF NOT EXISTS guild_join_requests (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id    uuid        NOT NULL REFERENCES guilds(id)   ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One active pending request per user per guild
CREATE UNIQUE INDEX IF NOT EXISTS guild_join_requests_pending_unique
  ON guild_join_requests (guild_id, user_id)
  WHERE status = 'pending';

ALTER TABLE guild_join_requests ENABLE ROW LEVEL SECURITY;

-- Users read their own requests
CREATE POLICY "users_read_own_join_requests"
  ON guild_join_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Guild owner reads all requests for their guild
CREATE POLICY "owner_read_guild_join_requests"
  ON guild_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_join_requests.guild_id
        AND g.owner_id = auth.uid()
    )
  );

-- Users insert their own requests
CREATE POLICY "users_insert_join_requests"
  ON guild_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Guild owner updates request status
CREATE POLICY "owner_update_join_requests"
  ON guild_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_join_requests.guild_id
        AND g.owner_id = auth.uid()
    )
  );

-- Allow public (unauthenticated) reads on guilds for the public guild detail page
-- Run only if no public-read policy exists yet:
CREATE POLICY "guilds_public_read"
  ON guilds FOR SELECT
  USING (true);
```

> Note: if a `guilds_public_read` policy already exists, skip that last statement. Check with `SELECT * FROM pg_policies WHERE tablename = 'guilds';` beforehand.

- [ ] **Step 2: Update `src/shared/api/supabase/types.ts` — add `guild_join_requests` to the Tables section**

Add inside `Tables: {` (after the `guilds` block):

```typescript
      guild_join_requests: {
        Row: {
          id: string
          guild_id: string
          user_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          guild_id: string
          user_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          guild_id?: string
          user_id?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_join_requests_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 3: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat(db): add guild_join_requests table and RLS policies"
```

---

## Task 2: baseApi tag + Guild entity types + RTK endpoints

**Files:**
- Modify: `src/shared/api/baseApi.ts`
- Modify: `src/entities/guild/model/types.ts`
- Modify: `src/entities/guild/api/guildApi.ts`
- Modify: `src/entities/guild/index.ts`

- [ ] **Step 1: Add `'JoinRequest'` tag to `src/shared/api/baseApi.ts`**

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Event', 'Participant', 'GuildMember', 'Guild', 'Notification', 'JoinRequest'],
  endpoints: () => ({}),
});
```

- [ ] **Step 2: Add `GuildDetail` and `JoinRequest` types to `src/entities/guild/model/types.ts`**

```typescript
export interface Guild {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
}

export interface GuildDetail {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string | null;
  description?: string;
  memberCount: number;
}

export interface GuildMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}
```

- [ ] **Step 3: Add four new endpoints to `src/entities/guild/api/guildApi.ts`**

Add inside `endpoints: (builder) => ({`:

```typescript
    getGuildById: builder.query<GuildDetail, string>({
      query: (id) => `guilds/${id}`,
      providesTags: (_, __, id) => [{ type: 'Guild' as const, id }],
    }),
    submitJoinRequest: builder.mutation<{ id: string; status: string }, string>({
      query: (guildId) => ({ url: `guilds/${guildId}/join-requests`, method: 'POST' }),
    }),
    getJoinRequests: builder.query<JoinRequest[], string>({
      query: (guildId) => `guilds/${guildId}/join-requests`,
      providesTags: (_, __, guildId) => [
        { type: 'JoinRequest' as const, id: `LIST-${guildId}` },
      ],
    }),
    resolveJoinRequest: builder.mutation<
      { success: boolean },
      { guildId: string; requestId: string; action: 'approve' | 'decline' }
    >({
      query: ({ guildId, requestId, action }) => ({
        url: `guilds/${guildId}/join-requests/${requestId}`,
        method: 'PATCH',
        body: { action },
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'JoinRequest' as const, id: `LIST-${guildId}` },
        { type: 'GuildMember' as const, id: `LIST-${guildId}` },
      ],
    }),
```

Also add to the exports at the bottom of the file:

```typescript
export const {
  useGetGuildMembersQuery,
  useGetGuildsQuery,
  useCreateGuildMutation,
  useDeleteGuildMutation,
  useUpdateGuildMutation,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
  useGetGuildByIdQuery,
  useSubmitJoinRequestMutation,
  useGetJoinRequestsQuery,
  useResolveJoinRequestMutation,
} = guildApi;
```

- [ ] **Step 4: Update `src/entities/guild/index.ts` to export new hooks and types**

```typescript
export * from './model/types';
export * from './model/slice';
export * from './api/getGuilds';
export {
  useGetGuildMembersQuery,
  useGetGuildsQuery,
  useCreateGuildMutation,
  useDeleteGuildMutation,
  useUpdateGuildMutation,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
  useGetGuildByIdQuery,
  useSubmitJoinRequestMutation,
  useGetJoinRequestsQuery,
  useResolveJoinRequestMutation,
} from './api/guildApi';
```

- [ ] **Step 5: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/api/baseApi.ts src/entities/guild/model/types.ts src/entities/guild/api/guildApi.ts src/entities/guild/index.ts
git commit -m "feat(guild): add GuildDetail/JoinRequest types and RTK Query endpoints"
```

---

## Task 3: GET /api/guilds/[id] route handler

**Files:**
- Modify: `src/app/api/guilds/[id]/route.ts`

- [ ] **Step 1: Add `GET` handler to `src/app/api/guilds/[id]/route.ts`**

Add at the top of the file (before the existing `PATCH`), keeping all existing code intact:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: guild, error } = await supabase
    .from('guilds')
    .select('id, name, description, owner_id, profiles!guilds_owner_id_fkey(full_name)')
    .eq('id', id)
    .maybeSingle();

  if (error || !guild) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { count } = await supabase
    .from('guild_members')
    .select('id', { count: 'exact', head: true })
    .eq('guild_id', id);

  type ProfileShape = { full_name: string | null } | null;

  return NextResponse.json({
    id: guild.id,
    name: guild.name,
    description: guild.description || undefined,
    ownerId: guild.owner_id,
    ownerName: (guild.profiles as ProfileShape)?.full_name ?? null,
    memberCount: count ?? 0,
  });
}
```

The full file after the change should look like:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: guild, error } = await supabase
    .from('guilds')
    .select('id, name, description, owner_id, profiles!guilds_owner_id_fkey(full_name)')
    .eq('id', id)
    .maybeSingle();

  if (error || !guild) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { count } = await supabase
    .from('guild_members')
    .select('id', { count: 'exact', head: true })
    .eq('guild_id', id);

  type ProfileShape = { full_name: string | null } | null;

  return NextResponse.json({
    id: guild.id,
    name: guild.name,
    description: guild.description || undefined,
    ownerId: guild.owner_id,
    ownerName: (guild.profiles as ProfileShape)?.full_name ?? null,
    memberCount: count ?? 0,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id } = await params;
  const { name, description } = await request.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const forbidden = await requireGuildOwner(supabase, id, user.id);
  if (forbidden) return forbidden;

  const { data: guild, error } = await supabase
    .from('guilds')
    .update({ name, description: description || null })
    .eq('id', id)
    .select()
    .single();

  if (error || !guild) return NextResponse.json({ error: 'Failed to update guild' }, { status: 500 });

  return NextResponse.json({
    id: guild.id,
    name: guild.name,
    ownerId: guild.owner_id,
    description: guild.description || undefined,
  });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id } = await params;

  const forbidden = await requireGuildOwner(supabase, id, user.id);
  if (forbidden) return forbidden;

  const { error } = await supabase.from('guilds').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to delete guild' }, { status: 500 });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/guilds/[id]/route.ts
git commit -m "feat(api): add GET /api/guilds/[id] public endpoint"
```

---

## Task 4: Join requests API routes

**Files:**
- Create: `src/app/api/guilds/[id]/join-requests/route.ts`
- Create: `src/app/api/guilds/[id]/join-requests/[requestId]/route.ts`

- [ ] **Step 1: Create `src/app/api/guilds/[id]/join-requests/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';
import { createAdminClient } from '@/shared/api/supabase/admin';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId } = await params;

  const forbidden = await requireGuildOwner(supabase, guildId, user.id);
  if (forbidden) return forbidden;

  const { data, error } = await supabase
    .from('guild_join_requests')
    .select('id, user_id, created_at, profiles!guild_join_requests_user_id_fkey(full_name, avatar_url)')
    .eq('guild_id', guildId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });

  type ProfileShape = { full_name: string | null; avatar_url: string | null } | null;

  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: (r.profiles as ProfileShape)?.full_name ?? null,
      avatarUrl: (r.profiles as ProfileShape)?.avatar_url ?? null,
      createdAt: r.created_at,
    }))
  );
}

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId } = await params;

  const { data: existingMember } = await supabase
    .from('guild_members')
    .select('id')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 });
  }

  const { data: existingRequest } = await supabase
    .from('guild_join_requests')
    .select('id')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingRequest) {
    return NextResponse.json({ error: 'Request already pending' }, { status: 409 });
  }

  const { data: request, error } = await supabase
    .from('guild_join_requests')
    .insert({ guild_id: guildId, user_id: user.id, status: 'pending' })
    .select()
    .single();

  if (error || !request) {
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }

  const { data: guild } = await supabase
    .from('guilds')
    .select('owner_id')
    .eq('id', guildId)
    .single();

  if (guild) {
    const adminClient = createAdminClient();
    await adminClient.from('notifications').insert({
      user_id: guild.owner_id,
      type: 'join_request',
      entity_type: 'guild',
      entity_id: guildId,
    });
  }

  return NextResponse.json({ id: request.id, status: request.status }, { status: 201 });
}
```

- [ ] **Step 2: Create `src/app/api/guilds/[id]/join-requests/[requestId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';
import { createAdminClient } from '@/shared/api/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId, requestId } = await params;

  const forbidden = await requireGuildOwner(supabase, guildId, user.id);
  if (forbidden) return forbidden;

  const body = await request.json();
  const action: unknown = body?.action;
  if (action !== 'approve' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be approve or decline' }, { status: 400 });
  }

  const { data: joinRequest } = await supabase
    .from('guild_join_requests')
    .select('user_id')
    .eq('id', requestId)
    .eq('guild_id', guildId)
    .eq('status', 'pending')
    .single();

  if (!joinRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const status = action === 'approve' ? 'approved' : 'declined';

  const { error: updateError } = await supabase
    .from('guild_join_requests')
    .update({ status })
    .eq('id', requestId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }

  if (action === 'approve') {
    const { error: memberError } = await supabase
      .from('guild_members')
      .insert({ guild_id: guildId, user_id: joinRequest.user_id, role: 'MEMBER' });

    if (memberError) {
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }
  }

  const adminClient = createAdminClient();
  await adminClient.from('notifications').insert({
    user_id: joinRequest.user_id,
    type: action === 'approve' ? 'join_request_approved' : 'join_request_declined',
    entity_type: 'guild',
    entity_id: guildId,
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/guilds/[id]/join-requests/route.ts src/app/api/guilds/[id]/join-requests/[requestId]/route.ts
git commit -m "feat(api): add join-requests route handlers (GET, POST, PATCH)"
```

---

## Task 5: Notification enrichment + types + i18n

**Files:**
- Modify: `src/app/api/notifications/route.ts`
- Modify: `src/entities/notification/model/types.ts`
- Modify: `src/features/notification-panel/ui/NotificationItem.tsx`
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Update `src/app/api/notifications/route.ts` to enrich guild notifications**

Replace the entire file:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, type, entity_type, entity_id, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!notifications?.length) return NextResponse.json([]);

  const eventIds = [...new Set(
    notifications
      .filter((n) => n.entity_type === 'event' && n.entity_id)
      .map((n) => n.entity_id as string)
  )];

  const guildIds = [...new Set(
    notifications
      .filter((n) => n.entity_type === 'guild' && n.entity_id)
      .map((n) => n.entity_id as string)
  )];

  let eventsMap: Record<string, { title: string; event_date: string; guild_name: string | null }> = {};
  let guildsMap: Record<string, string> = {};

  if (eventIds.length > 0) {
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, event_date, guilds(name)')
      .in('id', eventIds);

    if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 });

    eventsMap = Object.fromEntries(
      (events ?? []).map((e) => {
        const guild = e.guilds as { name: string } | null;
        return [e.id, {
          title: e.title,
          event_date: e.event_date,
          guild_name: guild?.name ?? null,
        }];
      })
    );
  }

  if (guildIds.length > 0) {
    const { data: guilds } = await supabase
      .from('guilds')
      .select('id, name')
      .in('id', guildIds);

    guildsMap = Object.fromEntries((guilds ?? []).map((g) => [g.id, g.name]));
  }

  const result = notifications.map((n) => ({
    ...n,
    event_title: n.entity_type === 'event' ? (eventsMap[n.entity_id ?? '']?.title ?? null) : null,
    event_date: n.entity_type === 'event' ? (eventsMap[n.entity_id ?? '']?.event_date ?? null) : null,
    guild_name: n.entity_type === 'event'
      ? (eventsMap[n.entity_id ?? '']?.guild_name ?? null)
      : n.entity_type === 'guild'
        ? (guildsMap[n.entity_id ?? ''] ?? null)
        : null,
  }));

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Add three new notification configs to `src/entities/notification/model/types.ts`**

Replace the entire file:

```typescript
import { Calendar, Mail, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Notification {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  event_title: string | null;
  event_date: string | null;
  guild_name: string | null;
}

export type NotificationTranslationFn = (key: string, values?: Record<string, string>) => string;

export const NOTIFICATION_TYPE_CONFIG: Record<string, {
  Icon: LucideIcon;
  getLabel: (t: NotificationTranslationFn, n: Notification) => string;
}> = {
  new_event: {
    Icon: Calendar,
    getLabel: (t, n) => t('newEvent', { guildName: n.guild_name ?? '' }),
  },
  invitation: {
    Icon: Mail,
    getLabel: (t) => t('invitation'),
  },
  join_request: {
    Icon: UserPlus,
    getLabel: (t, n) => t('joinRequest', { guildName: n.guild_name ?? '' }),
  },
  join_request_approved: {
    Icon: CheckCircle,
    getLabel: (t, n) => t('joinRequestApproved', { guildName: n.guild_name ?? '' }),
  },
  join_request_declined: {
    Icon: XCircle,
    getLabel: (t, n) => t('joinRequestDeclined', { guildName: n.guild_name ?? '' }),
  },
};
```

- [ ] **Step 3: Add guild link support to `src/features/notification-panel/ui/NotificationItem.tsx`**

Replace the actions block (the section with `{notification.entity_type === 'event' && ...}`) with:

```tsx
      <div className={styles.actions}>
        {notification.entity_type === 'event' && notification.entity_id && (
          <Link href={`/events/${notification.entity_id}`} className={styles.link} onClick={onClose}>
            <ArrowUpRight size={14} />
          </Link>
        )}
        {notification.entity_type === 'guild' && notification.entity_id && (
          <Link href={`/guilds/${notification.entity_id}`} className={styles.link} onClick={onClose}>
            <ArrowUpRight size={14} />
          </Link>
        )}
        {!notification.is_read && <span className={styles.dot} />}
      </div>
```

- [ ] **Step 4: Add notification translation strings to `messages/en.json`**

In the `"Notifications"` object, add three new keys:

```json
"joinRequest": "New join request in «{guildName}»",
"joinRequestApproved": "Your request to join «{guildName}» was approved",
"joinRequestDeclined": "Your request to join «{guildName}» was declined"
```

- [ ] **Step 5: Add notification translation strings to `messages/ru.json`**

In the `"Notifications"` object, add three new keys:

```json
"joinRequest": "Новая заявка на вступление в «{guildName}»",
"joinRequestApproved": "Ваша заявка в «{guildName}» принята",
"joinRequestDeclined": "Ваша заявка в «{guildName}» отклонена"
```

- [ ] **Step 6: Verify**

```bash
npm run lint && npm run test:run
```

Expected: no lint errors, all existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/notifications/route.ts src/entities/notification/model/types.ts src/features/notification-panel/ui/NotificationItem.tsx messages/en.json messages/ru.json
git commit -m "feat(notifications): add guild join-request notification types and enrichment"
```

---

## Task 6: proxy.ts public route + GuildDetail i18n strings

**Files:**
- Modify: `src/proxy.ts`
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add `/guilds/` exception to `src/proxy.ts`**

Replace the auth-guard block:

```typescript
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth');
  const isGuildDetailPage = request.nextUrl.pathname.match(/^\/guilds\/[^/]+/) !== null;

  if (!user && !isLoginPage && !isAuthCallback && !isGuildDetailPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
```

The regex `/^\/guilds\/[^/]+/` matches `/guilds/<uuid>` but not `/guilds` (the protected manage page).

- [ ] **Step 2: Add `GuildDetail` namespace to `messages/en.json`**

Add a new top-level key:

```json
"GuildDetail": {
  "backToGuilds": "Back to guilds",
  "owner": "Owner",
  "members": "Members",
  "description": "Description",
  "applyToJoin": "Apply to Join",
  "requestSent": "Request Sent",
  "youAreMember": "You are a member",
  "youAreOwner": "You are the owner",
  "signInToApply": "Sign in to apply for membership",
  "pendingRequests": "Pending Requests",
  "noPendingRequests": "No pending requests",
  "accept": "Accept",
  "decline": "Decline",
  "joinRequestSuccess": "Join request sent",
  "joinRequestError": "Failed to send join request",
  "resolveSuccess": "Request resolved",
  "resolveError": "Failed to resolve request"
}
```

- [ ] **Step 3: Add `GuildDetail` namespace to `messages/ru.json`**

```json
"GuildDetail": {
  "backToGuilds": "Назад к гильдиям",
  "owner": "Владелец",
  "members": "Участников",
  "description": "Описание",
  "applyToJoin": "Подать заявку",
  "requestSent": "Заявка отправлена",
  "youAreMember": "Вы участник",
  "youAreOwner": "Вы владелец",
  "signInToApply": "Войдите, чтобы подать заявку",
  "pendingRequests": "Заявки на вступление",
  "noPendingRequests": "Нет заявок",
  "accept": "Принять",
  "decline": "Отклонить",
  "joinRequestSuccess": "Заявка отправлена",
  "joinRequestError": "Не удалось отправить заявку",
  "resolveSuccess": "Заявка обработана",
  "resolveError": "Не удалось обработать заявку"
}
```

- [ ] **Step 4: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts messages/en.json messages/ru.json
git commit -m "feat(routing): make /guilds/[id] public; add GuildDetail i18n strings"
```

---

## Task 7: JoinRequestItem component

**Files:**
- Create: `src/features/guild-detail/ui/JoinRequestItem.tsx`
- Create: `src/features/guild-detail/ui/JoinRequestItem.module.css`

- [ ] **Step 1: Create `src/features/guild-detail/ui/JoinRequestItem.tsx`**

```tsx
import React from 'react';
import { useTranslations } from 'next-intl';
import { JoinRequest } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import styles from './JoinRequestItem.module.css';

interface JoinRequestItemProps {
  request: JoinRequest;
  onAccept: () => void;
  onDecline: () => void;
}

export const JoinRequestItem: React.FC<JoinRequestItemProps> = ({ request, onAccept, onDecline }) => {
  const t = useTranslations('GuildDetail');

  return (
    <div className={styles.row}>
      <div className={styles.avatar}>
        {request.avatarUrl ? (
          <img src={request.avatarUrl} alt="" className={styles.avatarImg} />
        ) : (
          <span className={styles.avatarFallback}>
            {(request.userName ?? '?')[0].toUpperCase()}
          </span>
        )}
      </div>
      <span className={styles.name}>{request.userName ?? '—'}</span>
      <div className={styles.actions}>
        <Button type="button" variant="primary" size="sm" onClick={onAccept}>
          {t('accept')}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDecline}>
          {t('decline')}
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create `src/features/guild-detail/ui/JoinRequestItem.module.css`**

```css
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border);
  margin-bottom: 8px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(108, 99, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatarImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarFallback {
  font-size: 0.85rem;
  font-weight: 600;
  color: #a89fff;
}

.name {
  flex: 1;
  font-size: 0.9rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Verify**

```bash
npm run lint
```

Expected: no errors.

---

## Task 8: GuildDetailContent component

**Files:**
- Create: `src/features/guild-detail/ui/GuildDetailContent.tsx`
- Create: `src/features/guild-detail/ui/GuildDetailContent.module.css`
- Create: `src/features/guild-detail/index.ts`

- [ ] **Step 1: Create `src/features/guild-detail/ui/GuildDetailContent.tsx`**

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetGuildByIdQuery,
  useGetJoinRequestsQuery,
  useSubmitJoinRequestMutation,
  useResolveJoinRequestMutation,
} from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import { JoinRequestItem } from './JoinRequestItem';
import styles from './GuildDetailContent.module.css';

export type MembershipStatus = 'owner' | 'member' | 'pending' | 'none' | 'guest';

interface GuildDetailContentProps {
  guildId: string;
  initialMembershipStatus: MembershipStatus;
}

export const GuildDetailContent: React.FC<GuildDetailContentProps> = ({
  guildId,
  initialMembershipStatus,
}) => {
  const t = useTranslations('GuildDetail');
  const router = useRouter();
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>(initialMembershipStatus);

  const { data: guild, isLoading } = useGetGuildByIdQuery(guildId);

  const { data: joinRequests = [] } = useGetJoinRequestsQuery(guildId, {
    skip: membershipStatus !== 'owner',
  });

  const [submitJoinRequest, { isLoading: isSubmitting }] = useSubmitJoinRequestMutation();
  const [resolveJoinRequest] = useResolveJoinRequestMutation();

  const handleApply = async () => {
    if (membershipStatus === 'guest') {
      router.push('/login');
      return;
    }
    try {
      await submitJoinRequest(guildId).unwrap();
      setMembershipStatus('pending');
      toast.success(t('joinRequestSuccess'));
    } catch {
      toast.error(t('joinRequestError'));
    }
  };

  const handleResolve = async (requestId: string, action: 'approve' | 'decline') => {
    try {
      await resolveJoinRequest({ guildId, requestId, action }).unwrap();
      toast.success(t('resolveSuccess'));
    } catch {
      toast.error(t('resolveError'));
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!guild) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Guild not found</p>
      </div>
    );
  }

  const showFooter = membershipStatus === 'none' || membershipStatus === 'guest';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/guilds" className={styles.backLink}>
          <ChevronLeft size={20} />
          {t('backToGuilds')}
        </Link>
        <h1 className={styles.title}>{guild.name}</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.column}>
          {guild.description && (
            <div className={styles.infoGroup}>
              <span className={styles.label}>{t('description')}</span>
              <p className={styles.description}>{guild.description}</p>
            </div>
          )}

          <div className={styles.infoGroup}>
            <span className={styles.label}>{t('owner')}</span>
            <span className={styles.value}>{guild.ownerName ?? '—'}</span>
          </div>

          <div className={styles.infoGroup}>
            <span className={styles.label}>{t('members')}</span>
            <div className={styles.memberCount}>
              <Users size={16} />
              <span>{guild.memberCount}</span>
            </div>
          </div>
        </div>

        <div className={styles.column}>
          {membershipStatus === 'owner' && (
            <>
              <div className={`${styles.statusBadge} ${styles.statusOwner}`}>
                <Shield size={14} />
                {t('youAreOwner')}
              </div>

              <div className={styles.infoGroup}>
                <span className={styles.label}>{t('pendingRequests')}</span>
                {joinRequests.length === 0 ? (
                  <p className={styles.empty}>{t('noPendingRequests')}</p>
                ) : (
                  joinRequests.map((req) => (
                    <JoinRequestItem
                      key={req.id}
                      request={req}
                      onAccept={() => handleResolve(req.id, 'approve')}
                      onDecline={() => handleResolve(req.id, 'decline')}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {membershipStatus === 'member' && (
            <div className={`${styles.statusBadge} ${styles.statusMember}`}>
              {t('youAreMember')}
            </div>
          )}

          {membershipStatus === 'pending' && (
            <div className={`${styles.statusBadge} ${styles.statusPending}`}>
              {t('requestSent')}
            </div>
          )}

          {membershipStatus === 'guest' && (
            <p className={styles.signInText}>{t('signInToApply')}</p>
          )}
        </div>
      </div>

      {showFooter && (
        <div className={styles.footer}>
          <Button
            type="button"
            variant="primary"
            onClick={handleApply}
            disabled={isSubmitting}
          >
            {t('applyToJoin')}
          </Button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create `src/features/guild-detail/ui/GuildDetailContent.module.css`**

```css
.container {
  position: fixed;
  top: 4.5rem;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
  position: relative;
}

.backLink {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  z-index: 1;
}

.backLink:hover {
  color: var(--text-primary);
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent-yellow);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}

.body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.body::-webkit-scrollbar { width: 6px; }
.body::-webkit-scrollbar-track { background: transparent; }
.body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}
.body::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.28); }

.column {
  padding: 32px;
}

.column:first-child {
  border-right: 1px solid var(--glass-border);
}

.infoGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 24px;
}

.label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  display: block;
}

.value {
  font-size: 1rem;
  color: var(--text-primary);
}

.description {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.memberCount {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
  font-size: 1rem;
}

.statusBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  width: fit-content;
  margin-bottom: 24px;
}

.statusOwner {
  background: rgba(255, 179, 71, 0.12);
  color: #ffb347;
  border: 1px solid rgba(255, 179, 71, 0.3);
}

.statusMember {
  background: rgba(77, 255, 136, 0.1);
  color: #4dff88;
  border: 1px solid rgba(77, 255, 136, 0.25);
}

.statusPending {
  background: rgba(108, 99, 255, 0.12);
  color: #a89fff;
  border: 1px solid rgba(108, 99, 255, 0.3);
}

.signInText {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.skeleton {
  height: 44px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.8; }
}

@media (max-width: 768px) {
  .body {
    grid-template-columns: 1fr;
  }

  .column:first-child {
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
  }

  .title {
    max-width: 50%;
  }
}
```

- [ ] **Step 3: Create `src/features/guild-detail/index.ts`**

```typescript
export { GuildDetailContent, type MembershipStatus } from './ui/GuildDetailContent';
```

- [ ] **Step 4: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/guild-detail/
git commit -m "feat(guild-detail): add GuildDetailContent feature with join request UI"
```

---

## Task 9: Guild detail Server Component (page)

**Files:**
- Create: `src/app/guilds/[id]/page.tsx`
- Create: `src/app/guilds/[id]/GuildDetailPage.module.css`

- [ ] **Step 1: Create `src/app/guilds/[id]/page.tsx`**

```typescript
import { notFound } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';
import { GuildDetailContent, type MembershipStatus } from '@/features/guild-detail';
import styles from './GuildDetailPage.module.css';

interface GuildDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function GuildDetailPage({ params }: GuildDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: guild } = await supabase
    .from('guilds')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!guild) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  let membershipStatus: MembershipStatus = 'guest';

  if (user) {
    const { data: membership } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership?.role === 'OWNER') {
      membershipStatus = 'owner';
    } else if (membership) {
      membershipStatus = 'member';
    } else {
      const { data: pendingRequest } = await supabase
        .from('guild_join_requests')
        .select('id')
        .eq('guild_id', id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      membershipStatus = pendingRequest ? 'pending' : 'none';
    }
  }

  return (
    <main className={styles.main}>
      <GuildDetailContent guildId={id} initialMembershipStatus={membershipStatus} />
    </main>
  );
}
```

- [ ] **Step 2: Create `src/app/guilds/[id]/GuildDetailPage.module.css`**

```css
.main {}
```

- [ ] **Step 3: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/guilds/[id]/page.tsx src/app/guilds/[id]/GuildDetailPage.module.css
git commit -m "feat(guild-detail): add guild detail page Server Component"
```

---

## Task 10: GuildList — clickable items

**Files:**
- Modify: `src/features/manage-guilds/ui/GuildList.tsx`
- Modify: `src/features/manage-guilds/ui/GuildList.module.css`

- [ ] **Step 1: Update `src/features/manage-guilds/ui/GuildList.tsx`** — wrap the icon+info in a `<Link>`

Replace the entire file:

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Shield, Pencil, Trash2 } from 'lucide-react';
import { Guild } from '@/entities/guild';
import styles from './GuildList.module.css';

interface GuildListProps {
  title: string;
  guilds: Guild[];
  onEdit?: (guild: Guild) => void;
  onDelete?: (guild: Guild) => void;
  emptyMessage: string;
}

export const GuildList: React.FC<GuildListProps> = ({ title, guilds, onEdit, onDelete, emptyMessage }) => {
  const t = useTranslations('Guild');

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      {guilds.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <ul className={styles.list}>
          {guilds.map((guild) => (
            <li key={guild.id} className={styles.row}>
              <Link href={`/guilds/${guild.id}`} className={styles.rowLink}>
                <Shield size={18} className={styles.icon} />
                <div className={styles.info}>
                  <span className={styles.name}>{guild.name}</span>
                  {guild.description && (
                    <span className={styles.description}>{guild.description}</span>
                  )}
                </div>
              </Link>
              {(onEdit || onDelete) && (
                <div className={styles.actions}>
                  {onEdit && (
                    <button
                      className={styles.actionBtn}
                      aria-label={t('editLabel')}
                      onClick={() => onEdit(guild)}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className={styles.actionBtn}
                      aria-label={t('deleteLabel')}
                      onClick={() => onDelete(guild)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
```

- [ ] **Step 2: Update `src/features/manage-guilds/ui/GuildList.module.css`** — replace `.row` and add `.rowLink`

Replace the `.row` rule and add `.rowLink` after it:

```css
.row {
  display: flex;
  align-items: center;
  border-radius: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  transition: background 0.15s ease;
}

.row:hover {
  background: rgba(255, 255, 255, 0.07);
}

.rowLink {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}
```

Also update the `.icon` rule — remove the left padding since it's now inside `.rowLink`:

No change needed to `.icon`. The full updated CSS file:

```css
.section {
  margin-bottom: 40px;
}

.title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0 0 12px 0;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  border-radius: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  transition: background 0.15s ease;
}

.row:hover {
  background: rgba(255, 255, 255, 0.07);
}

.rowLink {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}

.icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.name {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
}

.description {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  padding-right: 8px;
}

.actionBtn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.actionBtn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.empty {
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 16px 0;
}
```

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run test:run
```

Expected: no lint errors, all existing tests pass (GuildList.test.tsx renders guild items — update mocks if the test breaks due to the Link wrapper, but do not add new test cases).

- [ ] **Step 4: Commit**

```bash
git add src/features/manage-guilds/ui/GuildList.tsx src/features/manage-guilds/ui/GuildList.module.css
git commit -m "feat(guild-list): make guild items navigate to /guilds/[id]"
```
