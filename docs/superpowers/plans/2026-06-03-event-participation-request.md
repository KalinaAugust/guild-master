# Event Participation Request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a guild member apply to participate in an event they were not invited to; the event creator approves or declines applications.

**Architecture:** Mirror the existing guild join-request pattern with a new `event_join_requests` table. Apply (member) → review/resolve (creator) → on approve insert a confirmed row into `event_participants`. The participants table RLS stays untouched. Data functions live in `features/event-detail/api`, thin route handlers in `src/app/api/events/[id]/join-requests`, RTK Query endpoints on `detailApi`, UI in `EventDetailContent`.

**Tech Stack:** Next.js 16 App Router, RTK Query, Supabase (Postgres + RLS), CSS Modules, next-intl, Vitest + Testing Library.

---

## File Structure

**Create:**
- `src/app/api/events/[id]/join-requests/route.ts` — POST (submit), GET (list pending).
- `src/app/api/events/[id]/join-requests/[requestId]/route.ts` — PATCH (approve/decline).
- `src/features/event-detail/api/submitEventJoinRequest.ts` — insert request + notify creator.
- `src/features/event-detail/api/getEventJoinRequests.ts` — list pending for creator.
- `src/features/event-detail/api/resolveEventJoinRequest.ts` — approve/decline + notify applicant.
- `src/features/event-detail/ui/EventJoinRequestItem.tsx` — applicant row with accept/decline (local copy of `JoinRequestItem`).
- `src/features/event-detail/ui/EventJoinRequestItem.module.css` — copy of `JoinRequestItem.module.css`.

**Modify:**
- DB (via Supabase MCP `apply_migration`) — new table + RLS.
- `src/features/event-detail/api/getEventParticipants.ts` — add `viewerIsGuildMember`, `viewerHasPendingRequest`.
- `src/entities/event/api/eventApi.ts:14-17` — extend `ParticipantsResponse`.
- `src/features/event-detail/api/detailApi.ts` — add 3 endpoints + `EventJoinRequest` type.
- `src/shared/api/baseApi.ts:7` — add `'EventJoinRequest'` tag.
- `src/features/event-detail/ui/EventDetailContent.tsx` — apply button + requests section.
- `src/entities/notification/model/types.ts` — 3 new notification configs.
- `messages/en.json`, `messages/ru.json` — `EventDetail` + `Notifications` keys.

---

## Task 1: Database migration

**Files:** applied via Supabase MCP `apply_migration` (this project has no local `supabase/migrations` dir).

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP tool `apply_migration` with `project_id: uzmyvxpjsfobqkcepygh`, `name: event_join_requests`, and this SQL:

```sql
create table if not exists public.event_join_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create unique index if not exists event_join_requests_event_user_pending_idx
  on public.event_join_requests (event_id, user_id)
  where status = 'pending';

alter table public.event_join_requests enable row level security;

-- Applicant inserts their own pending request, only if a guild member of the event's guild.
create policy "member_insert_event_join_requests"
  on public.event_join_requests for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and exists (
      select 1 from public.events e
      join public.guild_members gm on gm.guild_id = e.guild_id
      where e.id = event_join_requests.event_id and gm.user_id = auth.uid()
    )
  );

-- Applicant reads their own requests.
create policy "applicant_read_own_event_join_requests"
  on public.event_join_requests for select
  using (auth.uid() = user_id);

-- Event creator reads requests for their events.
create policy "creator_read_event_join_requests"
  on public.event_join_requests for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_join_requests.event_id and e.created_by = auth.uid()
    )
  );

-- Event creator resolves (approve/decline) requests for their events.
create policy "creator_update_event_join_requests"
  on public.event_join_requests for update
  using (
    exists (
      select 1 from public.events e
      where e.id = event_join_requests.event_id and e.created_by = auth.uid()
    )
  );
```

- [ ] **Step 2: Verify the table and policies exist**

Use Supabase MCP `execute_sql` with `project_id: uzmyvxpjsfobqkcepygh`:

```sql
select policyname, cmd from pg_policies where tablename = 'event_join_requests' order by policyname;
```

Expected: 4 rows — `applicant_read_own_event_join_requests` (SELECT), `creator_read_event_join_requests` (SELECT), `creator_update_event_join_requests` (UPDATE), `member_insert_event_join_requests` (INSERT).

- [ ] **Step 3: Regenerate Supabase types**

Use Supabase MCP `generate_typescript_types` with `project_id: uzmyvxpjsfobqkcepygh` and overwrite `src/shared/api/supabase/types.ts` with the result.

