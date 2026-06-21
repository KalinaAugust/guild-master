# Officer-only Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private per-guild chat channel visible and writable only to officers (members with role `ADMIN` or `OWNER`), reusing the existing guild-chat machinery via a `scope` discriminator.

**Architecture:** Add `scope ('all' | 'officers')` to `guild_messages` and `guild_message_reads`. RLS gates officer rows to officers. The data layer, route handlers and RTK Query endpoints thread a `scope` argument through the existing guild-chat code paths. The UI adds a third "Officer chat" entry in the chat sidebar, rendered only for officers, reusing `GuildThread` parameterized by scope.

**Tech Stack:** Next.js 16 App Router, React 19, Redux Toolkit + RTK Query, Supabase (Postgres + RLS + Realtime), CSS Modules, next-intl, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-21-officer-chat-design.md`.
- Officer = role `ADMIN` or `OWNER`, decided with `has_guild_role(guild_id, ARRAY['ADMIN','OWNER'])` (signature: `has_guild_role(target_guild_id uuid, target_roles text[]) returns boolean`). No new role/flag.
- Supabase migrations: **no CLI** — apply DDL via the Supabase MCP `apply_migration`, then hand-edit `src/shared/api/supabase/types.ts`.
- FSD import direction: `widgets → features → entities → shared`. Import slices via their `index.ts` barrel only.
- All user-facing strings via `next-intl`; add keys to **both** `messages/en.json` and `messages/ru.json` in full parity. New client namespaces must be registered in `requiredNamespaces` in `src/app/layout.tsx` (we reuse the already-registered `DirectMessages` namespace — no registration needed).
- CSS Modules only; **no inline styles**. `<img src>` is data, allowed.
- `scope` values are exactly `'all'` and `'officers'`. Default everywhere is `'all'` to preserve current behaviour.
- Run the full suite with `pnpm test:run`. Baseline note: `master` already has 3 pre-existing `tsc` errors and 2 `lint:fsd` "insignificant-slice" warnings — ignore those, do not "fix" them.
- Commit after each task.

## File Structure

**Database (via MCP):**
- `guild_messages` — gains `scope` column + index; SELECT/INSERT policies rewritten.
- `guild_message_reads` — gains `scope` column; unique constraint widened.
- `src/shared/api/supabase/types.ts` — hand-edited Row/Insert/Update for both tables.

**Entity (`src/entities/guild-message`):**
- `model/types.ts` — add `ChatScope` type.
- `index.ts` — re-export `ChatScope`.
- `api/getGuildMessages.ts`, `api/createGuildMessage.ts`, `api/getGuildChatReadState.ts`, `api/markGuildChatRead.ts`, `api/getGuildChatUnread.ts` — add `scope` param.
- `api/guildMessageApi.ts` — endpoint args become `{ guildId, scope }`; tags `LIST-${guildId}-${scope}`.

**Entity (`src/entities/guild`):**
- `model/types.ts` — `Guild.role`.
- `api/getGuilds.ts` and `src/app/api/guilds/route.ts` — select + map `role`.

**Transport (`src/app/api/guilds/[id]/messages`):**
- `route.ts`, `read/route.ts`, `unread/route.ts` — accept `scope`; officer POST adds `requireGuildRole`.

**Widgets (`src/widgets/chat`, `src/widgets/sidebar`):**
- `GuildThread.tsx` — `scope` prop, scoped hooks, scoped Realtime.
- `ChatPage.tsx` — scope routing + officer gating.
- `ConversationList.tsx` (+ `.module.css`) — officer entry + officer unread.
- `Sidebar.tsx` — officer unread OR.

**i18n:** `messages/en.json`, `messages/ru.json`.

---

### Task 1: Database — `scope` columns, index, constraint

**Files:**
- DB migration (via `mcp__supabase__apply_migration`)
- Modify: `src/shared/api/supabase/types.ts`

**Interfaces:**
- Produces: `guild_messages.scope text NOT NULL DEFAULT 'all'`, `guild_message_reads.scope text NOT NULL DEFAULT 'all'`, unique `(guild_id, user_id, scope)` on reads.

- [ ] **Step 1: Apply the schema migration**

Call `mcp__supabase__apply_migration` with name `officer_chat_scope_columns` and query:

```sql
alter table public.guild_messages
  add column if not exists scope text not null default 'all'
  check (scope in ('all','officers'));

create index if not exists guild_messages_guild_scope_created_idx
  on public.guild_messages (guild_id, scope, created_at);

alter table public.guild_message_reads
  add column if not exists scope text not null default 'all'
  check (scope in ('all','officers'));

alter table public.guild_message_reads
  drop constraint if exists guild_message_reads_guild_id_user_id_key;

alter table public.guild_message_reads
  drop constraint if exists guild_message_reads_guild_user_scope_key;

alter table public.guild_message_reads
  add constraint guild_message_reads_guild_user_scope_key
  unique (guild_id, user_id, scope);
```

- [ ] **Step 2: Verify the columns and constraint exist**

Call `mcp__supabase__execute_sql`:

```sql
select column_name, column_default, is_nullable
from information_schema.columns
where table_schema='public' and table_name in ('guild_messages','guild_message_reads') and column_name='scope'
order by table_name;

