# Direct Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 1:1 direct messaging to `/guild-chat` — a left conversation list (pinned guild chat on top, DMs below) and a right active thread, at full feature parity with the existing guild chat.

**Architecture:** Mirror the existing `entities/guild-message` slice into a new `entities/direct-message` slice (RTK Query on `baseApi`, Supabase via route handlers, realtime via Postgres Changes). Refactor `widgets/guild-chat` → `widgets/chat`, extracting a shared `ChatThread` presentational base reused by `GuildThread` and `DirectThread`, composed by a new `ChatPage` with a `ConversationList`.

**Tech Stack:** Next.js 16 (App Router), React 19, Redux Toolkit + RTK Query, Supabase (Postgres + RLS + Realtime), CSS Modules, next-intl, vitest.

## Global Constraints

- FSD layer order `app → widgets → features → entities → shared`; import only from strictly lower layers; slices imported via `index.ts` barrels only.
- All server data via RTK Query `injectEndpoints` on `baseApi` (`src/shared/api/baseApi.ts`); Supabase calls live in route handlers / entity `api/` functions, never in client components.
- Route handler auth: pure reads rely on RLS; mutations gate with `requireUser()` from `src/shared/api/guildAuth.ts`. No redundant role checks — DM access is enforced by RLS (`users_share_guild`).
- Supabase server client uses `getAll`/`setAll` cookie methods only.
- i18n: every user-facing string via next-intl; keys in BOTH `messages/en.json` and `messages/ru.json` at full parity; new client namespaces registered in `requiredNamespaces` (`src/app/layout.tsx`).
- Styling: CSS Modules only, no inline styles; adhere to `docs/design-system.md`. `backdrop-filter`/`appearance` keep `-webkit-` prefix; standard props unprefixed.
- `React.FormEvent` is deprecated — use `React.SubmitEvent` for submit handlers.
- Supabase migrations: no CLI — apply DDL via Supabase MCP (`apply_migration`) and hand-edit `src/shared/api/supabase/types.ts`.
- Message length limit: 2000 chars (reuse `MAX_MESSAGE_LENGTH`).
- Baseline `tsc`/`lint:fsd` already have known pre-existing failures on master (3 tsc errors, 2 insignificant-slice) — ignore those, ensure no NEW ones.
- `peerId` in DM URLs and API routes is the peer's **`public_id`** (resolved to uuid server-side).

---

## Phase 1 — Database

### Task 1: Schema, RLS, realtime, helper function

**Files:**
- DB: applied via Supabase MCP `apply_migration` (name `direct_messages`)
- Modify: `src/shared/api/supabase/types.ts` (hand-add new tables + function)

**Interfaces:**
- Produces tables `direct_messages`, `direct_message_reads`; function `users_share_guild(a uuid, b uuid) returns boolean`.

- [ ] **Step 1: Inspect current schema**

Use Supabase MCP `list_tables` to confirm `guild_members` columns (`user_id`, `guild_id`, `status`, `role`) and `profiles.id`. Confirm `guild_message_reads` shape to mirror.

- [ ] **Step 2: Apply migration**

Use Supabase MCP `apply_migration` with name `direct_messages` and this SQL:

```sql
-- Messages
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index direct_messages_sender_recipient_idx
  on public.direct_messages (sender_id, recipient_id, created_at);
create index direct_messages_recipient_sender_idx
  on public.direct_messages (recipient_id, sender_id, created_at);

-- Read state (mirror of guild_message_reads)
create table public.direct_message_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  peer_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique (user_id, peer_id)
);

-- Shared-guild helper
create or replace function public.users_share_guild(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from guild_members ma
    join guild_members mb
      on ma.guild_id = mb.guild_id
    where ma.user_id = a and ma.status = 'ACCEPTED'
      and mb.user_id = b and mb.status = 'ACCEPTED'
  );
$$;
revoke execute on function public.users_share_guild(uuid, uuid) from anon;
grant execute on function public.users_share_guild(uuid, uuid) to authenticated;

-- RLS
alter table public.direct_messages enable row level security;
alter table public.direct_message_reads enable row level security;

create policy "dm_select" on public.direct_messages for select
  using (
    (auth.uid() = sender_id or auth.uid() = recipient_id)
    and public.users_share_guild(sender_id, recipient_id)
  );
create policy "dm_insert" on public.direct_messages for insert
  with check (
    auth.uid() = sender_id
    and public.users_share_guild(sender_id, recipient_id)
  );
create policy "dm_update" on public.direct_messages for update
  using (auth.uid() = sender_id) with check (auth.uid() = sender_id);
create policy "dm_delete" on public.direct_messages for delete
  using (auth.uid() = sender_id);

create policy "dmr_select" on public.direct_message_reads for select
  using (auth.uid() = user_id);
create policy "dmr_insert" on public.direct_message_reads for insert
  with check (auth.uid() = user_id);
create policy "dmr_update" on public.direct_message_reads for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime
alter table public.direct_messages replica identity full;
alter publication supabase_realtime add table public.direct_messages;
```

- [ ] **Step 3: Verify**

Use Supabase MCP `execute_sql`: `select * from pg_policies where tablename in ('direct_messages','direct_message_reads');` — expect 7 policies. Run `get_advisors` (security) and confirm no new RLS-disabled warnings.

- [ ] **Step 4: Hand-edit Supabase types**

