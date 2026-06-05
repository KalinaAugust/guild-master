# Event Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a participation-gated comment thread to the event detail page, shown in a "Participants / Comments" tab switcher.

**Architecture:** New Supabase table `event_comments` with RLS as the single access gate. Server data functions in `entities/comment/api` are exposed through Next.js route handlers under `/api/events/[id]/comments`. RTK Query (`commentApi`) injects endpoints on `baseApi`. UI lives in `features/event-detail` (a tab switcher composing the existing participants block with a new comments panel), because feature→feature imports are forbidden in FSD.

**Tech Stack:** Next.js 16 App Router, React 19, Redux Toolkit + RTK Query, Supabase (RLS), CSS Modules, next-intl, dayjs, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-05-event-comments-design.md`

---

## File Structure

**Create:**
- `supabase/migrations/20260605000000_event_comments.sql` — table + index + RLS.
- `src/entities/comment/model/types.ts` — `EventComment` type.
- `src/entities/comment/api/mapCommentRow.ts` — shared row→`EventComment` mapper + `COMMENT_SELECT`.
- `src/entities/comment/api/getComments.ts` (+ `.test.ts`) — server read.
- `src/entities/comment/api/createComment.ts` (+ `.test.ts`) — server create + validation.
- `src/entities/comment/api/updateComment.ts` (+ `.test.ts`) — server update.
- `src/entities/comment/api/deleteComment.ts` (+ `.test.ts`) — server delete.
- `src/entities/comment/api/commentApi.ts` — RTK Query endpoints.
- `src/entities/comment/index.ts` — public barrel (client-safe exports only).
- `src/app/api/events/[id]/comments/route.ts` (+ `.test.ts`) — GET list, POST create.
- `src/app/api/events/[id]/comments/[commentId]/route.ts` (+ `.test.ts`) — PATCH, DELETE.
- `src/features/event-detail/ui/CommentItem.tsx` (+ `.test.tsx`) + `.module.css`.
- `src/features/event-detail/ui/CommentInput.tsx` (+ `.test.tsx`) + `.module.css`.
- `src/features/event-detail/ui/CommentsTab.tsx` (+ `.test.tsx`) + `.module.css`.
- `src/features/event-detail/ui/EventTabs.tsx` + `.module.css`.

**Modify:**
- `src/shared/api/baseApi.ts` — add `'Comment'` tag type.
- `src/features/event-detail/ui/EventDetailContent.tsx` — compute comment permissions, render `EventTabs`.
- `messages/en.json`, `messages/ru.json` — add `EventComments` namespace.

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260605000000_event_comments.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Event comments: participation-gated discussion thread per event.
create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_comments_event_id_created_at_idx
  on public.event_comments (event_id, created_at);

alter table public.event_comments enable row level security;

-- READ: event creator OR a participant with status pending/confirmed.
create policy "event_comments_select" on public.event_comments
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_comments.event_id and e.created_by = auth.uid()
    )
    or exists (
      select 1 from public.event_participants p
      where p.event_id = event_comments.event_id
        and p.user_id = auth.uid()
        and p.status in ('pending', 'confirmed')
    )
  );

-- CREATE: own row, and (creator OR confirmed participant).
create policy "event_comments_insert" on public.event_comments
  for insert with check (
    user_id = auth.uid()
    and (
      exists (
        select 1 from public.events e
        where e.id = event_comments.event_id and e.created_by = auth.uid()
      )
      or exists (
        select 1 from public.event_participants p
        where p.event_id = event_comments.event_id
          and p.user_id = auth.uid()
          and p.status = 'confirmed'
      )
    )
  );

-- UPDATE / DELETE: author only.
create policy "event_comments_update" on public.event_comments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "event_comments_delete" on public.event_comments
  for delete using (user_id = auth.uid());
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260605000000_event_comments.sql
git commit -m "feat(db): add event_comments table and RLS"
```

> **Note for the implementer:** This SQL is the source of truth in the repo; the user applies it manually in Supabase. No automated migration runner exists in this project.

---

## Task 2: Register the `Comment` RTK Query tag

**Files:**
- Modify: `src/shared/api/baseApi.ts:6`

- [ ] **Step 1: Add the tag**

Change the `tagTypes` array to include `'Comment'`:

```typescript
  tagTypes: ['Event', 'Participant', 'GuildMember', 'Guild', 'Notification', 'JoinRequest', 'EventJoinRequest', 'Comment'],
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/api/baseApi.ts
git commit -m "feat(api): register Comment RTK Query tag"
```

---

## Task 3: `EventComment` type

**Files:**
- Create: `src/entities/comment/model/types.ts`

- [ ] **Step 1: Write the type**

```typescript
export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/comment/model/types.ts
git commit -m "feat(comment): add EventComment type"
```

---

## Task 4: Row mapper helper

**Files:**
- Create: `src/entities/comment/api/mapCommentRow.ts`

- [ ] **Step 1: Write the mapper and shared select string**