select conname from pg_constraint
where conrelid='public.guild_message_reads'::regclass and contype='u';
```

Expected: two `scope` rows (default `'all'`, not nullable); a unique constraint `guild_message_reads_guild_user_scope_key`.

- [ ] **Step 3: Hand-edit Supabase types**

In `src/shared/api/supabase/types.ts`, find the `guild_messages` table block and add `scope: string` to its `Row`, and `scope?: string` to `Insert` and `Update`. Do the same for `guild_message_reads`. (Search for `guild_messages:` and `guild_message_reads:` within `Tables`.)

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit 2>&1 | grep -c error || true`
Expected: count is the baseline `3` (no new errors introduced by the type edit).

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat(db): add scope column to guild_messages and guild_message_reads"
```

---

### Task 2: Database — RLS scope gate

**Files:**
- DB migration (via `mcp__supabase__apply_migration`)

**Interfaces:**
- Consumes: `has_guild_role(uuid, text[])`.
- Produces: officer rows readable/insertable only by officers.

- [ ] **Step 1: Apply the RLS migration**

Call `mcp__supabase__apply_migration` with name `officer_chat_rls` and query:

```sql
-- SELECT: members see 'all' rows; officer rows only for ADMIN/OWNER.
drop policy if exists guild_messages_select_members on public.guild_messages;
create policy guild_messages_select_members on public.guild_messages
  for select using (
    exists (
      select 1 from guild_members gm
      where gm.guild_id = guild_messages.guild_id and gm.user_id = auth.uid()
    )
    and (
      scope = 'all'
      or public.has_guild_role(guild_messages.guild_id, array['ADMIN','OWNER'])
    )
  );

-- INSERT: own row + member; officer rows require officer role.
drop policy if exists guild_messages_insert_members on public.guild_messages;
create policy guild_messages_insert_members on public.guild_messages
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from guild_members gm
      where gm.guild_id = guild_messages.guild_id and gm.user_id = auth.uid()
    )
    and (
      scope = 'all'
      or public.has_guild_role(guild_messages.guild_id, array['ADMIN','OWNER'])
    )
  );
```

(UPDATE/DELETE `*_own` policies are unchanged.)

- [ ] **Step 2: Verify the new policies are in place**

Call `mcp__supabase__execute_sql`:

```sql
select policyname, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename='guild_messages' and cmd in ('SELECT','INSERT')
order by cmd;
```

Expected: both `qual` (SELECT) and `with_check` (INSERT) now contain `has_guild_role`.

- [ ] **Step 3: Commit (migration is server-side; record the intent)**

```bash
git commit --allow-empty -m "feat(db): RLS gate for officer-scope guild messages"
```

---

### Task 3: `ChatScope` type + scoped `getGuildMessages`

**Files:**
- Modify: `src/entities/guild-message/model/types.ts`
- Modify: `src/entities/guild-message/index.ts`
- Modify: `src/entities/guild-message/api/getGuildMessages.ts`
- Test: `src/entities/guild-message/api/getGuildMessages.test.ts`

**Interfaces:**
- Produces: `export type ChatScope = 'all' | 'officers'`; `getGuildMessages(guildId: string, opts?: { limit?: number; before?: string; after?: string; scope?: ChatScope }): Promise<GuildMessagesPage>`.

- [ ] **Step 1: Add the `ChatScope` type**

In `src/entities/guild-message/model/types.ts`, add at the top:

```ts
export type ChatScope = 'all' | 'officers';
```

In `src/entities/guild-message/index.ts`, change the type re-export line to:

```ts
export type { GuildMessage, ChatScope } from './model/types';
```

- [ ] **Step 2: Write the failing test**

In `src/entities/guild-message/api/getGuildMessages.test.ts`, add a test asserting scope is applied. The mock's `query()` helper returns a chainable spy; assert `.eq` was called with `('scope','officers')`. Add:

```ts
it('filters by officer scope when requested', async () => {
  const q = query({ data: [] });
  const from = vi.fn().mockReturnValue(q);
  vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as never);

  await getGuildMessages('g1', { scope: 'officers' });

  expect(q.eq).toHaveBeenCalledWith('scope', 'officers');
});
```

(If `getGuildMessages.test.ts` does not yet import `query`/`mockClient`/`createClient`/`vi`, mirror the imports already used in `createGuildMessage.test.ts`.)

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test:run src/entities/guild-message/api/getGuildMessages.test.ts`
Expected: FAIL — `.eq` not called with `('scope','officers')`.

- [ ] **Step 4: Implement scope filtering**

In `src/entities/guild-message/api/getGuildMessages.ts`, extend `FetchOpts` and apply `.eq('scope', scope)` in all three branches:

```ts
interface FetchOpts {
  limit?: number;
  before?: string;
  after?: string;
  scope?: import('../model/types').ChatScope;
}

export const getGuildMessages = async (
  guildId: string,
  { limit = 50, before, after, scope = 'all' }: FetchOpts = {},
): Promise<GuildMessagesPage> => {
  const supabase = await createClient();

  if (after) {
    const { data, error } = await supabase
      .from('guild_messages')
      .select(MESSAGE_SELECT)
      .eq('guild_id', guildId)
      .eq('scope', scope)
      .gt('created_at', after)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { messages: (data ?? []).map(mapMessageRow), hasMore: false };
  }

  let q = supabase
    .from('guild_messages')
    .select(MESSAGE_SELECT)
    .eq('guild_id', guildId)
    .eq('scope', scope);
  if (before) q = q.lt('created_at', before);

  const { data, error } = await q
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (error) throw error;

  const rows = (data ?? []).map(mapMessageRow);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return { messages: page.reverse(), hasMore };
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test:run src/entities/guild-message/api/getGuildMessages.test.ts`
Expected: PASS (new test + existing tests).

- [ ] **Step 6: Commit**