Run: `npx tsc --noEmit`
Expected: PASS (no type errors introduced).

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat(db): add event_join_requests table and RLS"
```

---

## Task 2: Extend participants data with viewer flags

**Files:**
- Modify: `src/features/event-detail/api/getEventParticipants.ts`
- Modify: `src/entities/event/api/eventApi.ts:14-17`

- [ ] **Step 1: Extend the return shape and query in `getEventParticipants.ts`**

Replace the whole file with:

```typescript
import { createClient } from '@/shared/api/supabase/server';
import { EventParticipant, ParticipantStatus } from '@/shared/types';

export const getEventParticipants = async (
  eventId: string
): Promise<{
  participants: EventParticipant[];
  currentUserId: string;
  viewerIsGuildMember: boolean;
  viewerHasPendingRequest: boolean;
}> => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = await db
    .from('event_participants')
    .select('id, event_id, user_id, status, profiles(full_name, avatar_url)')
    .eq('event_id', eventId);

  if (error) throw error;

  const participants: EventParticipant[] = ((data as Record<string, unknown>[]) || []).map((row) => {
    const profile = row['profiles'] as { full_name: string | null; avatar_url: string | null } | null;
    return {
      id: row['id'] as string,
      event_id: row['event_id'] as string,
      user_id: row['user_id'] as string,
      status: row['status'] as ParticipantStatus,
      profile: {
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      },
    };
  });

  const { data: eventRow } = await db
    .from('events')
    .select('guild_id')
    .eq('id', eventId)
    .single();

  let viewerIsGuildMember = false;
  if (eventRow?.guild_id) {
    const { data: membership } = await db
      .from('guild_members')
      .select('id')
      .eq('guild_id', eventRow.guild_id)
      .eq('user_id', user.id)
      .maybeSingle();
    viewerIsGuildMember = !!membership;
  }

  const { data: pendingRequest } = await db
    .from('event_join_requests')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  return {
    participants,
    currentUserId: user.id,
    viewerIsGuildMember,
    viewerHasPendingRequest: !!pendingRequest,
  };
};
```

- [ ] **Step 2: Extend `ParticipantsResponse` in `eventApi.ts`**

Replace lines 14-17:

```typescript
interface ParticipantsResponse {
  participants: EventParticipant[];
  currentUserId: string;
  viewerIsGuildMember: boolean;
  viewerHasPendingRequest: boolean;
}
```

- [ ] **Step 3: Verify the existing participants test still passes**

The mock in `EventDetailContent.test.tsx:30-33` returns `{ participants: [], currentUserId: '' }`; the two new fields are `undefined` there, which the UI treats as falsy. Run:

Run: `npm run test:run -- src/features/event-detail/ui/EventDetailContent.test.tsx`
Expected: PASS

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/event-detail/api/getEventParticipants.ts src/entities/event/api/eventApi.ts
git commit -m "feat(event-detail): expose viewer membership and pending-request flags"
```

---

## Task 3: Submit-request data function

**Files:**
- Create: `src/features/event-detail/api/submitEventJoinRequest.ts`

- [ ] **Step 1: Write the data function**

```typescript
import { createClient } from '@/shared/api/supabase/server';
import { createAdminClient } from '@/shared/api/supabase/admin';

/** Thrown when the user cannot apply (already participant / already pending). */
export class JoinRequestConflictError extends Error {}

export const submitEventJoinRequest = async (eventId: string): Promise<{ id: string }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: existingParticipant } = await db
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingParticipant) throw new JoinRequestConflictError('Already a participant');

  const { data: existingRequest } = await db
    .from('event_join_requests')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (existingRequest) throw new JoinRequestConflictError('Request already pending');

  const { data: request, error } = await db
    .from('event_join_requests')
    .insert({ event_id: eventId, user_id: user.id, status: 'pending' })
    .select('id')
    .single();
  if (error || !request) throw new Error('Failed to create request');

  const { data: event } = await db
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single();

  if (event?.created_by) {
    const adminClient = createAdminClient();
    await adminClient.from('notifications').insert({
      user_id: event.created_by,
      type: 'event_join_request',
      entity_type: 'event',
      entity_id: eventId,
    });
  }

  return { id: request.id as string };
};
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/event-detail/api/submitEventJoinRequest.ts
git commit -m "feat(event-detail): add submitEventJoinRequest data function"
```

---

## Task 4: List + resolve data functions