In `src/shared/api/supabase/types.ts`, add `direct_messages` and `direct_message_reads` to `Tables` (Row/Insert/Update) and `users_share_guild` to `Functions`, following the shape of the existing `guild_messages` / `guild_message_reads` entries. Match column names and nullability exactly.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat(db): direct_messages + reads tables, RLS, realtime, users_share_guild"
```

---

## Phase 2 — Entity `direct-message` (data layer)

All entity api functions mirror `entities/guild-message`. Tests use the existing `@/shared/lib/test/supabaseMock` (`query`, `mockClient`).

### Task 2: Types + row mapper

**Files:**
- Create: `src/entities/direct-message/model/types.ts`
- Create: `src/entities/direct-message/api/mapDmRow.ts`
- Test: `src/entities/direct-message/api/mapDmRow.test.ts`

**Interfaces:**
- Produces: `DirectMessage`, `DmConversation` (types); `DM_SELECT` (string), `mapDmRow(row): DirectMessage`.

- [ ] **Step 1: Write types**

`src/entities/direct-message/model/types.ts`:

```ts
export interface DmProfile {
  publicId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  alias: string | null;
  displayAsAlias: boolean;
  icon: string | null;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  senderProfile: DmProfile;
}

export interface DmConversation {
  peer: DmProfile & { id: string; lastSeenAt: string | null };
  lastMessage: { body: string; attachmentUrl: string | null; createdAt: string; senderIsMe: boolean };
  hasUnread: boolean;
}
```

- [ ] **Step 2: Write failing mapper test**

`src/entities/direct-message/api/mapDmRow.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mapDmRow } from './mapDmRow';

describe('mapDmRow', () => {
  it('maps a row with sender profile', () => {
    const result = mapDmRow({
      id: 'm1', sender_id: 'u1', recipient_id: 'u2', body: 'hi',
      attachment_url: null, created_at: 't', updated_at: 't',
      sender: { public_id: 'p1', full_name: 'Me', avatar_url: null, alias: null, display_as_alias: false, icon: null },
    });
    expect(result.id).toBe('m1');
    expect(result.senderProfile.fullName).toBe('Me');
    expect(result.senderProfile.displayAsAlias).toBe(false);
  });

  it('defaults missing sender profile fields', () => {
    const result = mapDmRow({
      id: 'm2', sender_id: 'u1', recipient_id: 'u2', body: 'x',
      attachment_url: null, created_at: 't', updated_at: 't', sender: null,
    });
    expect(result.senderProfile.publicId).toBeNull();
    expect(result.senderProfile.displayAsAlias).toBe(false);
  });
});
```

- [ ] **Step 2b: Run test, expect FAIL** — `pnpm test:run src/entities/direct-message/api/mapDmRow.test.ts` → fails (module not found).

- [ ] **Step 3: Implement mapper**

`src/entities/direct-message/api/mapDmRow.ts`:

```ts
import type { DirectMessage } from '../model/types';

// Aliased FK so the joined profile is the SENDER (sender_id -> profiles).
export const DM_SELECT =
  'id, sender_id, recipient_id, body, attachment_url, created_at, updated_at, sender:profiles!direct_messages_sender_id_fkey(public_id, full_name, avatar_url, alias, display_as_alias, icon)';

interface DmRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  sender: { public_id: string | null; full_name: string | null; avatar_url: string | null; alias: string | null; display_as_alias: boolean | null; icon: string | null } | null;
}

export const mapDmRow = (row: DmRow): DirectMessage => ({
  id: row.id,
  senderId: row.sender_id,
  recipientId: row.recipient_id,
  body: row.body,
  attachmentUrl: row.attachment_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  senderProfile: {
    publicId: row.sender?.public_id ?? null,
    fullName: row.sender?.full_name ?? null,
    avatarUrl: row.sender?.avatar_url ?? null,
    alias: row.sender?.alias ?? null,
    displayAsAlias: row.sender?.display_as_alias ?? false,
    icon: row.sender?.icon ?? null,
  },
});
```

> Note: confirm the FK constraint name via `execute_sql: select conname from pg_constraint where conrelid='public.direct_messages'::regclass and contype='f';`. If it differs from `direct_messages_sender_id_fkey`, update `DM_SELECT`.

- [ ] **Step 4: Run test, expect PASS.**

- [ ] **Step 5: Commit** — `git commit -m "feat(direct-message): types + row mapper"`

### Task 3: Peer resolution helper

**Files:**
- Create: `src/entities/direct-message/api/resolvePeer.ts`
- Test: `src/entities/direct-message/api/resolvePeer.test.ts`

**Interfaces:**
- Consumes: Supabase server client.
- Produces: `resolvePeerId(publicId: string): Promise<string>` (peer uuid; throws `PeerNotFoundError` if missing). `PeerNotFoundError` class.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePeerId, PeerNotFoundError } from './resolvePeer';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

describe('resolvePeerId', () => {
  it('returns the uuid for a public_id', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: { id: 'u2' } }));
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as never);
    await expect(resolvePeerId('p2')).resolves.toBe('u2');
  });

  it('throws when not found', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: null }));
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as never);
    await expect(resolvePeerId('nope')).rejects.toBeInstanceOf(PeerNotFoundError);
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement**

```ts
import { createClient } from '@/shared/api/supabase/server';

export class PeerNotFoundError extends Error {}