```bash
git add src/entities/guild-message/model/types.ts src/entities/guild-message/index.ts src/entities/guild-message/api/getGuildMessages.ts src/entities/guild-message/api/getGuildMessages.test.ts
git commit -m "feat(guild-message): scope-filtered message reads + ChatScope type"
```

---

### Task 4: Scoped `createGuildMessage`

**Files:**
- Modify: `src/entities/guild-message/api/createGuildMessage.ts`
- Test: `src/entities/guild-message/api/createGuildMessage.test.ts`

**Interfaces:**
- Produces: `createGuildMessage(guildId: string, body: string, attachmentUrl?: string | null, scope?: ChatScope): Promise<GuildMessage>`.

- [ ] **Step 1: Write the failing test**

Add to `createGuildMessage.test.ts`:

```ts
it('inserts the requested scope', async () => {
  const q = query({ data: {
    id: 'm1', guild_id: 'g1', user_id: 'u1', body: 'hi', created_at: 't', updated_at: 't', profiles: { full_name: 'Me', avatar_url: null },
  } });
  const from = vi.fn().mockReturnValue(q);
  useClient({ id: 'u1' }, from);

  await createGuildMessage('g1', 'hi', null, 'officers');

  expect(q.insert).toHaveBeenCalledWith(expect.objectContaining({ scope: 'officers' }));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:run src/entities/guild-message/api/createGuildMessage.test.ts`
Expected: FAIL — `insert` called without `scope`.

- [ ] **Step 3: Implement scope insert**

In `createGuildMessage.ts`, change the signature and the insert:

```ts
import type { ChatScope } from '../model/types';

export const createGuildMessage = async (
  guildId: string,
  body: string,
  attachmentUrl?: string | null,
  scope: ChatScope = 'all',
): Promise<GuildMessage> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed && !attachmentUrl) throw new InvalidGuildMessageError('Message is empty');
  if (trimmed.length > MAX_MESSAGE_LENGTH) throw new InvalidGuildMessageError('Message is too long');

  const { data, error } = await supabase
    .from('guild_messages')
    .insert({ guild_id: guildId, user_id: user.id, body: trimmed, attachment_url: attachmentUrl ?? null, scope })
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create message');
  return mapMessageRow(data);
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:run src/entities/guild-message/api/createGuildMessage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/guild-message/api/createGuildMessage.ts src/entities/guild-message/api/createGuildMessage.test.ts
git commit -m "feat(guild-message): scope-aware message creation"
```

---

### Task 5: Scoped read-state (read / mark / unread)

**Files:**
- Modify: `src/entities/guild-message/api/getGuildChatReadState.ts`
- Modify: `src/entities/guild-message/api/markGuildChatRead.ts`
- Modify: `src/entities/guild-message/api/getGuildChatUnread.ts`
- Test: `src/entities/guild-message/api/getGuildChatUnread.test.ts`

**Interfaces:**
- Produces:
  - `getGuildChatReadState(guildId: string, scope?: ChatScope)`
  - `markGuildChatRead(guildId: string, scope?: ChatScope)`
  - `getGuildChatUnread(guildId: string, scope?: ChatScope)`

- [ ] **Step 1: Write the failing test**

Add to `getGuildChatUnread.test.ts`:

```ts
it('scopes the unread probe to officers', async () => {
  const readQ = query({ data: { last_read_at: null } });
  const msgQ = query({ data: [] });
  const from = vi.fn().mockReturnValueOnce(readQ).mockReturnValueOnce(msgQ);
  vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as never);

  await getGuildChatUnread('g1', 'officers');

  expect(readQ.eq).toHaveBeenCalledWith('scope', 'officers');
  expect(msgQ.eq).toHaveBeenCalledWith('scope', 'officers');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:run src/entities/guild-message/api/getGuildChatUnread.test.ts`
Expected: FAIL — `.eq('scope', …)` not called.

- [ ] **Step 3: Implement scope in all three functions**

`getGuildChatReadState.ts`:

```ts
import type { ChatScope } from '../model/types';

export const getGuildChatReadState = async (
  guildId: string,
  scope: ChatScope = 'all',
): Promise<{ lastReadAt: string | null }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('guild_message_reads')
    .select('last_read_at')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .eq('scope', scope)
    .maybeSingle();

  if (error) throw error;
  return { lastReadAt: data?.last_read_at ?? null };
};
```

`markGuildChatRead.ts`:

```ts
import type { ChatScope } from '../model/types';

export const markGuildChatRead = async (
  guildId: string,
  scope: ChatScope = 'all',
): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('guild_message_reads')
    .upsert(
      { guild_id: guildId, user_id: user.id, scope, last_read_at: new Date().toISOString() },
      { onConflict: 'guild_id,user_id,scope' },
    );
  if (error) throw error;
};
```

`getGuildChatUnread.ts` — add `scope` param and `.eq('scope', scope)` to both the read-state lookup and the messages probe:

```ts
import type { ChatScope } from '../model/types';

export const getGuildChatUnread = async (
  guildId: string,
  scope: ChatScope = 'all',
): Promise<{ hasUnread: boolean }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: read, error: readError } = await supabase
    .from('guild_message_reads')
    .select('last_read_at')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .eq('scope', scope)
    .maybeSingle();
  if (readError) throw readError;
  const lastReadAt: string | null = read?.last_read_at ?? null;

  let q = supabase
    .from('guild_messages')
    .select('id')
    .eq('guild_id', guildId)
    .eq('scope', scope)
    .neq('user_id', user.id);
  if (lastReadAt) q = q.gt('created_at', lastReadAt);
  const { data: rows, error } = await q.limit(1);
  if (error) throw error;

  return { hasUnread: (rows ?? []).length > 0 };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:run src/entities/guild-message/api/getGuildChatUnread.test.ts`