**Files:**
- Create: `src/features/event-detail/api/getEventJoinRequests.ts`
- Create: `src/features/event-detail/api/resolveEventJoinRequest.ts`

- [ ] **Step 1: Write `getEventJoinRequests.ts`**

RLS already restricts SELECT to the event creator, so this is a plain read.

```typescript
import { createClient } from '@/shared/api/supabase/server';

export interface EventJoinRequestRow {
  id: string;
  userId: string;
  userName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export const getEventJoinRequests = async (eventId: string): Promise<EventJoinRequestRow[]> => {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('event_join_requests')
    .select('id, user_id, created_at, profiles(full_name, avatar_url)')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  type Row = {
    id: string;
    user_id: string;
    created_at: string;
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  };

  return ((data as Row[]) || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.profiles?.full_name ?? null,
    avatarUrl: r.profiles?.avatar_url ?? null,
    createdAt: r.created_at,
  }));
};
```

- [ ] **Step 2: Write `resolveEventJoinRequest.ts`**

```typescript
import { createClient } from '@/shared/api/supabase/server';
import { createAdminClient } from '@/shared/api/supabase/admin';

/** Thrown when the caller is not the event creator. */
export class ResolveForbiddenError extends Error {}
/** Thrown when the pending request does not exist. */
export class ResolveNotFoundError extends Error {}

export const resolveEventJoinRequest = async (
  eventId: string,
  requestId: string,
  action: 'approve' | 'decline'
): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: event } = await db
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single();
  if (!event || event.created_by !== user.id) throw new ResolveForbiddenError('Forbidden');

  const { data: request } = await db
    .from('event_join_requests')
    .select('user_id')
    .eq('id', requestId)
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .maybeSingle();
  if (!request) throw new ResolveNotFoundError('Request not found');

  if (action === 'approve') {
    const { error: insertError } = await db
      .from('event_participants')
      .insert({ event_id: eventId, user_id: request.user_id, status: 'confirmed' });
    // Duplicate key (already a participant) is treated as success.
    if (insertError && !insertError.message.includes('duplicate key')) {
      throw insertError;
    }
  }

  const { error: updateError } = await db
    .from('event_join_requests')
    .update({ status: action === 'approve' ? 'approved' : 'declined' })
    .eq('id', requestId);
  if (updateError) throw updateError;

  const adminClient = createAdminClient();
  await adminClient.from('notifications').insert({
    user_id: request.user_id,
    type: action === 'approve' ? 'event_join_request_approved' : 'event_join_request_declined',
    entity_type: 'event',
    entity_id: eventId,
  });
};
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/event-detail/api/getEventJoinRequests.ts src/features/event-detail/api/resolveEventJoinRequest.ts
git commit -m "feat(event-detail): add list and resolve join-request data functions"
```

---

## Task 5: Route handlers

**Files:**
- Create: `src/app/api/events/[id]/join-requests/route.ts`
- Create: `src/app/api/events/[id]/join-requests/[requestId]/route.ts`