/** Resolves a peer profile `public_id` to its uuid. */
export const resolvePeerId = async (publicId: string): Promise<string> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('public_id', publicId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PeerNotFoundError('Peer not found');
  return data.id;
};
```

- [ ] **Step 4: Run, expect PASS. Step 5: Commit** — `git commit -m "feat(direct-message): resolvePeerId helper"`

### Task 4: Read functions — getDirectMessages

**Files:**
- Create: `src/entities/direct-message/api/getDirectMessages.ts`
- Test: `src/entities/direct-message/api/getDirectMessages.test.ts`

**Interfaces:**
- Consumes: `DM_SELECT`, `mapDmRow`.
- Produces: `DirectMessagesPage { messages: DirectMessage[]; hasMore: boolean }`; `getDirectMessages(peerId: string, opts?: { limit?; before?; after? }): Promise<DirectMessagesPage>`. `peerId` is the peer **uuid** here (route resolves publicId first).

- [ ] **Step 1: Failing test** (mirror `getGuildMessages.test.ts` shape; assert `after` mode returns `hasMore:false`, default mode reverses & probes `limit+1`).

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDirectMessages } from './getDirectMessages';
import { createClient } from '@/shared/api/supabase/server';
import { mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const row = (id: string) => ({ id, sender_id: 'u2', recipient_id: 'u1', body: id, attachment_url: null, created_at: id, updated_at: id, sender: null });

// Builds a thenable query stub capturing the final resolved data.
const qStub = (data: unknown[]) => {
  const stub: Record<string, unknown> = {};
  for (const m of ['select','or','lt','gt','order','limit']) stub[m] = vi.fn(() => stub);
  (stub as { then: unknown }).then = (res: (v: unknown) => unknown) => res({ data, error: null });
  return stub;
};

describe('getDirectMessages', () => {
  it('default mode returns newest page ascending with hasMore probe', async () => {
    const from = vi.fn(() => qStub([row('c'), row('b'), row('a')])); // desc from DB
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as never);
    const page = await getDirectMessages('u2', { limit: 2 });
    expect(page.hasMore).toBe(true);
    expect(page.messages.map((m) => m.id)).toEqual(['b', 'c']); // sliced 2 then reversed
  });

  it('after mode returns ascending delta, hasMore false', async () => {
    const from = vi.fn(() => qStub([row('a'), row('b')]));
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as never);
    const page = await getDirectMessages('u2', { after: 'a' });
    expect(page.hasMore).toBe(false);
    expect(page.messages.map((m) => m.id)).toEqual(['a', 'b']);
  });
});
```

> If `qStub` doesn't fit the existing mock util, follow the exact pattern used in `getGuildMessages.test.ts` instead. Read that file first.

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** (uses the authed user id for the pair filter):

```ts
import { createClient } from '@/shared/api/supabase/server';
import type { DirectMessage } from '../model/types';
import { DM_SELECT, mapDmRow } from './mapDmRow';

export interface DirectMessagesPage {
  messages: DirectMessage[];
  hasMore: boolean;
}

interface FetchOpts { limit?: number; before?: string; after?: string }

/** Cursor-paginated DM thread reads between the current user and `peerId` (uuid). */
export const getDirectMessages = async (
  peerId: string,
  { limit = 50, before, after }: FetchOpts = {},
): Promise<DirectMessagesPage> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const pair = `and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`;

  if (after) {
    const { data, error } = await supabase
      .from('direct_messages')
      .select(DM_SELECT)
      .or(pair)
      .gt('created_at', after)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { messages: (data ?? []).map(mapDmRow), hasMore: false };
  }

  let q = supabase.from('direct_messages').select(DM_SELECT).or(pair);
  if (before) q = q.lt('created_at', before);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit + 1);
  if (error) throw error;

  const rows = (data ?? []).map(mapDmRow);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return { messages: page.reverse(), hasMore };
};
```

- [ ] **Step 4: Run, expect PASS. Step 5: Commit** — `git commit -m "feat(direct-message): getDirectMessages"`

### Task 5: create / update / delete

**Files:**
- Create: `src/entities/direct-message/api/createDirectMessage.ts` (+ `.test.ts`)
- Create: `src/entities/direct-message/api/updateDirectMessage.ts` (+ `.test.ts`)
- Create: `src/entities/direct-message/api/deleteDirectMessage.ts` (+ `.test.ts`)

**Interfaces:**
- Produces: `createDirectMessage(peerId, body, attachmentUrl?) : Promise<DirectMessage>`; `InvalidDirectMessageError`; `MAX_DM_LENGTH = 2000`; `updateDirectMessage(messageId, body): Promise<DirectMessage>`; `deleteDirectMessage(messageId): Promise<void>`. `peerId` = peer uuid.

- [ ] **Step 1: createDirectMessage failing test** (mirror `createGuildMessage.test.ts`: not-authenticated, empty body, over-length, happy path inserting `{ sender_id, recipient_id, body, attachment_url }`).

- [ ] **Step 2: Run FAIL. Step 3: Implement:**

```ts
import { createClient } from '@/shared/api/supabase/server';
import type { DirectMessage } from '../model/types';
import { DM_SELECT, mapDmRow } from './mapDmRow';

export const MAX_DM_LENGTH = 2000;
export class InvalidDirectMessageError extends Error {}

export const createDirectMessage = async (
  peerId: string,
  body: string,
  attachmentUrl?: string | null,
): Promise<DirectMessage> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed && !attachmentUrl) throw new InvalidDirectMessageError('Message is empty');
  if (trimmed.length > MAX_DM_LENGTH) throw new InvalidDirectMessageError('Message is too long');

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({ sender_id: user.id, recipient_id: peerId, body: trimmed, attachment_url: attachmentUrl ?? null })
    .select(DM_SELECT)
    .single();
  if (error) throw error;
  if (!data) throw new Error('Failed to create message');
  return mapDmRow(data);
};
```

- [ ] **Step 4: Run PASS. Step 5: Commit.**

- [ ] **Step 6: updateDirectMessage** — test + implement (mirror `updateGuildMessage.ts`, reuse `InvalidDirectMessageError`/`MAX_DM_LENGTH`, `.eq('id', messageId)` update of `body` + `updated_at`, return `mapDmRow`). RLS ensures only the sender can update. Run, commit.