Expected: PASS (existing default-scope tests still pass — they don't assert on `scope`).

- [ ] **Step 5: Commit**

```bash
git add src/entities/guild-message/api/getGuildChatReadState.ts src/entities/guild-message/api/markGuildChatRead.ts src/entities/guild-message/api/getGuildChatUnread.ts src/entities/guild-message/api/getGuildChatUnread.test.ts
git commit -m "feat(guild-message): scope-aware read-state and unread probe"
```

---

### Task 6: Route handlers — scope + officer 403

**Files:**
- Modify: `src/app/api/guilds/[id]/messages/route.ts`
- Modify: `src/app/api/guilds/[id]/messages/read/route.ts`
- Modify: `src/app/api/guilds/[id]/messages/unread/route.ts`
- Test: `src/app/api/guilds/[id]/messages/route.test.ts`

**Interfaces:**
- Consumes: `getGuildMessages(..., { scope })`, `createGuildMessage(..., scope)`, `requireGuildRole`, `requireUser`.
- Produces: `?scope=officers` accepted on GET/read/unread; officer POST returns 403 for non-officers.

- [ ] **Step 1: Add a parse helper and thread scope into `messages/route.ts`**

Replace `src/app/api/guilds/[id]/messages/route.ts` with:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getGuildMessages } from '@/entities/guild-message/api/getGuildMessages';
import { createGuildMessage, InvalidGuildMessageError } from '@/entities/guild-message/api/createGuildMessage';
import type { ChatScope } from '@/entities/guild-message';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';