- [ ] **Step 1: Write the collection route (`route.ts`)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/shared/api/guildAuth';
import { getEventJoinRequests } from '@/features/event-detail/api/getEventJoinRequests';
import {
  submitEventJoinRequest,
  JoinRequestConflictError,
} from '@/features/event-detail/api/submitEventJoinRequest';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const requests = await getEventJoinRequests(id);
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const request = await submitEventJoinRequest(id);
    return NextResponse.json({ id: request.id }, { status: 201 });
  } catch (e) {
    if (e instanceof JoinRequestConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the item route (`[requestId]/route.ts`)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/shared/api/guildAuth';
import {
  resolveEventJoinRequest,
  ResolveForbiddenError,
  ResolveNotFoundError,
} from '@/features/event-detail/api/resolveEventJoinRequest';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id, requestId } = await params;
  const body = await request.json();
  const action: unknown = body?.action;
  if (action !== 'approve' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be approve or decline' }, { status: 400 });
  }

  try {
    await resolveEventJoinRequest(id, requestId, action);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof ResolveForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (e instanceof ResolveNotFoundError) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to resolve request' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/events/[id]/join-requests
git commit -m "feat(api): add event join-request route handlers"
```

---

## Task 6: RTK Query endpoints + tag

**Files:**
- Modify: `src/shared/api/baseApi.ts:7`
- Modify: `src/features/event-detail/api/detailApi.ts`

- [ ] **Step 1: Add the tag type in `baseApi.ts`**

Replace line 7:

```typescript
  tagTypes: ['Event', 'Participant', 'GuildMember', 'Guild', 'Notification', 'JoinRequest', 'EventJoinRequest'],
```

- [ ] **Step 2: Replace `detailApi.ts` with the extended endpoints**

```typescript
import { baseApi } from '@/shared/api/baseApi';
import { ParticipantStatus } from '@/shared/types';

export interface EventJoinRequest {
  id: string;
  userId: string;
  userName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export const detailApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateParticipantStatus: builder.mutation<
      { updated: boolean },
      { eventId: string; status: ParticipantStatus }
    >({
      query: ({ eventId, status }) => ({
        url: `participants/${eventId}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Participant' as const, id: `LIST-${eventId}` },
      ],
    }),
    submitEventJoinRequest: builder.mutation<{ id: string }, string>({
      query: (eventId) => ({ url: `events/${eventId}/join-requests`, method: 'POST' }),
      invalidatesTags: (_, __, eventId) => [
        { type: 'Participant' as const, id: `LIST-${eventId}` },
      ],
    }),
    getEventJoinRequests: builder.query<EventJoinRequest[], string>({
      query: (eventId) => `events/${eventId}/join-requests`,
      providesTags: (_, __, eventId) => [
        { type: 'EventJoinRequest' as const, id: `LIST-${eventId}` },
      ],
    }),
    resolveEventJoinRequest: builder.mutation<
      { success: boolean },
      { eventId: string; requestId: string; action: 'approve' | 'decline' }
    >({
      query: ({ eventId, requestId, action }) => ({
        url: `events/${eventId}/join-requests/${requestId}`,
        method: 'PATCH',
        body: { action },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'EventJoinRequest' as const, id: `LIST-${eventId}` },
        { type: 'Participant' as const, id: `LIST-${eventId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useUpdateParticipantStatusMutation,
  useSubmitEventJoinRequestMutation,
  useGetEventJoinRequestsQuery,
  useResolveEventJoinRequestMutation,
} = detailApi;
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/baseApi.ts src/features/event-detail/api/detailApi.ts
git commit -m "feat(event-detail): add join-request RTK Query endpoints"
```

---

## Task 7: EventJoinRequestItem component

**Files:**
- Create: `src/features/event-detail/ui/EventJoinRequestItem.module.css`
- Create: `src/features/event-detail/ui/EventJoinRequestItem.tsx`

- [ ] **Step 1: Copy the styles**

Copy `src/features/guild-detail/ui/JoinRequestItem.module.css` verbatim to `src/features/event-detail/ui/EventJoinRequestItem.module.css`.

Run: `cp src/features/guild-detail/ui/JoinRequestItem.module.css src/features/event-detail/ui/EventJoinRequestItem.module.css`

- [ ] **Step 2: Write the component**

```tsx
import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/Button';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import type { EventJoinRequest } from '../api/detailApi';
import styles from './EventJoinRequestItem.module.css';

interface EventJoinRequestItemProps {
  request: EventJoinRequest;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
  disabled?: boolean;
}

export const EventJoinRequestItem: React.FC<EventJoinRequestItemProps> = ({
  request,
  onAccept,
  onDecline,
  isAccepting = false,
  isDeclining = false,
  disabled = false,
}) => {
  const t = useTranslations('EventDetail');

  return (
    <div className={styles.row}>
      <UserAvatar avatarUrl={request.avatarUrl} name={request.userName} size="sm" />
      <span className={styles.name}>{request.userName ?? '—'}</span>
      <div className={styles.actions}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onAccept}
          isLoading={isAccepting}
          disabled={disabled && !isAccepting}
        >
          {t('acceptRequest')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onDecline}
          isLoading={isDeclining}
          disabled={disabled && !isDeclining}
        >
          {t('declineRequest')}
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/event-detail/ui/EventJoinRequestItem.tsx src/features/event-detail/ui/EventJoinRequestItem.module.css
git commit -m "feat(event-detail): add EventJoinRequestItem component"
```

---

## Task 8: Wire apply button + requests section into EventDetailContent

**Files:**
- Modify: `src/features/event-detail/ui/EventDetailContent.tsx`

- [ ] **Step 1: Add imports**

After the existing `useUpdateParticipantStatusMutation` import (line 20), add:

```typescript
import {
  useUpdateParticipantStatusMutation,
  useSubmitEventJoinRequestMutation,
  useGetEventJoinRequestsQuery,
  useResolveEventJoinRequestMutation,
} from '../api/detailApi';
import { EventJoinRequestItem } from './EventJoinRequestItem';
```

(Replace the old single-line `useUpdateParticipantStatusMutation` import with this grouped import; remove the standalone `import { useUpdateParticipantStatusMutation } from '../api/detailApi';` line.)

- [ ] **Step 2: Add derived viewer state and hooks**

After the existing `participants` / `isCreator` block (around line 56), add:

```typescript
  const viewerIsGuildMember = participantsData?.viewerIsGuildMember ?? false;
  const viewerHasPendingRequest = participantsData?.viewerHasPendingRequest ?? false;
  const isParticipant =
    !!currentUserId && participants.some((p) => p.user_id === currentUserId);
  const canApply =
    !!currentUserId && viewerIsGuildMember && !isCreator && !isParticipant && !viewerHasPendingRequest;

  const { data: joinRequests = [] } = useGetEventJoinRequestsQuery(eventId, {
    skip: !isCreator,
  });
  const [submitJoinRequest, { isLoading: isApplying }] = useSubmitEventJoinRequestMutation();
  const [resolveJoinRequest] = useResolveEventJoinRequestMutation();
  const [resolvingState, setResolvingState] = useState<{ id: string; action: 'approve' | 'decline' } | null>(null);
```

- [ ] **Step 3: Add handlers**

After `handleDecline` (around line 88), add:

```typescript
  const handleApply = async () => {
    try {
      await submitJoinRequest(eventId).unwrap();
      toast.success(t('applySuccess'));
    } catch {
      toast.error(t('applyError'));
    }
  };

  const handleResolve = async (requestId: string, action: 'approve' | 'decline') => {
    setResolvingState({ id: requestId, action });
    try {
      await resolveJoinRequest({ eventId, requestId, action }).unwrap();
      toast.success(t('resolveSuccess'));
    } catch {
      toast.error(t('resolveError'));
    } finally {
      setResolvingState(null);
    }
  };
```

- [ ] **Step 4: Render the requests section + apply button above the participant list**

Replace the participants column header block (lines 152-155) — i.e. the opening `<div className={styles.column}>` for participants down to and including the `<span className={styles.label}>…participants…</span>` — with:

```tsx
        <div className={styles.column}>
          {isCreator && (
            <div className={styles.requestsGroup}>
              <span className={styles.label}>{t('requests')}</span>
              {joinRequests.length === 0 ? (
                <p className={styles.empty}>{t('noRequests')}</p>
              ) : (
                joinRequests.map((req) => (
                  <EventJoinRequestItem
                    key={req.id}
                    request={req}
                    onAccept={() => handleResolve(req.id, 'approve')}
                    onDecline={() => handleResolve(req.id, 'decline')}
                    isAccepting={resolvingState?.id === req.id && resolvingState?.action === 'approve'}
                    isDeclining={resolvingState?.id === req.id && resolvingState?.action === 'decline'}
                    disabled={resolvingState?.id === req.id}
                  />
                ))
              )}
            </div>
          )}

          {canApply && (
            <Button
              type="button"
              variant="primary"
              onClick={handleApply}
              isLoading={isApplying}
            >
              {t('applyToParticipate')}
            </Button>
          )}

          {viewerHasPendingRequest && !isCreator && (
            <div className={styles.requestSentBadge}>{t('requestSent')}</div>
          )}

          <span className={styles.label}>
            {t('participants')}{!isParticipantsLoading && ` (${participants.length})`}
          </span>
```

(The rest of the participants column — loading, empty, and list rendering — stays unchanged.)

- [ ] **Step 5: Add the three CSS classes**

Append to `src/features/event-detail/ui/EventDetailContent.module.css`:

```css
.requestsGroup {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.requestSentBadge {
  align-self: flex-start;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-secondary, #b8c0e0);
}
```

- [ ] **Step 6: Run the component test**

Run: `npm run test:run -- src/features/event-detail/ui/EventDetailContent.test.tsx`
Expected: PASS (creator-only and member-only branches are gated on flags absent in the mock, so existing assertions are unaffected).

- [ ] **Step 7: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/event-detail/ui/EventDetailContent.tsx src/features/event-detail/ui/EventDetailContent.module.css
git commit -m "feat(event-detail): apply button and creator requests section"
```

---

## Task 9: i18n + notification configs

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`
- Modify: `src/entities/notification/model/types.ts`

- [ ] **Step 1: Add `EventDetail` keys (en.json)**

Inside the `EventDetail` object add:

```json
    "applyToParticipate": "Apply to participate",
    "applySuccess": "Application submitted",
    "applyError": "Failed to submit application",
    "requestSent": "Application sent",
    "requests": "Applications",
    "noRequests": "No applications",
    "acceptRequest": "Accept",
    "declineRequest": "Decline",
    "resolveSuccess": "Application updated",
    "resolveError": "Failed to update application"
```

- [ ] **Step 2: Add `Notifications` keys (en.json)**

Inside the `Notifications` object add:

```json
    "eventJoinRequest": "New application for «{eventTitle}»",
    "eventJoinRequestApproved": "Your application for «{eventTitle}» was approved",
    "eventJoinRequestDeclined": "Your application for «{eventTitle}» was declined"
```

- [ ] **Step 3: Add the same keys to ru.json**

`EventDetail`:

```json
    "applyToParticipate": "Подать заявку на участие",
    "applySuccess": "Заявка отправлена",
    "applyError": "Не удалось отправить заявку",
    "requestSent": "Заявка отправлена",
    "requests": "Заявки",
    "noRequests": "Нет заявок",
    "acceptRequest": "Принять",
    "declineRequest": "Отклонить",
    "resolveSuccess": "Заявка обновлена",
    "resolveError": "Не удалось обновить заявку"
```

`Notifications`:

```json
    "eventJoinRequest": "Новая заявка на «{eventTitle}»",
    "eventJoinRequestApproved": "Ваша заявка на «{eventTitle}» одобрена",
    "eventJoinRequestDeclined": "Ваша заявка на «{eventTitle}» отклонена"
```

- [ ] **Step 4: Add notification configs**

In `src/entities/notification/model/types.ts`, add `Sword` is unnecessary; reuse existing icons. Extend the import on line 1 to include nothing new (icons `UserPlus`, `CheckCircle`, `XCircle` already imported). Add to `NOTIFICATION_TYPE_CONFIG` after `join_request_declined`:

```typescript
  event_join_request: {
    Icon: UserPlus,
    getLabel: (t, n) => t('eventJoinRequest', { eventTitle: n.event_title ?? '' }),
  },
  event_join_request_approved: {
    Icon: CheckCircle,
    getLabel: (t, n) => t('eventJoinRequestApproved', { eventTitle: n.event_title ?? '' }),
  },
  event_join_request_declined: {
    Icon: XCircle,
    getLabel: (t, n) => t('eventJoinRequestDeclined', { eventTitle: n.event_title ?? '' }),
  },
```

- [ ] **Step 5: Verify JSON validity and types**

Run: `node -e "require('./messages/en.json');require('./messages/ru.json');console.log('ok')" && npx tsc --noEmit`
Expected: prints `ok`, tsc PASS

- [ ] **Step 6: Run the full test suite**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/ru.json src/entities/notification/model/types.ts
git commit -m "feat(event-detail): i18n and notification labels for join requests"
```

---

## Notes for the implementer

- **Notification `event_title`:** verified — `src/app/api/notifications/route.ts:18` enriches every notification with `entity_type === 'event'` (regardless of `type`), so the three new `event_join_request*` types get `event_title` automatically. No change needed there.
- **`createAdminClient`:** import path is `@/shared/api/supabase/admin` (same as guild join-requests).
- **No participant-table RLS change** is part of this plan; approval inserts via the creator's existing `event_creator_insert_participants` policy.

---

## Self-Review

- **Spec coverage:** §1 DB → Task 1. §2 routes → Task 5 (data fns Tasks 3-4). §3 viewer flags → Task 2. §4 RTK → Task 6. §5 UI (apply button + creator requests section + EventJoinRequestItem) → Tasks 7-8. i18n + notifications → Task 9. Defaults (decline keeps row as `declined`; notify `created_by`) → Tasks 3-4. All covered.
- **Type consistency:** `EventJoinRequest` (detailApi) ↔ `EventJoinRequestRow` (getEventJoinRequests) share field names (`id`, `userId`, `userName`, `avatarUrl`, `createdAt`); the route returns the row shape directly, RTK consumes as `EventJoinRequest`. `ParticipantsResponse` fields `viewerIsGuildMember`/`viewerHasPendingRequest` match `getEventParticipants` return and `EventDetailContent` reads. Mutation arg `{ eventId, requestId, action }` matches route params and `resolveEventJoinRequest` signature.
- **Placeholder scan:** none.