```typescript
import type { EventComment } from '../model/types';

export const COMMENT_SELECT =
  'id, event_id, user_id, body, created_at, updated_at, profiles(full_name, avatar_url)';

interface CommentRow {
  id: string;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

export const mapCommentRow = (row: CommentRow): EventComment => ({
  id: row.id,
  eventId: row.event_id,
  userId: row.user_id,
  body: row.body,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  profile: {
    fullName: row.profiles?.full_name ?? null,
    avatarUrl: row.profiles?.avatar_url ?? null,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/comment/api/mapCommentRow.ts
git commit -m "feat(comment): add row mapper helper"
```

---

## Task 5: `getComments` server function

**Files:**
- Create: `src/entities/comment/api/getComments.ts`
- Test: `src/entities/comment/api/getComments.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getComments } from './getComments';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ from }) as never);

describe('getComments', () => {
  it('maps rows to EventComment shape', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: [
      { id: 'c1', event_id: 'e1', user_id: 'u2', body: 'hi', created_at: '2026-06-05T10:00:00Z', updated_at: '2026-06-05T10:00:00Z', profiles: { full_name: 'Bob', avatar_url: 'a.png' } },
    ] }));
    useClient(from);

    const result = await getComments('e1');
    expect(result).toEqual([
      { id: 'c1', eventId: 'e1', userId: 'u2', body: 'hi', createdAt: '2026-06-05T10:00:00Z', updatedAt: '2026-06-05T10:00:00Z', profile: { fullName: 'Bob', avatarUrl: 'a.png' } },
    ]);
  });

  it('throws on query error', async () => {
    useClient(vi.fn().mockReturnValueOnce(query({ error: new Error('boom') })));
    await expect(getComments('e1')).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/entities/comment/api/getComments.test.ts`
Expected: FAIL — `getComments` not defined / module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { createClient } from '@/shared/api/supabase/server';
import type { EventComment } from '../model/types';
import { COMMENT_SELECT, mapCommentRow } from './mapCommentRow';

export const getComments = async (eventId: string): Promise<EventComment[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('event_comments')
    .select(COMMENT_SELECT)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapCommentRow);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/entities/comment/api/getComments.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/entities/comment/api/getComments.ts src/entities/comment/api/getComments.test.ts
git commit -m "feat(comment): add getComments server function"
```

---

## Task 6: `createComment` server function

**Files:**
- Create: `src/entities/comment/api/createComment.ts`
- Test: `src/entities/comment/api/createComment.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComment, InvalidCommentError } from './createComment';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('createComment', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(createComment('e1', 'hi')).rejects.toThrow('Not authenticated');
  });

  it('rejects empty body', async () => {
    useClient({ id: 'u1' }, vi.fn());
    await expect(createComment('e1', '   ')).rejects.toBeInstanceOf(InvalidCommentError);
  });

  it('rejects body over 2000 chars', async () => {
    useClient({ id: 'u1' }, vi.fn());
    await expect(createComment('e1', 'a'.repeat(2001))).rejects.toBeInstanceOf(InvalidCommentError);
  });

  it('inserts trimmed body and returns mapped comment', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: {
      id: 'c1', event_id: 'e1', user_id: 'u1', body: 'hi', created_at: 't', updated_at: 't', profiles: { full_name: 'Me', avatar_url: null },
    } }));
    useClient({ id: 'u1' }, from);

    const result = await createComment('e1', '  hi  ');
    expect(result.id).toBe('c1');
    expect(result.profile.fullName).toBe('Me');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/entities/comment/api/createComment.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { createClient } from '@/shared/api/supabase/server';
import type { EventComment } from '../model/types';
import { COMMENT_SELECT, mapCommentRow } from './mapCommentRow';

export const MAX_COMMENT_LENGTH = 2000;

/** Thrown when the comment body is empty or exceeds the length limit. */
export class InvalidCommentError extends Error {}

export const createComment = async (
  eventId: string,
  body: string,
): Promise<EventComment> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidCommentError('Comment is empty');
  if (trimmed.length > MAX_COMMENT_LENGTH) throw new InvalidCommentError('Comment is too long');

  const { data, error } = await supabase
    .from('event_comments')
    .insert({ event_id: eventId, user_id: user.id, body: trimmed })
    .select(COMMENT_SELECT)
    .single();

  if (error || !data) throw new Error('Failed to create comment');
  return mapCommentRow(data);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/entities/comment/api/createComment.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/entities/comment/api/createComment.ts src/entities/comment/api/createComment.test.ts