- [ ] **Step 7: deleteDirectMessage** — test + implement (mirror `deleteGuildMessage.ts`: read `attachment_url` from `direct_messages`, delete by id, best-effort `chat-attachments` file removal via `split('/chat-attachments/')[1]`). Run, commit.

### Task 6: read state — getDmReadState / markDmRead / getDmUnread

**Files:**
- Create: `src/entities/direct-message/api/getDmReadState.ts`
- Create: `src/entities/direct-message/api/markDmRead.ts`
- Create: `src/entities/direct-message/api/getDmUnread.ts` (+ `.test.ts`)

**Interfaces:**
- Produces: `getDmReadState(peerId): Promise<{ lastReadAt: string | null }>`; `markDmRead(peerId): Promise<void>`; `getDmUnread(): Promise<{ hasUnread: boolean }>` (aggregate over ALL peers).

- [ ] **Step 1: getDmReadState** (mirror `getGuildChatReadState.ts`, table `direct_message_reads`, `.eq('user_id', user.id).eq('peer_id', peerId)`). Commit.

- [ ] **Step 2: markDmRead** (mirror `markGuildChatRead.ts`, upsert `{ user_id, peer_id, last_read_at }` onConflict `user_id,peer_id`). Commit.

- [ ] **Step 3: getDmUnread failing test** — aggregate: true when any message addressed to me is newer than my read cursor for that peer. Implementation:

```ts
import { createClient } from '@/shared/api/supabase/server';

/**
 * Aggregate unread check for the sidebar dot: true when at least one DM where the
 * current user is the recipient is newer than that conversation's last_read_at.
 */
export const getDmUnread = async (): Promise<{ hasUnread: boolean }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // All read cursors for this user, keyed by peer.
  const { data: reads, error: readsError } = await supabase
    .from('direct_message_reads')
    .select('peer_id, last_read_at')
    .eq('user_id', user.id);
  if (readsError) throw readsError;
  const readByPeer = new Map((reads ?? []).map((r) => [r.peer_id, r.last_read_at]));

  // Newest incoming message per sender (small N; fetch recent inbound and reduce).
  const { data: rows, error } = await supabase
    .from('direct_messages')
    .select('sender_id, created_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const seen = new Set<string>();
  for (const r of rows ?? []) {
    if (seen.has(r.sender_id)) continue;
    seen.add(r.sender_id);
    const lastRead = readByPeer.get(r.sender_id);
    if (!lastRead || r.created_at > lastRead) return { hasUnread: true };
  }
  return { hasUnread: false };
};
```

Test: stub `direct_message_reads` then `direct_messages` results; assert true when newest inbound > cursor, false when ≤. Run, commit.

### Task 7: RTK Query API + entity barrel

**Files:**
- Create: `src/entities/direct-message/api/directMessageApi.ts`
- Create: `src/entities/direct-message/index.ts`
- Modify: `src/shared/api/baseApi.ts` (add tag types `DirectMessage`, `DmRead`)

**Interfaces:**
- Consumes: route handlers from Phase 3.
- Produces hooks: `useGetDirectMessagesQuery`, `useLazyFetchOlderDirectMessagesQuery`, `useLazyFetchNewDirectMessagesQuery`, `useAddDirectMessageMutation`, `useUpdateDirectMessageMutation`, `useDeleteDirectMessageMutation`, `useGetConversationsQuery`, `useGetDmReadStateQuery`, `useMarkDmReadMutation`, `useGetDmUnreadQuery`. `directMessageApi` (for `util.updateQueryData`). Also re-export `uploadChatAttachment` and types.

- [ ] **Step 1: Add tag types**

In `src/shared/api/baseApi.ts` `tagTypes` array, add `'DirectMessage'` and `'DmRead'`.

- [ ] **Step 2: Implement `directMessageApi.ts`**

Mirror `guildMessageApi.ts` exactly, keyed by `peerId` (publicId in URLs). Endpoints:
- `getDirectMessages: builder.query<DirectMessagesPage, string>` → `dm/${peerId}/messages?limit=50`, `providesTags: [{ type: 'DirectMessage', id: 'LIST-${peerId}' }]`.
- `fetchOlderDirectMessages` / `fetchNewDirectMessages` → mirror guild `fetchOlder/New` (keepUnusedDataFor 0; `onQueryStarted` unshift/append into `getDirectMessages` cache).
- `addDirectMessage: builder.mutation<DirectMessage, { peerId; body; attachmentUrl?; author?: { userId; profile: DmProfile } }>` → POST `dm/${peerId}/messages` body `{ body, attachmentUrl }`; optimistic bubble (build `DirectMessage` with `senderId: author.userId`, `recipientId` unknown at client → set `''`, `senderProfile: author.profile`), reconcile/rollback like guild. Also invalidate conversations: `invalidatesTags: [{ type: 'DirectMessage', id: 'CONVERSATIONS' }]`.
- `updateDirectMessage` / `deleteDirectMessage` → PATCH/DELETE `dm/${peerId}/messages/${messageId}`; patch `getDirectMessages` cache by id.
- `getConversations: builder.query<DmConversation[], void>` → `dm/conversations`, `providesTags: [{ type: 'DirectMessage', id: 'CONVERSATIONS' }]`.
- `getDmReadState: builder.query<{ lastReadAt: string | null }, string>` → `dm/${peerId}/read`, `providesTags: [{ type: 'DmRead', id: 'LIST-${peerId}' }]`.
- `markDmRead: builder.mutation<{ marked: boolean }, string>` → POST `dm/${peerId}/read`; optimistic `lastReadAt = now`; `invalidatesTags: [{ type: 'DmRead', id: 'LIST-${peerId}' }, { type: 'DmRead', id: 'UNREAD' }]`.
- `getDmUnread: builder.query<{ hasUnread: boolean }, void>` → `dm/unread`, `providesTags: [{ type: 'DmRead', id: 'UNREAD' }]`.