const parseScope = (raw: string | null): ChatScope => (raw === 'officers' ? 'officers' : 'all');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const before = searchParams.get('before') ?? undefined;
    const after = searchParams.get('after') ?? undefined;
    const scope = parseScope(searchParams.get('scope'));
    const page = await getGuildMessages(id, { limit, before, after, scope });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
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
    const { body, attachmentUrl, scope: rawScope } = await request.json();
    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid message body' }, { status: 400 });
    }
    if (attachmentUrl != null && typeof attachmentUrl !== 'string') {
      return NextResponse.json({ error: 'Invalid attachment' }, { status: 400 });
    }
    const scope = parseScope(typeof rawScope === 'string' ? rawScope : null);
    if (scope === 'officers') {
      const forbidden = await requireGuildRole(auth.supabase, id, auth.user.id, ['ADMIN', 'OWNER']);
      if (forbidden) return forbidden;
    }
    const message = await createGuildMessage(id, body, attachmentUrl ?? null, scope);
    return NextResponse.json(message, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidGuildMessageError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Thread scope into `read/route.ts`**

In `src/app/api/guilds/[id]/messages/read/route.ts`, read the scope query param and pass it through:

```ts
const parseScope = (raw: string | null) => (raw === 'officers' ? 'officers' as const : 'all' as const);

// GET handler: change signature to accept `request: NextRequest`
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const scope = parseScope(request.nextUrl.searchParams.get('scope'));
    const state = await getGuildChatReadState(id, scope);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch read state' }, { status: 500 });
  }
}

// POST handler: same parsing, pass scope to markGuildChatRead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const scope = parseScope(request.nextUrl.searchParams.get('scope'));
    await markGuildChatRead(id, scope);
    return NextResponse.json({ marked: true });
  } catch {
    return NextResponse.json({ error: 'Failed to mark chat read' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Thread scope into `unread/route.ts`**

In `src/app/api/guilds/[id]/messages/unread/route.ts`, change the GET signature to `request: NextRequest` and:

```ts
const scope = request.nextUrl.searchParams.get('scope') === 'officers' ? 'officers' as const : 'all' as const;
const state = await getGuildChatUnread(id, scope);
```

- [ ] **Step 4: Write the failing 403 test**

In `src/app/api/guilds/[id]/messages/route.test.ts`, add a test that a non-officer POST with `scope:'officers'` returns 403. Mirror the existing test setup in that file (it already mocks `requireUser` / the entity functions). Add:

```ts
it('rejects officer-scope POST from a non-officer with 403', async () => {
  // requireUser resolves ok; requireGuildRole returns a 403 response.
  vi.mocked(requireGuildRole).mockResolvedValue(
    NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
  );
  const res = await POST(
    new NextRequest('http://t/api/guilds/g1/messages', {
      method: 'POST',
      body: JSON.stringify({ body: 'secret', scope: 'officers' }),
    }),
    { params: Promise.resolve({ id: 'g1' }) },
  );
  expect(res.status).toBe(403);
  expect(createGuildMessage).not.toHaveBeenCalled();
});
```

Add `requireGuildRole` to the `vi.mock('@/shared/api/guildAuth', …)` factory in that file (alongside the existing `requireUser` mock), returning `vi.fn().mockResolvedValue(null)` by default so the existing `scope:'all'` tests are unaffected.

- [ ] **Step 5: Run the test to verify it fails, then passes**

Run: `pnpm test:run src/app/api/guilds/[id]/messages/route.test.ts`
Expected: the new test FAILS before Step 1–4 are in place; after, PASS along with existing tests.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/guilds/[id]/messages/route.ts" "src/app/api/guilds/[id]/messages/read/route.ts" "src/app/api/guilds/[id]/messages/unread/route.ts" "src/app/api/guilds/[id]/messages/route.test.ts"
git commit -m "feat(api): scope param on guild message routes + officer 403 gate"
```

---

### Task 7: RTK Query — thread `scope` through cache + GuildThread

**Files:**
- Modify: `src/entities/guild-message/api/guildMessageApi.ts`
- Modify: `src/widgets/chat/ui/GuildThread.tsx`
- Test: `src/widgets/chat/ui/GuildThread.test.tsx`

**Interfaces:**
- Produces: every guild-message endpoint now takes `{ guildId: string; scope: ChatScope }` (except `addGuildMessage` which extends its existing object arg with `scope`). Tags become `LIST-${guildId}-${scope}`. `GuildThread` gains required prop `scope: ChatScope`.

This task changes the cache-key shape and updates the sole consumer (`GuildThread`) together so the build stays green.

- [ ] **Step 1: Rewrite `guildMessageApi.ts` endpoint args**

Key changes (apply throughout the file):
- `getGuildMessages`: arg `{ guildId, scope }`; URL `guilds/${guildId}/messages?limit=50&scope=${scope}`; tag `LIST-${guildId}-${scope}`.
- `fetchOlderMessages`: arg `{ guildId, scope, before }`; URL adds `&scope=${scope}`; `onQueryStarted` updates `updateQueryData('getGuildMessages', { guildId, scope }, …)`.
- `fetchNewMessages`: arg `{ guildId, scope, after }`; URL `guilds/${guildId}/messages?after=…&scope=${scope}`; updateQueryData key `{ guildId, scope }`.
- `addGuildMessage`: arg gains `scope: ChatScope`; POST body adds `scope`; all three `updateQueryData('getGuildMessages', …)` calls key on `{ guildId, scope }`; the optimistic `GuildMessage` object is unchanged (no scope field on the client type).
- `updateGuildMessage`: arg `{ guildId, scope, messageId, body }`; updateQueryData key `{ guildId, scope }`.
- `deleteGuildMessage`: arg `{ guildId, scope, messageId }`; updateQueryData key `{ guildId, scope }`.
- `getGuildChatReadState`: arg `{ guildId, scope }`; URL `guilds/${guildId}/messages/read?scope=${scope}`; tag `LIST-${guildId}-${scope}`.
- `markGuildChatRead`: arg `{ guildId, scope }`; URL `guilds/${guildId}/messages/read?scope=${scope}`; optimistic `updateQueryData('getGuildChatReadState', { guildId, scope }, …)`; invalidates `LIST-${guildId}-${scope}`.
- `getGuildChatUnread`: arg `{ guildId, scope }`; URL `guilds/${guildId}/messages/unread?scope=${scope}`; tag `LIST-${guildId}-${scope}`.

Add `import type { ChatScope } from '../model/types';` at the top. Concrete examples for the trickiest two:

```ts
getGuildMessages: builder.query<GuildMessagesPage, { guildId: string; scope: ChatScope }>({
  query: ({ guildId, scope }) => `guilds/${guildId}/messages?limit=50&scope=${scope}`,
  providesTags: (_, __, { guildId, scope }) => [
    { type: 'GuildMessage' as const, id: `LIST-${guildId}-${scope}` },
  ],
}),
```

```ts
addGuildMessage: builder.mutation<
  GuildMessage,
  { guildId: string; scope: ChatScope; body: string; attachmentUrl?: string | null;
    author?: { userId: string; profile: GuildMessage['profile'] } }
>({
  query: ({ guildId, scope, body, attachmentUrl }) => ({
    url: `guilds/${guildId}/messages`,
    method: 'POST',
    body: { body, attachmentUrl: attachmentUrl ?? null, scope },
  }),
  async onQueryStarted({ guildId, scope, body, attachmentUrl, author }, { dispatch, queryFulfilled }) {
    // ...identical body, but every updateQueryData('getGuildMessages', …) keys on { guildId, scope }
  },
}),
```

- [ ] **Step 2: Update `GuildThread.tsx` to pass scope**

In `src/widgets/chat/ui/GuildThread.tsx`:
- Import the type: `import { ..., type GuildMessage, type ChatScope } from '@/entities/guild-message';` (add `ChatScope`).
- Add `scope: ChatScope` to `GuildThreadProps` and destructure it.
- Replace every hook call arg with the object form, e.g.:

```ts
const { data, isLoading } = useGetGuildMessagesQuery(
  activeGuildId ? { guildId: activeGuildId, scope } : skipToken,
  { refetchOnFocus: true },
);
```

Import `skipToken` from `@reduxjs/toolkit/query` and use it in place of the `skip:` option for the queries that were skipping on empty id (`getGuildMessages`, `getGuildChatReadState`). For the lazy/mutation triggers, pass `{ guildId: activeGuildId, scope, … }`.
- `fetchOlder({ guildId: activeGuildId, scope, before })`, `fetchNew({ guildId: activeGuildId, scope, after })`.
- `markRead({ guildId: activeGuildId, scope })`.
- `addMessage({ guildId: activeGuildId, scope, body, attachmentUrl, author })`.
- `updateMessage({ guildId: activeGuildId, scope, messageId: id, body })`.
- `deleteMessage({ guildId: activeGuildId, scope, messageId: id })`.
- In the realtime `updateQueryData('getGuildMessages', …)` calls, key on `{ guildId: activeGuildId, scope }`.
- Realtime channel name: `supabase.channel(\`chat:${scope}:${activeGuildId}\`)`.
- In the INSERT handler, gate on scope before `fetchNew`:

```ts
{ event: 'INSERT', schema: 'public', table: 'guild_messages', filter },
(payload) => {
  if ((payload.new as { scope?: string }).scope !== scope) return;
  const last = messagesRef.current.at(-1);
  fetchNew({ guildId: activeGuildId, scope, after: last?.createdAt ?? new Date(0).toISOString() });
},
```

Add the same `scope` guard to the UPDATE and DELETE handlers (`if ((payload.new ?? payload.old as {scope?:string}).scope !== scope) return;` — for DELETE read `payload.old`).
- Add `scope` to the realtime `useEffect` dependency array.

- [ ] **Step 3: Update the GuildThread default usage so the build compiles**

In `src/widgets/chat/ui/ChatPage.tsx`, the existing `<GuildThread … />` render gains `scope="all"` (full officer wiring comes in Task 9). Add the prop now:

```tsx
<GuildThread guilds={guilds} userId={userId} viewerProfile={viewerProfile} initialGuildId={initialGuildId} scope="all" />
```

- [ ] **Step 4: Update `GuildThread.test.tsx`**

Open `src/widgets/chat/ui/GuildThread.test.tsx`. Render `<GuildThread … scope="all" />`. Where the test asserts on RTK hook args (if any), update the expected arg to the `{ guildId, scope: 'all' }` object form. If the test mocks `@/entities/guild-message` hooks, ensure the mocked `useGetGuildMessagesQuery` ignores the new arg shape.

- [ ] **Step 5: Run tests**

Run: `pnpm test:run src/widgets/chat/ui/GuildThread.test.tsx src/entities/guild-message`
Expected: PASS. Then `pnpm tsc --noEmit 2>&1 | grep -c error || true` → baseline `3`.

- [ ] **Step 6: Commit**

```bash
git add src/entities/guild-message/api/guildMessageApi.ts src/widgets/chat/ui/GuildThread.tsx src/widgets/chat/ui/GuildThread.test.tsx src/widgets/chat/ui/ChatPage.tsx
git commit -m "feat(guild-message): thread chat scope through RTK Query cache and GuildThread"
```

---

### Task 8: Viewer role on `Guild`

**Files:**
- Modify: `src/entities/guild/model/types.ts`
- Modify: `src/entities/guild/api/getGuilds.ts`
- Modify: `src/app/api/guilds/route.ts`
- Test: `src/entities/guild/api/getGuilds.test.ts`

**Interfaces:**
- Produces: `Guild.role?: 'OWNER' | 'ADMIN' | 'MEMBER'` — the **viewer's** role in that guild — populated by both `getMyGuilds` (server) and `GET /api/guilds` (RTK `useGetGuildsQuery`).

- [ ] **Step 1: Add `role` to the `Guild` type**

In `src/entities/guild/model/types.ts`, add to the `Guild` interface:

```ts
  /** The viewer's role in this guild (populated by guild list endpoints). */
  role?: 'OWNER' | 'ADMIN' | 'MEMBER';
```

- [ ] **Step 2: Write the failing test**

In `src/entities/guild/api/getGuilds.test.ts`, add a row with a `role` and assert it maps through:

```ts
it('maps the viewer role onto each guild', async () => {
  const from = vi.fn().mockReturnValue(query({ data: [
    { guild_id: 'g1', role: 'ADMIN', guilds: { id: 'g1', public_id: 'p1', name: 'G', owner_id: 'o1', description: null, avatar_url: null } },
  ] }));
  vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as never);

  const result = await getMyGuilds('u1');
  expect(result[0].role).toBe('ADMIN');
});
```

(Match the existing import style in that test file.)

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test:run src/entities/guild/api/getGuilds.test.ts`
Expected: FAIL — `role` is `undefined`.

- [ ] **Step 4: Select and map `role` in `getGuilds.ts`**

Change the select and the mapper:

```ts
  const { data, error } = await supabase
    .from('guild_members')
    .select('guild_id, role, guilds (id, public_id, name, owner_id, description, avatar_url)')
    .eq('user_id', finalUserId)
    .eq('status', 'ACCEPTED');
  // ...
  return data.reduce<Guild[]>((acc, m) => {
    const g = m.guilds as unknown as { id: string; public_id: string; name: string; owner_id: string; description: string | null; avatar_url: string | null };
    if (g) {
      acc.push({
        id: g.id,
        publicId: g.public_id,
        name: g.name,
        ownerId: g.owner_id,
        description: g.description || undefined,
        avatarUrl: g.avatar_url || undefined,
        role: (m.role as 'OWNER' | 'ADMIN' | 'MEMBER') ?? undefined,
      });
    }
    return acc;
  }, []);
```

- [ ] **Step 5: Mirror the change in `src/app/api/guilds/route.ts`**

In the GET handler, add `role` to the select string (`'guild_id, role, guilds (...)'`), add `role?: 'OWNER' | 'ADMIN' | 'MEMBER'` to the local accumulator element type, and set `role: (m.role as 'OWNER' | 'ADMIN' | 'MEMBER') ?? undefined` in the pushed object.

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm test:run src/entities/guild/api/getGuilds.test.ts`
Expected: PASS. Then `pnpm tsc --noEmit 2>&1 | grep -c error || true` → baseline `3`.

- [ ] **Step 7: Commit**

```bash
git add src/entities/guild/model/types.ts src/entities/guild/api/getGuilds.ts "src/app/api/guilds/route.ts" src/entities/guild/api/getGuilds.test.ts
git commit -m "feat(guild): expose viewer role on guild list responses"
```

---

### Task 9: UI — officer chat entry, routing, i18n

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`
- Modify: `src/widgets/chat/ui/ChatPage.tsx`
- Modify: `src/widgets/chat/ui/ConversationList.tsx` (+ `ConversationList.module.css`)

**Interfaces:**
- Consumes: `Guild.role`, `GuildThread` `scope` prop, `useGetGuildMessagesQuery`/`useGetGuildChatUnreadQuery` with `{ guildId, scope }`.
- Produces: officer chat reachable at `/guild-chat?scope=officers`, entry shown only to officers.

- [ ] **Step 1: Add i18n keys (both files, full parity)**

In `messages/en.json` → `DirectMessages`:

```json
    "officerChat": "Officer chat",
    "officerChatLabel": "{name} officers",
```

In `messages/ru.json` → `DirectMessages`:

```json
    "officerChat": "Чат офицеров",
    "officerChatLabel": "Офицеры {name}",
```

- [ ] **Step 2: Scope routing in `ChatPage.tsx`**

In `src/widgets/chat/ui/ChatPage.tsx`:
- Read the scope param: `const scopeParam = searchParams.get('scope');` and `const isOfficerChat = scopeParam === 'officers' && !activeDm;`. Adjust `isGuildChat` to `const isGuildChat = !activeDm && !isOfficerChat;`.
- Resolve the viewer's officer status for the active guild:

```ts
const activeGuildId = useAppSelector((s) => s.guild.currentGuildId) ?? initialGuildId ?? guilds[0]?.id;
const activeGuildRole = guilds.find((g) => g.id === activeGuildId)?.role;
const isOfficer = activeGuildRole === 'ADMIN' || activeGuildRole === 'OWNER';
```

(Import `useAppSelector` from `@/shared/lib/hooks`.)
- Add handlers:

```ts
const handleSelectOfficer = () => router.replace('/guild-chat?scope=officers', { scroll: false });
```

- Pass to `ConversationList`: `isOfficer={isOfficer}`, `officerSelected={isOfficerChat}`, `onSelectOfficer={handleSelectOfficer}`. Keep `guildSelected={isGuildChat}`.
- In the main pane, render the officer thread:

```tsx
{isOfficerChat ? (
  <GuildThread guilds={guilds} userId={userId} viewerProfile={viewerProfile} initialGuildId={initialGuildId} scope="officers" />
) : isGuildChat ? (
  <GuildThread guilds={guilds} userId={userId} viewerProfile={viewerProfile} initialGuildId={initialGuildId} scope="all" />
) : activeDm && resolvedPeer ? (
  // ...existing DirectThread branch unchanged
) : (
  // ...existing loading branch unchanged
)}
```

Guard: if `isOfficerChat && !isOfficer`, treat as guild chat (redirect): add at top of render `if (isOfficerChat && !isOfficer) { handleSelectGuild(); }` is unsafe during render — instead compute `const effectiveOfficer = isOfficerChat && isOfficer;` and use `effectiveOfficer` for the pane + sidebar selection, so a non-officer hitting the URL simply sees the guild chat. RLS still protects the data.

- [ ] **Step 3: Officer entry in `ConversationList.tsx`**

Add props to `ConversationListProps`:

```ts
  isOfficer?: boolean;
  officerSelected?: boolean;
  onSelectOfficer?: () => void;
```

Destructure them. Add an officer-scope unread + last-message query (only when officer):

```ts
const { data: officerData } = useGetGuildMessagesQuery(
  isOfficer && activeGuild ? { guildId: activeGuild.id, scope: 'officers' } : skipToken,
);
const lastOfficerMessage = officerData?.messages.at(-1);
const lastOfficerSender = lastOfficerMessage ? resolveDisplayName(lastOfficerMessage.profile) : null;
const officerLabel = activeGuild ? t('officerChatLabel', { name: activeGuild.name }) : t('officerChat');
```

(Import `skipToken` from `@reduxjs/toolkit/query`; the existing `useGetGuildMessagesQuery` import already exists — note its arg is now the `{ guildId, scope }` object from Task 7, so update the existing guild-chat preview query in this file to `{ guildId: activeGuild.id, scope: 'all' }` as well.)

Render the officer button immediately after the guild button and before the `divider`, only when `isOfficer`:

```tsx
{isOfficer && (
  <button
    type="button"
    className={`${styles.item} ${officerSelected ? styles.itemActive : ''}`}
    onClick={onSelectOfficer}
  >
    <div className={styles.avatarWrapper}>
      <div className={styles.guildIcon}>
        <Shield size={20} />
      </div>
    </div>
    <div className={styles.itemContent}>
      <div className={styles.itemHeader}>
        <span className={styles.name}>{officerLabel}</span>
      </div>
      {lastOfficerMessage && (
        <div className={styles.itemFooter}>
          <div className={styles.preview}>
            <span className={styles.senderName}>
              {lastOfficerMessage.userId === userId
                ? t('you')
                : t('senderPrefix', { name: lastOfficerSender ?? '' })}
            </span>
            <span className={styles.bodyPreview}>{lastOfficerMessage.body}</span>
          </div>
        </div>
      )}
    </div>
  </button>
)}
```

Import `Shield` from `lucide-react` (add to the existing import).

- [ ] **Step 4: Typecheck + run chat tests**

Run: `pnpm tsc --noEmit 2>&1 | grep -c error || true` → baseline `3`.
Run: `pnpm test:run src/widgets/chat`
Expected: PASS.

- [ ] **Step 5: Verify i18n parity**

Run: `node -e "const e=require('./messages/en.json').DirectMessages,r=require('./messages/ru.json').DirectMessages;const ek=Object.keys(e).sort(),rk=Object.keys(r).sort();console.log(JSON.stringify(ek)===JSON.stringify(rk)?'PARITY OK':'MISMATCH')"`
Expected: `PARITY OK`.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/ru.json src/widgets/chat/ui/ChatPage.tsx src/widgets/chat/ui/ConversationList.tsx src/widgets/chat/ui/ConversationList.module.css
git commit -m "feat(chat): officer chat entry, scope routing, and i18n"
```

---

### Task 10: Officer unread parity (ConversationList dot + Sidebar)

**Files:**
- Modify: `src/widgets/chat/ui/ConversationList.tsx`
- Modify: `src/widgets/sidebar/ui/Sidebar.tsx`
- Test: `src/widgets/sidebar/ui/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useGetGuildChatUnreadQuery({ guildId, scope })`, `useGetGuildsQuery` (now carries `role`).

- [ ] **Step 1: Officer unread dot in `ConversationList.tsx`**

Add an officer unread query and render the dot on the officer button:

```ts
const { data: officerUnread } = useGetGuildChatUnreadQuery(
  isOfficer && activeGuild ? { guildId: activeGuild.id, scope: 'officers' } : skipToken,
);
```

In the officer button JSX (Task 9), append before `</button>`:

```tsx
{officerUnread?.hasUnread && !officerSelected && <div className={styles.unreadDot} />}
```

(Import `useGetGuildChatUnreadQuery` from `@/entities/guild-message`.)

- [ ] **Step 2: OR officer unread into the Sidebar dot**

In `src/widgets/sidebar/ui/Sidebar.tsx`:
- The existing `useGetGuildChatUnreadQuery(activeGuildId ?? '', pollOptions)` arg is now the object shape — change it to `useGetGuildChatUnreadQuery(activeGuildId ? { guildId: activeGuildId, scope: 'all' } : skipToken, pollOptions)` (import `skipToken` from `@reduxjs/toolkit/query`).
- Determine officer status from the polled guilds list and add an officer unread query:

```ts
const activeGuild = guilds?.find((g) => g.id === activeGuildId);
const isOfficer = activeGuild?.role === 'ADMIN' || activeGuild?.role === 'OWNER';
const { data: officerChatUnread } = useGetGuildChatUnreadQuery(
  isOfficer && activeGuildId ? { guildId: activeGuildId, scope: 'officers' } : skipToken,
  pollOptions,
);
```

- Update the unread map:

```ts
'/guild-chat': chatUnread?.hasUnread || officerChatUnread?.hasUnread || dmUnread?.hasUnread,
```

- [ ] **Step 3: Fix the Sidebar test mock**

In `src/widgets/sidebar/ui/Sidebar.test.tsx`, the mocked `useGetGuildChatUnreadQuery: () => ({ data: { hasUnread: false } })` already ignores its arg — leave it. Ensure the mocked `useGetGuildsQuery` returns guilds without `role` (so `isOfficer` is false and only the `'all'` query path is exercised), keeping existing assertions valid.

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm test:run src/widgets/sidebar`
Expected: PASS.
Run: `pnpm tsc --noEmit 2>&1 | grep -c error || true` → baseline `3`.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/chat/ui/ConversationList.tsx src/widgets/sidebar/ui/Sidebar.tsx src/widgets/sidebar/ui/Sidebar.test.tsx
git commit -m "feat(chat): officer-channel unread dot in sidebar and conversation list"
```

---

### Task 11: Full verification + manual RLS check

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `pnpm test:run`
Expected: all pass (no new failures vs. baseline).

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit 2>&1 | grep -c error || true`
Expected: `3` (baseline; no new errors).

- [ ] **Step 3: Manual RLS verification (Supabase MCP)**

Confirm the policy expressions reference `has_guild_role` (already done in Task 2 Step 2). Additionally, sanity-check that existing rows defaulted correctly:

```sql
select scope, count(*) from public.guild_messages group by scope;
select scope, count(*) from public.guild_message_reads group by scope;
```

Expected: all existing rows report `scope = 'all'`.

- [ ] **Step 4: Lint (FSD)**

Run: `pnpm lint:fsd`
Expected: only the 2 baseline "insignificant-slice" warnings; no new violations (no cross-feature/widget imports were introduced — the officer entry stays within `widgets/chat`).

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "test: verify officer chat end-to-end" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- §1 schema → Task 1. §2 RLS → Task 2. §3 transport → Task 6. §4 data layer → Tasks 3–5. §5 RTK cache → Task 7. §6 UI/widget (role, routing, entry, GuildThread scope, realtime scope guard) → Tasks 7–9. §7 unread parity → Task 10. §8 i18n → Task 9, tests distributed across Tasks 3–10, RLS manual check → Task 11.
- All spec sections map to a task.

**Type consistency:**
- `ChatScope` defined in Task 3, consumed in Tasks 4–10 with the same `'all' | 'officers'` literal.
- Endpoint arg shape `{ guildId, scope }` defined in Task 7 and used identically in Tasks 9–10.
- `Guild.role` defined in Task 8, consumed in Tasks 9–10.
- `createGuildMessage(guildId, body, attachmentUrl, scope)` signature consistent between Task 4 (def) and Task 6 (call).

**Placeholder scan:** No TBD/TODO; each code step shows concrete code. The few "mirror the existing pattern" notes point at named, existing files (test mocks) rather than deferring real logic.

**Scope:** Single coherent feature; no decomposition needed.