git commit -m "feat(comment): add createComment server function"
```

---

## Task 7: `updateComment` server function

**Files:**
- Create: `src/entities/comment/api/updateComment.ts`
- Test: `src/entities/comment/api/updateComment.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateComment } from './updateComment';
import { InvalidCommentError } from './createComment';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('updateComment', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(updateComment('c1', 'hi')).rejects.toThrow('Not authenticated');
  });

  it('rejects empty body', async () => {
    useClient({ id: 'u1' }, vi.fn());
    await expect(updateComment('c1', '  ')).rejects.toBeInstanceOf(InvalidCommentError);
  });

  it('updates and returns mapped comment', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: {
      id: 'c1', event_id: 'e1', user_id: 'u1', body: 'edited', created_at: 't1', updated_at: 't2', profiles: { full_name: 'Me', avatar_url: null },
    } }));
    useClient({ id: 'u1' }, from);

    const result = await updateComment('c1', '  edited  ');
    expect(result.body).toBe('edited');
    expect(result.updatedAt).toBe('t2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/entities/comment/api/updateComment.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { createClient } from '@/shared/api/supabase/server';
import type { EventComment } from '../model/types';
import { COMMENT_SELECT, mapCommentRow } from './mapCommentRow';
import { InvalidCommentError, MAX_COMMENT_LENGTH } from './createComment';

export const updateComment = async (
  commentId: string,
  body: string,
): Promise<EventComment> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidCommentError('Comment is empty');
  if (trimmed.length > MAX_COMMENT_LENGTH) throw new InvalidCommentError('Comment is too long');

  const { data, error } = await supabase
    .from('event_comments')
    .update({ body: trimmed, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select(COMMENT_SELECT)
    .single();

  if (error || !data) throw new Error('Failed to update comment');
  return mapCommentRow(data);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/entities/comment/api/updateComment.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/entities/comment/api/updateComment.ts src/entities/comment/api/updateComment.test.ts
git commit -m "feat(comment): add updateComment server function"
```

---

## Task 8: `deleteComment` server function

**Files:**
- Create: `src/entities/comment/api/deleteComment.ts`
- Test: `src/entities/comment/api/deleteComment.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteComment } from './deleteComment';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('deleteComment', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(deleteComment('c1')).rejects.toThrow('Not authenticated');
  });

  it('throws on delete error', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ error: new Error('nope') })));
    await expect(deleteComment('c1')).rejects.toThrow('nope');
  });

  it('resolves on success', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ error: null })));
    await expect(deleteComment('c1')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/entities/comment/api/deleteComment.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { createClient } from '@/shared/api/supabase/server';

export const deleteComment = async (commentId: string): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('event_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/entities/comment/api/deleteComment.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/entities/comment/api/deleteComment.ts src/entities/comment/api/deleteComment.test.ts
git commit -m "feat(comment): add deleteComment server function"
```

---

## Task 9: `commentApi` RTK Query endpoints + barrel

**Files:**
- Create: `src/entities/comment/api/commentApi.ts`
- Create: `src/entities/comment/index.ts`

- [ ] **Step 1: Write `commentApi.ts`**

```typescript
import { baseApi } from '@/shared/api/baseApi';
import type { EventComment } from '../model/types';

export const commentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getComments: builder.query<EventComment[], string>({
      query: (eventId) => `events/${eventId}/comments`,
      providesTags: (_, __, eventId) => [
        { type: 'Comment' as const, id: `LIST-${eventId}` },
      ],
    }),
    addComment: builder.mutation<EventComment, { eventId: string; body: string }>({
      query: ({ eventId, body }) => ({
        url: `events/${eventId}/comments`,
        method: 'POST',
        body: { body },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Comment' as const, id: `LIST-${eventId}` },
      ],
    }),
    updateComment: builder.mutation<
      EventComment,
      { eventId: string; commentId: string; body: string }
    >({
      query: ({ eventId, commentId, body }) => ({
        url: `events/${eventId}/comments/${commentId}`,
        method: 'PATCH',
        body: { body },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Comment' as const, id: `LIST-${eventId}` },
      ],
    }),
    deleteComment: builder.mutation<
      { deleted: boolean },
      { eventId: string; commentId: string }
    >({
      query: ({ eventId, commentId }) => ({
        url: `events/${eventId}/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Comment' as const, id: `LIST-${eventId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} = commentApi;
```

- [ ] **Step 2: Write the barrel `index.ts`** (client-safe only — no server functions)

```typescript
export {
  commentApi,
  useGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from './api/commentApi';
export type { EventComment } from './model/types';
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/entities/comment/api/commentApi.ts src/entities/comment/index.ts
git commit -m "feat(comment): add RTK Query endpoints and barrel"
```

---

## Task 10: Collection route handler (GET list + POST create)

**Files:**
- Create: `src/app/api/events/[id]/comments/route.ts`
- Test: `src/app/api/events/[id]/comments/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { getComments } from '@/entities/comment/api/getComments';
import { createComment, InvalidCommentError } from '@/entities/comment/api/createComment';
import { requireUser } from '@/shared/api/guildAuth';
import { NextResponse } from 'next/server';

vi.mock('@/entities/comment/api/getComments');
vi.mock('@/entities/comment/api/createComment');
vi.mock('@/shared/api/guildAuth');
beforeEach(() => vi.clearAllMocks());

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const body = (b: unknown) => ({ json: () => Promise.resolve(b) }) as never;
const okAuth = () => vi.mocked(requireUser).mockResolvedValue({ ok: true } as never);

describe('GET /api/events/[id]/comments', () => {
  it('returns comments', async () => {
    vi.mocked(getComments).mockResolvedValue([] as never);
    const res = await GET({} as never, params('e1'));
    expect(res.status).toBe(200);
  });
  it('returns 500 on failure', async () => {
    vi.mocked(getComments).mockRejectedValue(new Error('x'));
    expect((await GET({} as never, params('e1'))).status).toBe(500);
  });
});

describe('POST /api/events/[id]/comments', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) } as never);
    expect((await POST(body({ body: 'hi' }), params('e1'))).status).toBe(401);
  });
  it('creates comment and returns 201', async () => {
    okAuth();
    vi.mocked(createComment).mockResolvedValue({ id: 'c1' } as never);
    const res = await POST(body({ body: 'hi' }), params('e1'));
    expect(res.status).toBe(201);
    expect(createComment).toHaveBeenCalledWith('e1', 'hi');
  });
  it('returns 400 on invalid body', async () => {
    okAuth();
    vi.mocked(createComment).mockRejectedValue(new InvalidCommentError('bad'));
    expect((await POST(body({ body: '' }), params('e1'))).status).toBe(400);
  });
  it('returns 500 on other failure', async () => {
    okAuth();
    vi.mocked(createComment).mockRejectedValue(new Error('x'));
    expect((await POST(body({ body: 'hi' }), params('e1'))).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/api/events/[id]/comments/route.test.ts"`
Expected: FAIL — `./route` module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getComments } from '@/entities/comment/api/getComments';
import { createComment, InvalidCommentError } from '@/entities/comment/api/createComment';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const comments = await getComments(id);
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const { body } = await request.json();
    const comment = await createComment(id, body);
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidCommentError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/api/events/[id]/comments/route.test.ts"`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/events/[id]/comments/route.ts" "src/app/api/events/[id]/comments/route.test.ts"
git commit -m "feat(api): add events comments collection route"
```

---

## Task 11: Item route handler (PATCH + DELETE)

**Files:**
- Create: `src/app/api/events/[id]/comments/[commentId]/route.ts`
- Test: `src/app/api/events/[id]/comments/[commentId]/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH, DELETE } from './route';
import { updateComment } from '@/entities/comment/api/updateComment';
import { deleteComment } from '@/entities/comment/api/deleteComment';
import { InvalidCommentError } from '@/entities/comment/api/createComment';
import { requireUser } from '@/shared/api/guildAuth';
import { NextResponse } from 'next/server';

vi.mock('@/entities/comment/api/updateComment');
vi.mock('@/entities/comment/api/deleteComment');
vi.mock('@/shared/api/guildAuth');
beforeEach(() => vi.clearAllMocks());

const params = (id: string, commentId: string) => ({ params: Promise.resolve({ id, commentId }) });
const body = (b: unknown) => ({ json: () => Promise.resolve(b) }) as never;
const okAuth = () => vi.mocked(requireUser).mockResolvedValue({ ok: true } as never);
const noAuth = () => vi.mocked(requireUser).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) } as never);

describe('PATCH /api/events/[id]/comments/[commentId]', () => {
  it('returns 401 when unauthenticated', async () => {
    noAuth();
    expect((await PATCH(body({ body: 'x' }), params('e1', 'c1'))).status).toBe(401);
  });
  it('updates and returns 200', async () => {
    okAuth();
    vi.mocked(updateComment).mockResolvedValue({ id: 'c1' } as never);
    const res = await PATCH(body({ body: 'x' }), params('e1', 'c1'));
    expect(res.status).toBe(200);
    expect(updateComment).toHaveBeenCalledWith('c1', 'x');
  });
  it('returns 400 on invalid body', async () => {
    okAuth();
    vi.mocked(updateComment).mockRejectedValue(new InvalidCommentError('bad'));
    expect((await PATCH(body({ body: '' }), params('e1', 'c1'))).status).toBe(400);
  });
  it('returns 500 on other failure', async () => {
    okAuth();
    vi.mocked(updateComment).mockRejectedValue(new Error('x'));
    expect((await PATCH(body({ body: 'x' }), params('e1', 'c1'))).status).toBe(500);
  });
});

describe('DELETE /api/events/[id]/comments/[commentId]', () => {
  it('returns 401 when unauthenticated', async () => {
    noAuth();
    expect((await DELETE({} as never, params('e1', 'c1'))).status).toBe(401);
  });
  it('deletes and returns 200', async () => {
    okAuth();
    vi.mocked(deleteComment).mockResolvedValue();
    const res = await DELETE({} as never, params('e1', 'c1'));
    expect(res.status).toBe(200);
    expect(deleteComment).toHaveBeenCalledWith('c1');
  });
  it('returns 500 on failure', async () => {
    okAuth();
    vi.mocked(deleteComment).mockRejectedValue(new Error('x'));
    expect((await DELETE({} as never, params('e1', 'c1'))).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/api/events/[id]/comments/[commentId]/route.test.ts"`
Expected: FAIL — `./route` module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { updateComment } from '@/entities/comment/api/updateComment';
import { deleteComment } from '@/entities/comment/api/deleteComment';
import { InvalidCommentError } from '@/entities/comment/api/createComment';
import { requireUser } from '@/shared/api/guildAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { commentId } = await params;
    const { body } = await request.json();
    const comment = await updateComment(commentId, body);
    return NextResponse.json(comment);
  } catch (e) {
    if (e instanceof InvalidCommentError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { commentId } = await params;
    await deleteComment(commentId);
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/api/events/[id]/comments/[commentId]/route.test.ts"`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/events/[id]/comments/[commentId]/route.ts" "src/app/api/events/[id]/comments/[commentId]/route.test.ts"
git commit -m "feat(api): add events comment item route"
```

---

## Task 12: i18n strings (`EventComments` namespace)

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add the `EventComments` block to `messages/en.json`**

Insert as a top-level key (e.g. right after the `EventDetail` object's closing brace):

```json
  "EventComments": {
    "tabParticipants": "Participants",
    "tabComments": "Comments",
    "empty": "No comments yet. Start the discussion.",
    "placeholder": "Write a comment…",
    "send": "Send",
    "edited": "edited",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel",
    "confirmDelete": "Delete this comment?",
    "lockedPrompt": "Confirm participation to write comments",
    "sendError": "Failed to send comment",
    "updateError": "Failed to update comment",
    "deleteError": "Failed to delete comment"
  },
```

- [ ] **Step 2: Add the matching block to `messages/ru.json`**

```json
  "EventComments": {
    "tabParticipants": "Участники",
    "tabComments": "Комментарии",
    "empty": "Пока нет комментариев. Начните обсуждение.",
    "placeholder": "Написать комментарий…",
    "send": "Отправить",
    "edited": "изменено",
    "edit": "Изменить",
    "delete": "Удалить",
    "save": "Сохранить",
    "cancel": "Отмена",
    "confirmDelete": "Удалить этот комментарий?",
    "lockedPrompt": "Подтвердите участие, чтобы писать комментарии",
    "sendError": "Не удалось отправить комментарий",
    "updateError": "Не удалось изменить комментарий",
    "deleteError": "Не удалось удалить комментарий"
  },
```

- [ ] **Step 3: Verify both files are valid JSON**

Run: `node -e "require('./messages/en.json'); require('./messages/ru.json'); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat(i18n): add EventComments strings"
```

---

## Task 13: `CommentItem` component

**Files:**
- Create: `src/features/event-detail/ui/CommentItem.tsx`
- Create: `src/features/event-detail/ui/CommentItem.module.css`
- Test: `src/features/event-detail/ui/CommentItem.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CommentItem } from './CommentItem';
import type { EventComment } from '@/entities/comment';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const base: EventComment = {
  id: 'c1', eventId: 'e1', userId: 'u1', body: 'Hello there',
  createdAt: '2026-06-05T10:00:00Z', updatedAt: '2026-06-05T10:00:00Z',
  profile: { fullName: 'Alice', avatarUrl: null },
};

describe('CommentItem', () => {
  it('renders body and author', () => {
    render(<CommentItem comment={base} isOwn={false} />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows edited marker when updatedAt is later than createdAt', () => {
    render(<CommentItem comment={{ ...base, updatedAt: '2026-06-05T12:00:00Z' }} isOwn={false} />);
    expect(screen.getByText('edited')).toBeInTheDocument();
  });

  it('hides edit/delete for non-owners', () => {
    render(<CommentItem comment={base} isOwn={false} />);
    expect(screen.queryByText('edit')).not.toBeInTheDocument();
    expect(screen.queryByText('delete')).not.toBeInTheDocument();
  });

  it('shows edit/delete for owner and enters edit mode', async () => {
    const user = userEvent.setup();
    render(<CommentItem comment={base} isOwn onSave={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('edit')).toBeInTheDocument();
    await user.click(screen.getByText('edit'));
    expect(screen.getByText('save')).toBeInTheDocument();
  });

  it('calls onSave with edited text', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CommentItem comment={base} isOwn onSave={onSave} onDelete={vi.fn()} />);
    await user.click(screen.getByText('edit'));
    const field = screen.getByRole('textbox');
    await user.clear(field);
    await user.type(field, 'Updated');
    await user.click(screen.getByText('save'));
    expect(onSave).toHaveBeenCalledWith('Updated');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/event-detail/ui/CommentItem.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `CommentItem.module.css`**

```css
.item {
  display: flex;
  gap: 12px;
  padding: 10px 0;
}

.body {
  flex: 1;
  min-width: 0;
}

.head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.name {
  font-weight: 600;
  font-size: 0.9rem;
}

.meta {
  font-size: 0.75rem;
  opacity: 0.6;
}

.text {
  margin: 4px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9rem;
  line-height: 1.4;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.editActions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
```

- [ ] **Step 4: Write `CommentItem.tsx`**

```tsx
'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { EventComment } from '@/entities/comment';
import styles from './CommentItem.module.css';

interface CommentItemProps {
  comment: EventComment;
  isOwn: boolean;
  onSave?: (body: string) => void;
  onDelete?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isOwn,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}) => {
  const t = useTranslations('EventComments');
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isEdited = dayjs(comment.updatedAt).diff(dayjs(comment.createdAt), 'second') > 2;
  const time = dayjs(comment.createdAt).locale(locale).fromNow();

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave?.(trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(comment.body);
    setIsEditing(false);
  };

  return (
    <div className={styles.item}>
      <UserAvatar avatarUrl={comment.profile.avatarUrl} name={comment.profile.fullName} size="md" />
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.name}>{comment.profile.fullName || '—'}</span>
          <span className={styles.meta}>{time}{isEdited ? ` · ${t('edited')}` : ''}</span>
        </div>

        {isEditing ? (
          <>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={2000} />
            <div className={styles.editActions}>
              <Button type="button" size="xs" variant="primary" onClick={handleSave} isLoading={isSaving}>
                {t('save')}
              </Button>
              <Button type="button" size="xs" variant="secondary" onClick={handleCancel} disabled={isSaving}>
                {t('cancel')}
              </Button>
            </div>
          </>
        ) : (
          <p className={styles.text}>{comment.body}</p>
        )}

        {isOwn && !isEditing && (
          <div className={styles.actions}>
            <Button type="button" size="xs" variant="secondary" onClick={() => setIsEditing(true)}>
              {t('edit')}
            </Button>
            <Button type="button" size="xs" variant="danger" onClick={() => setConfirmOpen(true)} isLoading={isDeleting}>
              {t('delete')}
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { onDelete?.(); setConfirmOpen(false); }}
        title={t('delete')}
        description={t('confirmDelete')}
        confirmLabel={t('delete')}
      />
    </div>
  );
};
```

> **Implementer note:** Confirm the `Textarea` prop signature in `src/shared/ui/Textarea` (it wraps a native `<textarea>`, so `value`/`onChange`/`rows`/`maxLength` apply). Confirm `UserAvatar` accepts `avatarUrl`/`name`/`size` (it does — see `ParticipantItem.tsx`). Confirm `ConfirmModal` prop names against `EventDetailContent.tsx` usage (`isOpen`, `onClose`, `onConfirm`, `title`, `description`, `confirmLabel`).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/event-detail/ui/CommentItem.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/event-detail/ui/CommentItem.tsx src/features/event-detail/ui/CommentItem.module.css src/features/event-detail/ui/CommentItem.test.tsx
git commit -m "feat(event-detail): add CommentItem component"
```

---

## Task 14: `CommentInput` component

**Files:**
- Create: `src/features/event-detail/ui/CommentInput.tsx`
- Create: `src/features/event-detail/ui/CommentInput.module.css`
- Test: `src/features/event-detail/ui/CommentInput.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CommentInput } from './CommentInput';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('CommentInput', () => {
  it('shows the locked prompt when canWrite is false', () => {
    render(<CommentInput canWrite={false} onSubmit={vi.fn()} />);
    expect(screen.getByText('lockedPrompt')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders an input and send button when canWrite is true', () => {
    render(<CommentInput canWrite onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('send')).toBeInTheDocument();
  });

  it('calls onSubmit with trimmed text and clears the field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentInput canWrite onSubmit={onSubmit} />);
    const field = screen.getByRole('textbox');
    await user.type(field, '  hello  ');
    await user.click(screen.getByText('send'));
    expect(onSubmit).toHaveBeenCalledWith('hello');
    expect(field).toHaveValue('');
  });

  it('does not submit when field is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentInput canWrite onSubmit={onSubmit} />);
    await user.click(screen.getByText('send'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/event-detail/ui/CommentInput.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `CommentInput.module.css`**

```css
.form {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 12px;
  margin-top: 12px;
}

.field {
  flex: 1;
}

.locked {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 12px;
  margin-top: 12px;
  font-size: 0.85rem;
  opacity: 0.7;
  text-align: center;
}
```

- [ ] **Step 4: Write `CommentInput.tsx`**

```tsx
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import styles from './CommentInput.module.css';

interface CommentInputProps {
  canWrite: boolean;
  onSubmit: (body: string) => void;
  isSubmitting?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({ canWrite, onSubmit, isSubmitting = false }) => {
  const t = useTranslations('EventComments');
  const [value, setValue] = useState('');

  if (!canWrite) {
    return <p className={styles.locked}>{t('lockedPrompt')}</p>;
  }

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('placeholder')}
          rows={2}
          maxLength={2000}
        />
      </div>
      <Button type="submit" size="sm" variant="primary" isLoading={isSubmitting}>
        {t('send')}
      </Button>
    </form>
  );
};
```

> **Implementer note:** Per project convention React 19 uses `React.SubmitEvent`, not `React.FormEvent`. If the shared `Textarea` does not forward `onChange`/`value` as a native textarea, adjust to its actual API (check `src/shared/ui/Textarea`).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/event-detail/ui/CommentInput.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/event-detail/ui/CommentInput.tsx src/features/event-detail/ui/CommentInput.module.css src/features/event-detail/ui/CommentInput.test.tsx
git commit -m "feat(event-detail): add CommentInput component"
```

---

## Task 15: `CommentsTab` component

**Files:**
- Create: `src/features/event-detail/ui/CommentsTab.tsx`
- Create: `src/features/event-detail/ui/CommentsTab.module.css`
- Test: `src/features/event-detail/ui/CommentsTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentsTab } from './CommentsTab';
import {
  useGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from '@/entities/comment';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/entities/comment', () => ({
  useGetCommentsQuery: vi.fn(),
  useAddCommentMutation: vi.fn(),
  useUpdateCommentMutation: vi.fn(),
  useDeleteCommentMutation: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  const unwrap = () => ({ unwrap: () => Promise.resolve({}) });
  vi.mocked(useAddCommentMutation).mockReturnValue([vi.fn(unwrap), {}] as never);
  vi.mocked(useUpdateCommentMutation).mockReturnValue([vi.fn(unwrap), {}] as never);
  vi.mocked(useDeleteCommentMutation).mockReturnValue([vi.fn(unwrap), {}] as never);
});

describe('CommentsTab', () => {
  it('renders empty state when there are no comments', () => {
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite currentUserId="u1" />);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('renders the input when canWrite is true', () => {
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite currentUserId="u1" />);
    expect(screen.getByText('send')).toBeInTheDocument();
  });

  it('renders the locked prompt when canWrite is false', () => {
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite={false} currentUserId="u1" />);
    expect(screen.getByText('lockedPrompt')).toBeInTheDocument();
  });

  it('renders a list of comments', () => {
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [
      { id: 'c1', eventId: 'e1', userId: 'u2', body: 'First!', createdAt: 't', updatedAt: 't', profile: { fullName: 'Bob', avatarUrl: null } },
    ], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite currentUserId="u1" />);
    expect(screen.getByText('First!')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/event-detail/ui/CommentsTab.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `CommentsTab.module.css`**

```css
.container {
  display: flex;
  flex-direction: column;
}

.list {
  display: flex;
  flex-direction: column;
  max-height: 420px;
  overflow-y: auto;
}

.empty {
  font-size: 0.85rem;
  opacity: 0.6;
  padding: 16px 0;
  text-align: center;
}
```

- [ ] **Step 4: Write `CommentsTab.tsx`**

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  useGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from '@/entities/comment';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import styles from './CommentsTab.module.css';

interface CommentsTabProps {
  eventId: string;
  canWrite: boolean;
  currentUserId: string;
}

export const CommentsTab: React.FC<CommentsTabProps> = ({ eventId, canWrite, currentUserId }) => {
  const t = useTranslations('EventComments');
  const { data: comments = [], isLoading } = useGetCommentsQuery(eventId, {
    pollingInterval: 60_000,
    refetchOnFocus: true,
    skipPollingIfUnfocused: true,
  });
  const [addComment, { isLoading: isAdding }] = useAddCommentMutation();
  const [updateComment] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comments.length]);

  const handleAdd = async (body: string) => {
    try {
      await addComment({ eventId, body }).unwrap();
    } catch {
      toast.error(t('sendError'));
    }
  };

  const handleUpdate = async (commentId: string, body: string) => {
    try {
      await updateComment({ eventId, commentId, body }).unwrap();
    } catch {
      toast.error(t('updateError'));
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment({ eventId, commentId }).unwrap();
    } catch {
      toast.error(t('deleteError'));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.list} ref={listRef}>
        {!isLoading && comments.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            isOwn={c.userId === currentUserId}
            onSave={(body) => handleUpdate(c.id, body)}
            onDelete={() => handleDelete(c.id)}
          />
        ))}
      </div>
      <CommentInput canWrite={canWrite} onSubmit={handleAdd} isSubmitting={isAdding} />
    </div>
  );
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/event-detail/ui/CommentsTab.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/event-detail/ui/CommentsTab.tsx src/features/event-detail/ui/CommentsTab.module.css src/features/event-detail/ui/CommentsTab.test.tsx
git commit -m "feat(event-detail): add CommentsTab component"
```

---

## Task 16: `EventTabs` switcher

**Files:**
- Create: `src/features/event-detail/ui/EventTabs.tsx`
- Create: `src/features/event-detail/ui/EventTabs.module.css`

- [ ] **Step 1: Write `EventTabs.module.css`**

```css
.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.tab {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tabActive {
  background: rgba(255, 255, 255, 0.16);
  font-weight: 600;
}
```

- [ ] **Step 2: Write `EventTabs.tsx`**

```tsx
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './EventTabs.module.css';

interface EventTabsProps {
  participants: React.ReactNode;
  comments: React.ReactNode;
}

export const EventTabs: React.FC<EventTabsProps> = ({ participants, comments }) => {
  const t = useTranslations('EventComments');
  const [active, setActive] = useState<'participants' | 'comments'>('participants');

  return (
    <div>
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={active === 'participants'}
          className={`${styles.tab} ${active === 'participants' ? styles.tabActive : ''}`}
          onClick={() => setActive('participants')}
        >
          {t('tabParticipants')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === 'comments'}
          className={`${styles.tab} ${active === 'comments' ? styles.tabActive : ''}`}
          onClick={() => setActive('comments')}
        >
          {t('tabComments')}
        </button>
      </div>
      {active === 'participants' ? participants : comments}
    </div>
  );
};
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/event-detail/ui/EventTabs.tsx src/features/event-detail/ui/EventTabs.module.css
git commit -m "feat(event-detail): add EventTabs switcher"
```

---

## Task 17: Integrate tabs into `EventDetailContent`

**Files:**
- Modify: `src/features/event-detail/ui/EventDetailContent.tsx`

- [ ] **Step 1: Add imports**

After the existing local UI imports (near line 27-28), add:

```tsx
import { CommentsTab } from './CommentsTab';
import { EventTabs } from './EventTabs';
```

- [ ] **Step 2: Compute comment permissions**

After the `canAddSelf` declaration (currently line 73), add:

```tsx
  const currentUserStatus = participants.find((p) => p.user_id === currentUserId)?.status;
  const canReadComments =
    isCreator || currentUserStatus === 'pending' || currentUserStatus === 'confirmed';
  const canWriteComments = isCreator || currentUserStatus === 'confirmed';
```

- [ ] **Step 3: Extract the participants block and wrap it in tabs**

In the right column (`<div className={styles.column}>` starting at line 214), the participants UI currently spans the `participants` label through the participant list (lines 252-289). Replace that span — from the `<span className={styles.label}>` participants label down to the end of the participants list block — with a `participantsBlock` variable rendered through `EventTabs` when comments are readable.

Define the block just before the `return` (alongside the other derived values):

```tsx
  const participantsBlock = (
    <>
      <span className={styles.label}>
        {t('participants')}{!isParticipantsLoading && ` (${participants.length})`}
      </span>

      {canAddSelf && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={styles.addSelfButton}
          onClick={handleAddSelf}
          isLoading={isAddingSelf}
        >
          {t('addSelf')}
        </Button>
      )}

      {isParticipantsLoading && <div className={styles.skeleton} />}

      {!isParticipantsLoading && participants.length === 0 && (
        <p className={styles.empty}>{t('noParticipants')}</p>
      )}

      {!isParticipantsLoading && participants.length > 0 && (
        <div className={styles.participantList}>
          {participants.map((p) => (
            <ParticipantItem
              key={p.id}
              participant={p}
              isCurrentUser={p.user_id === currentUserId}
              onConfirm={handleConfirm}
              onDecline={handleDecline}
              isConfirming={statusAction === 'confirmed'}
              isDeclining={statusAction === 'declined'}
            />
          ))}
        </div>
      )}
    </>
  );
```

Then, in the JSX, replace the original participants span/list region (lines 252-289) with:

```tsx
          {canReadComments ? (
            <EventTabs
              participants={participantsBlock}
              comments={<CommentsTab eventId={eventId} canWrite={canWriteComments} currentUserId={currentUserId} />}
            />
          ) : (
            participantsBlock
          )}
```

Leave the requests group, apply button, and `requestSent` badge above this region untouched.

- [ ] **Step 4: Run the existing event-detail tests**

Run: `npx vitest run src/features/event-detail`
Expected: PASS (existing `EventDetailContent.test.tsx` still green — it mocks `@/entities/event` and `../api/detailApi`; `CommentsTab` only renders when `canReadComments`, which is false for its default empty participants/no-creator fixture, so no new mocks are required).

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/event-detail/ui/EventDetailContent.tsx
git commit -m "feat(event-detail): show comments in Participants/Comments tabs"
```

---

## Task 18: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 2: Type-check, lint, FSD lint, build**

Run: `npx tsc --noEmit && npm run lint && pnpm lint:fsd`
Expected: clean. (If `pnpm` is unavailable, run the equivalent `npx steiger ./src` per `package.json`.)

- [ ] **Step 3: Production build sanity check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual DB step reminder**

The implementer must remind the user to apply `supabase/migrations/20260605000000_event_comments.sql` in the Supabase SQL editor before the feature works end-to-end.

---

## Notes & Edge Cases

- **Access gating is enforced by RLS**, not the route handlers — reads return only rows the caller may see; writes are rejected by policy. Route handlers add `requireUser` only to return a clean 401 for mutations.
- **Tab visibility** is decided client-side from already-fetched participants data (`canReadComments`). A non-reader never sees the Comments tab; even if they hit the API directly, RLS returns nothing / rejects.
- **Creator without a participant row** still reads and writes (RLS `events.created_by` branch + `canReadComments`/`canWriteComments` include `isCreator`).
- **`declined` participants**: `canReadComments` is false for them, so no tab; RLS also excludes them.
- **No optimistic updates**: mutations invalidate `Comment/LIST-<eventId>` → refetch (mirrors the notifications pattern).
- **Polling**: only the `CommentsTab` query polls (60s), pauses when the tab/window is unfocused, and refetches on refocus — identical to `NotificationBell`.