- [ ] **Step 3: Barrel `index.ts`**

```ts
export {
  directMessageApi,
  useGetDirectMessagesQuery,
  useLazyFetchOlderDirectMessagesQuery,
  useLazyFetchNewDirectMessagesQuery,
  useAddDirectMessageMutation,
  useUpdateDirectMessageMutation,
  useDeleteDirectMessageMutation,
  useGetConversationsQuery,
  useGetDmReadStateQuery,
  useMarkDmReadMutation,
  useGetDmUnreadQuery,
} from './api/directMessageApi';
export { uploadChatAttachment } from '@/entities/guild-message';
export type { DirectMessage, DmConversation, DmProfile } from './model/types';
```

> `uploadChatAttachment` re-export: importing from another entity's barrel is a same-layer import (forbidden by FSD). Instead, lift `uploadChatAttachment` to `shared`: create `src/shared/api/chatAttachments.ts` with the existing body, re-export it from both `entities/guild-message` and `entities/direct-message` barrels. Do this lift in this step and update `entities/guild-message/index.ts` + `GuildChat.tsx` import accordingly (keep the public `uploadChatAttachment` name).

- [ ] **Step 4: Typecheck** — `pnpm exec tsc --noEmit` (ignore the 3 known baseline errors; no NEW ones). **Step 5: Commit** — `git commit -m "feat(direct-message): RTK Query api, barrel, shared chatAttachments"`

---

## Phase 3 — API route handlers

### Task 8: DM message routes

**Files:**
- Create: `src/app/api/dm/[peerId]/messages/route.ts`
- Create: `src/app/api/dm/[peerId]/messages/[messageId]/route.ts`
- Create: `src/app/api/dm/[peerId]/messages/route.test.ts`

**Interfaces:**
- Consumes: `getDirectMessages`, `createDirectMessage`, `updateDirectMessage`, `deleteDirectMessage`, `resolvePeerId`, `requireUser`.

- [ ] **Step 1: GET/POST route** (`[peerId]` = publicId; resolve to uuid first):

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDirectMessages } from '@/entities/direct-message/api/getDirectMessages';
import { createDirectMessage, InvalidDirectMessageError } from '@/entities/direct-message/api/createDirectMessage';
import { resolvePeerId, PeerNotFoundError } from '@/entities/direct-message/api/resolvePeer';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ peerId: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { peerId } = await params;
    const uuid = await resolvePeerId(peerId);
    const { searchParams } = request.nextUrl;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const before = searchParams.get('before') ?? undefined;
    const after = searchParams.get('after') ?? undefined;
    const page = await getDirectMessages(uuid, { limit, before, after });
    return NextResponse.json(page);
  } catch (e) {
    if (e instanceof PeerNotFoundError) return NextResponse.json({ error: 'Peer not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ peerId: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { peerId } = await params;
    const uuid = await resolvePeerId(peerId);
    const { body, attachmentUrl } = await request.json();
    if (typeof body !== 'string') return NextResponse.json({ error: 'Invalid message body' }, { status: 400 });
    if (attachmentUrl != null && typeof attachmentUrl !== 'string') return NextResponse.json({ error: 'Invalid attachment' }, { status: 400 });
    const message = await createDirectMessage(uuid, body, attachmentUrl ?? null);
    return NextResponse.json(message, { status: 201 });
  } catch (e) {
    if (e instanceof PeerNotFoundError) return NextResponse.json({ error: 'Peer not found' }, { status: 404 });
    if (e instanceof InvalidDirectMessageError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
```

- [ ] **Step 2: [messageId] PATCH/DELETE route** — mirror `guilds/[id]/messages/[messageId]/route.ts` but params `{ peerId; messageId }`, calling `updateDirectMessage(messageId, body)` / `deleteDirectMessage(messageId)`. (peerId not needed for the op — RLS scopes by sender; still `requireUser`.)

- [ ] **Step 3: Route test** — mirror `guilds/[id]/messages/route.test.ts`: mock entity fns + `requireUser`, assert 401 unauth, 400 invalid body, 201 happy POST, 404 on `PeerNotFoundError`. Read the existing route.test.ts first for the mocking style.

- [ ] **Step 4: Run** `pnpm test:run src/app/api/dm` → PASS. **Step 5: Commit.**

### Task 9: DM read, unread, conversations routes

**Files:**
- Create: `src/app/api/dm/[peerId]/read/route.ts`
- Create: `src/app/api/dm/unread/route.ts`
- Create: `src/app/api/dm/conversations/route.ts`
- Create: `src/entities/direct-message/api/getConversations.ts` (+ `.test.ts`)

**Interfaces:**
- Produces: `getConversations(): Promise<DmConversation[]>`.

- [ ] **Step 1: read route** — mirror `guilds/[id]/messages/read/route.ts`: GET → `getDmReadState(resolvePeerId(peerId))`; POST → `markDmRead(uuid)`. Both behind `requireUser`. (Read state fns take uuid; resolve first.)

- [ ] **Step 2: getConversations implementation**

```ts
import { createClient } from '@/shared/api/supabase/server';
import type { DmConversation } from '../model/types';

/** Builds the conversation list for the current user: newest message per peer,
 *  peer profile + presence, and an unread flag from direct_message_reads. */
export const getConversations = async (): Promise<DmConversation[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // All messages in either direction, newest first (bounded window).
  const { data: rows, error } = await supabase
    .from('direct_messages')
    .select('id, sender_id, recipient_id, body, attachment_url, created_at')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;

  // Reduce to the newest message per peer.
  const byPeer = new Map<string, { last: typeof rows[number] }>();
  for (const r of rows ?? []) {
    const peer = r.sender_id === user.id ? r.recipient_id : r.sender_id;
    if (!byPeer.has(peer)) byPeer.set(peer, { last: r });
  }
  const peerIds = [...byPeer.keys()];
  if (peerIds.length === 0) return [];

  const [{ data: profiles }, { data: reads }] = await Promise.all([
    supabase.from('profiles')
      .select('id, public_id, full_name, avatar_url, alias, display_as_alias, icon, last_seen_at')
      .in('id', peerIds),
    supabase.from('direct_message_reads')
      .select('peer_id, last_read_at').eq('user_id', user.id).in('peer_id', peerIds),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const readByPeer = new Map((reads ?? []).map((r) => [r.peer_id, r.last_read_at]));

  return peerIds.map((peerId) => {
    const { last } = byPeer.get(peerId)!;
    const p = profileById.get(peerId);
    const lastRead = readByPeer.get(peerId);
    const senderIsMe = last.sender_id === user.id;
    const hasUnread = !senderIsMe && (!lastRead || last.created_at > lastRead);
    return {
      peer: {
        id: peerId,
        publicId: p?.public_id ?? null,
        fullName: p?.full_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
        alias: p?.alias ?? null,
        displayAsAlias: p?.display_as_alias ?? false,
        icon: p?.icon ?? null,
        lastSeenAt: p?.last_seen_at ?? null,
      },
      lastMessage: { body: last.body, attachmentUrl: last.attachment_url, createdAt: last.created_at, senderIsMe },
      hasUnread,
    };
  });
};
```

Test: stub the three queries; assert newest-per-peer reduction, `senderIsMe`, and `hasUnread` logic.

- [ ] **Step 3: conversations + unread routes** — `dm/conversations/route.ts` GET behind `requireUser` → `getConversations()`; `dm/unread/route.ts` GET behind `requireUser` → `getDmUnread()`. Mirror the unread guild route shape.

- [ ] **Step 4: Run** `pnpm test:run src/entities/direct-message` → PASS. **Step 5: Commit.**

---

## Phase 4 — Widget refactor: `guild-chat` → `chat`, extract `ChatThread`

### Task 10: Rename slice and extract ChatThread base

**Files:**
- Rename dir: `src/widgets/guild-chat` → `src/widgets/chat` (`git mv`)
- Create: `src/widgets/chat/ui/ChatThread.tsx` (+ `ChatThread.module.css`)
- Modify: `src/widgets/chat/ui/GuildChat.tsx` → split into `GuildThread.tsx`
- Modify: `src/widgets/chat/index.ts`
- Modify: `src/app/guild-chat/page.tsx` (import path)
- Modify: `src/widgets/chat/ui/GuildChat.test.tsx`

**Interfaces:**
- Produces: `ChatThread` — presentational message list + composer. Props:
```ts
interface ChatThreadProps {
  messages: { id; userId; body; attachmentUrl; createdAt; updatedAt; profile: DmProfile }[];
  currentUserId?: string;
  isLoading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  onLoadOlder: (beforeIso: string) => void;
  onSubmit: (body: string, file?: File | null) => Promise<void>;
  onEdit: (id: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isSubmitting: boolean;
  deletingId?: string | null;
  canWrite: boolean;
  header?: React.ReactNode;          // guild dropdown OR peer presence header
  labels: ChatThreadLabels;          // all i18n strings passed in
  locale: string;
}
```
`ChatThread` owns: scroll-anchor/prepend logic, day-dividers, `MessageBubble` rendering, `MessageComposer`, edit state, lightbox labels. The `profile` shape is normalized to `DmProfile` (publicId/fullName/avatarUrl/alias/displayAsAlias/icon) so both guild and direct messages fit.

- [ ] **Step 1: `git mv src/widgets/guild-chat src/widgets/chat`** and update the import in `src/app/guild-chat/page.tsx` and `src/widgets/chat/index.ts`. Run `pnpm exec tsc --noEmit` to confirm only path issues fixed. Commit `refactor(chat): rename guild-chat widget to chat`.

- [ ] **Step 2: Extract `ChatThread.tsx`** — move the message-list + composer + scroll/prepend/day-divider/edit-state/lightbox JSX out of `GuildChat.tsx` into `ChatThread` (props above). Keep CSS in a new `ChatThread.module.css` (move the relevant rules from `GuildChat.module.css`). No behavior change.

- [ ] **Step 3: Create `GuildThread.tsx`** — the data/realtime container (everything currently in `GuildChat.tsx`: guild selection dropdown, RTK hooks, realtime subscription, mark-read), rendering `<ChatThread header={<GuildSelect .../>} ... />`. Map `GuildMessage` → ChatThread's message shape (`profile` already matches). Keep `GuildChat` as a thin re-export or rename usages.

- [ ] **Step 4: Update `GuildChat.test.tsx`** to target the new structure (likely render `GuildThread`); keep assertions (renders messages, sends, etc.). Run `pnpm test:run src/widgets/chat` → PASS.

- [ ] **Step 5: Typecheck + commit** `refactor(chat): extract ChatThread base from GuildChat`.

---

## Phase 5 — DirectThread, ConversationList, ChatPage

### Task 11: DirectThread

**Files:**
- Create: `src/widgets/chat/ui/DirectThread.tsx`

**Interfaces:**
- Consumes: `useGetDirectMessagesQuery`, lazy older/new, `useAddDirectMessageMutation`, update/delete, `useGetDmReadStateQuery`, `useMarkDmReadMutation`, `directMessageApi`, `uploadChatAttachment`, `ChatThread`, `resolveDisplayName`, `isOnline`/`ProfileStatus`-style presence.
- Produces: `<DirectThread peerPublicId peer viewerProfile userId />`.

- [ ] **Step 1: Implement** mirroring `GuildThread` but keyed by `peerPublicId`:
  - RTK: `useGetDirectMessagesQuery(peerPublicId)`, lazy older (`before`), lazy new (`after`), add/update/delete, read state + markRead.
  - Map `DirectMessage` → ChatThread message shape: `{ id, userId: senderId, body, attachmentUrl, createdAt, updatedAt, profile: senderProfile }`.
  - `header` = peer avatar + `resolveDisplayName(peer)` + presence line (reuse the presence rule: online if `dayjs().diff(peer.lastSeenAt,'minute') < 5`, else `Last seen …`). Strings via i18n.
  - Optimistic send passes `author: { userId, profile: viewerProfile }`.
  - Realtime: subscribe to `direct_messages` filtered `recipient_id=eq.${userId}`; in the INSERT handler, ignore rows whose `sender_id !== peer.id`; otherwise `fetchNew({ peerId: peerPublicId, after: last?.createdAt })`. Also subscribe a second handler filtered `sender_id=eq.${userId}` is NOT needed (own sends are handled optimistically). UPDATE/DELETE: patch `getDirectMessages` cache (guard `sender_id`/peer match). Set realtime auth token exactly as `GuildThread` does.
  - mark-read effect identical to guild (when there are inbound unread messages).

- [ ] **Step 2: Typecheck. Step 3: Commit** `feat(chat): DirectThread`.

### Task 12: ConversationList + ConversationItem

**Files:**
- Create: `src/widgets/chat/ui/ConversationList.tsx`
- Create: `src/widgets/chat/ui/ConversationItem.tsx`
- Create: `src/widgets/chat/ui/ConversationList.module.css`

**Interfaces:**
- Consumes: `useGetConversationsQuery`, `useGetGuildChatUnreadQuery`, `UserAvatar`, `resolveDisplayName`, presence rule.
- Produces: `<ConversationList activePeerId guildSelected onSelectGuild onSelectPeer guildUnread />`.

- [ ] **Step 1: ConversationItem** — avatar, display name, last-message preview (prefix `You: ` when `senderIsMe`; show 📎/attachment label when body empty + attachmentUrl), relative time, unread dot, online dot (presence rule). All strings i18n.

- [ ] **Step 2: ConversationList** — pinned "Guild chat" row at top (icon + label + unread dot from `getGuildChatUnread`), active when no peer selected; below, `getConversations()` rows sorted by `lastMessage.createdAt` desc; empty hint when none. Selecting calls `onSelectGuild` / `onSelectPeer(publicId)`.

- [ ] **Step 3: Typecheck. Step 4: Commit** `feat(chat): ConversationList + ConversationItem`.

### Task 13: ChatPage orchestrator + URL wiring + page

**Files:**
- Create: `src/widgets/chat/ui/ChatPage.tsx` (+ `ChatPage.module.css`)
- Modify: `src/widgets/chat/index.ts` (export `ChatPage`)
- Modify: `src/app/guild-chat/page.tsx` (render `ChatPage`, pass guilds/viewerProfile, read `?dm`)
- Modify: `src/app/guild-chat/GuildChatPage.module.css` (two-column + mobile)

**Interfaces:**
- Consumes: `GuildThread`, `DirectThread`, `ConversationList`, `useSearchParams`/`useRouter`, `resolvePeerId` is server-side only — client resolves peer via conversations or a one-off fetch.
- Produces: `<ChatPage guilds userId viewerProfile initialGuildId initialDmPublicId? initialPeer? />`.

- [ ] **Step 1: ChatPage** — `'use client'`. Reads `?dm` from `useSearchParams`. Left: `<ConversationList activePeerId={dm} .../>`. Right: if `dm` → `<DirectThread peerPublicId={dm} peer={resolvedPeer} .../>` else `<GuildThread .../>`. Selecting list rows does `router.push('/guild-chat')` or `router.push('/guild-chat?dm=<publicId>')` (use `router.replace` + `scroll:false`).
  - Peer resolution for an empty thread not yet in conversations: ChatPage looks up the peer in `getConversations` data; if absent, falls back to `initialPeer` passed from the server page (which resolved the profile by publicId). If neither, show a lightweight loading/empty state.

- [ ] **Step 2: Server page** — `src/app/guild-chat/page.tsx`: read `searchParams.dm`; if present, fetch the peer profile via `getPublicProfile(dm)` (existing) → pass `initialPeer` (id, publicId, names, avatar, icon, lastSeenAt). Render `<ChatPage ... initialDmPublicId={dm} initialPeer={...} />`. Keep existing guilds/viewerProfile props.

- [ ] **Step 3: Layout CSS** — two-column grid (`grid-template-columns: 320px 1fr`) filling the panel height; on `max-width: 960px` collapse to single column: show list OR thread based on `?dm` (a `data-` attribute or conditional class). Follow existing `.main` height rule. No inline styles.

- [ ] **Step 4: Typecheck + manual smoke** (`pnpm dev`, open `/guild-chat`, switch between guild chat and a DM). **Step 5: Commit** `feat(chat): ChatPage two-pane layout + DM URL wiring`.

---

## Phase 6 — Profile button + navigation

### Task 14: Wire SendMessageButton

**Files:**
- Modify: `src/app/profile/[publicId]/ProfileBlocks.tsx` (SendMessageButton)
- Modify: `src/app/profile/[publicId]/page.tsx` (pass props, gate on common guild)

**Interfaces:**
- Consumes: `commonGuilds` (already computed), peer `publicId`.

- [ ] **Step 1: SendMessageButton** — accept `{ peerPublicId, canMessage, label }`. Render a `Link` (Next) to `/guild-chat?dm=${peerPublicId}` styled as the primary button when `canMessage`; otherwise render the disabled button (no link). Use the existing `Button` `asChild`/wrap pattern — if `Button` can't render as a link, wrap a `Link` around it or use `Button` with `onClick`+`useRouter` in a tiny `'use client'` wrapper. Prefer `Link` to keep it a server component.

- [ ] **Step 2: page.tsx** — replace `{viewer && <SendMessageButton />}` with `{viewer && <SendMessageButton peerPublicId={publicId} canMessage={commonGuilds.length > 0} label={t('sendMessage')} />}`. (Only guildmates can DM; RLS backstops.)

- [ ] **Step 3: Typecheck. Step 4: Commit** `feat(profile): wire Send message button to DM thread`.

---

## Phase 7 — Sidebar unread + i18n + final checks

### Task 15: Sidebar DM unread dot

**Files:**
- Modify: `src/widgets/sidebar/ui/Sidebar.tsx`

- [ ] **Step 1:** Add `const { data: dmUnread } = useGetDmUnreadQuery(undefined, { pollingInterval: 60_000, skipPollingIfUnfocused: true });` (import `useGetDmUnreadQuery` from `@/entities/direct-message`). Set `'/guild-chat': (chatUnread?.hasUnread || dmUnread?.hasUnread)` in `unreadByHref`.

- [ ] **Step 2: Typecheck. Step 3: Commit** `feat(sidebar): include DM unread in chat dot`.

### Task 16: i18n

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`
- Modify: `src/app/layout.tsx` (`requiredNamespaces`)

- [ ] **Step 1:** Add a `DirectMessages` namespace to BOTH locale files with full key parity. Keys (English / Russian):
  - `empty` "No messages yet" / "Сообщений пока нет"
  - `conversationsEmpty` "No conversations yet" / "Диалогов пока нет"
  - `guildChat` "Guild chat" / "Чат гильдии"
  - `placeholder` "Write a message…" / "Написать сообщение…"
  - `you` "You: " / "Вы: "
  - `attachmentPreview` "Photo" / "Фото"
  - `online` "Online" / "В сети"
  - `lastSeen` "Last seen {time}" / "Был(а) {time}"
  - `send`/`save`/`edit`/`delete`/`editing`/`cancel`/`confirmDelete`/`loadingOlder`/`today`/`yesterday`/`sendError`/`updateError`/`deleteError`/`attachmentError`/`attach`/`removeAttachment`/`closeLightbox` — reuse the exact English/Russian copy from the existing `GuildChat` namespace.
  - In `PublicProfile` (or `Common`): ensure a `sendMessage` key exists ("Send message" / "Написать сообщение") — reuse `Common` if already present; otherwise add to `PublicProfile`.

- [ ] **Step 2:** Add `'DirectMessages'` to `requiredNamespaces` in `src/app/layout.tsx`. (GuildChat already registered.)

- [ ] **Step 3:** Verify key parity: `node -e "const e=require('./messages/en.json'),r=require('./messages/ru.json');const d=Object.keys(e.DirectMessages).filter(k=>!(k in r.DirectMessages));console.log('missing in ru:',d)"` → empty. **Step 4: Commit** `feat(i18n): DirectMessages namespace`.

### Task 17: Cron attachment cleanup extension

**Files:**
- Edge Function `cleanup-chat-attachments` (via Supabase MCP / dashboard)
- Modify: `CLAUDE.md` (document DM tables + cleanup change)

- [ ] **Step 1:** Extend the `cleanup-chat-attachments` Edge Function to also scan `direct_messages` older than 30 days: null their `attachment_url` and delete the corresponding `chat-attachments` files (same path-extraction as for `guild_messages`). Confirm the function body via Supabase MCP, then redeploy. If editing the Edge Function is out of scope for this environment, document the required change and flag for manual deploy.

- [ ] **Step 2:** Update `CLAUDE.md`: add `direct_messages`, `direct_message_reads`, `users_share_guild` to the schema section; note the realtime publication; extend the cron retention note to DMs. **Step 3: Commit** `docs: document direct messages schema and retention`.

### Task 18: Full verification

- [ ] **Step 1:** `pnpm test:run` — all green (except known-unrelated baseline failures, if any).
- [ ] **Step 2:** `pnpm exec tsc --noEmit` — no NEW errors beyond the 3 known baseline.
- [ ] **Step 3:** `pnpm lint` and `pnpm lint:fsd` — no NEW violations (2 known insignificant-slice allowed). Confirm no same-layer entity import for `uploadChatAttachment` (it now lives in `shared`).
- [ ] **Step 4:** Manual smoke in `pnpm dev`: profile → Send message → empty thread → send → appears in list + realtime in a second browser; edit/delete; attachment; unread dot in sidebar; guild chat still pinned and working.
- [ ] **Step 5:** Final commit / open PR.

---

## Self-Review Notes

- **Spec coverage:** schema+RLS+realtime+helper (T1) ✓; entity types/api parity (T2–T7) ✓; routes (T8–T9) ✓; widget rename + ChatThread extraction (T10) ✓; DirectThread/ConversationList/ChatPage (T11–T13) ✓; profile button + navigation + empty thread peer resolution (T13 server peer, T14) ✓; sidebar unread (T15) ✓; i18n + layout namespace (T16) ✓; cron cleanup extension (T17) ✓; presence everywhere (DirectThread header T11 + ConversationItem T12) ✓; tests mirrored (throughout) ✓.
- **Open implementation choices flagged in-task:** FK constraint name for `DM_SELECT` (verify in T2); `Button`-as-link mechanism (T14); Edge Function edit feasibility (T17).
