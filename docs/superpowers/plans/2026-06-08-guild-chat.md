# Guild Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/guild-chat` page where guild members post messages in a thread, mirroring the calendar page layout (UpcomingEventsStrip + glassmorphism panel, header with only the guild dropdown), plus a sidebar item with an unread dot.

**Architecture:** New `entities/guild-message` (RTK Query on `baseApi` via `injectEndpoints`, Next.js route handlers as transport, Supabase + RLS). Thread UI is lifted into `shared/ui` (`MessageBubble`, `MessageComposer`) and reused by both event comments and guild chat. Guild selection moves into a new `features/select-guild`. Delivery is polling (60s), mirroring the existing event-comment pattern.

**Tech Stack:** Next.js 16 App Router, React 19, Redux Toolkit + RTK Query, Supabase (RLS), CSS Modules, next-intl, Vitest + Testing Library.

**Conventions for the implementer:**
- No mid-task commits beyond the per-task commit shown; do not commit unless the step says so.
- Run tests with `pnpm test:run <path>` (single run) and `pnpm lint` / `pnpm lint:fsd` where noted.
- All new server data access goes through route handlers; client never calls Supabase directly.
- Match existing file style. No inline styles. English everywhere.

---

## File Structure

**Create:**
- DB: `guild_messages`, `guild_message_reads` tables (Supabase migration) + `src/shared/api/supabase/types.ts` edits.
- `src/entities/guild-message/model/types.ts`
- `src/entities/guild-message/api/mapMessageRow.ts`
- `src/entities/guild-message/api/getGuildMessages.ts` (+ `.test.ts`)
- `src/entities/guild-message/api/createGuildMessage.ts` (+ `.test.ts`)
- `src/entities/guild-message/api/updateGuildMessage.ts`
- `src/entities/guild-message/api/deleteGuildMessage.ts`
- `src/entities/guild-message/api/getGuildChatReadState.ts`
- `src/entities/guild-message/api/markGuildChatRead.ts`
- `src/entities/guild-message/api/getGuildChatUnread.ts` (+ `.test.ts`)
- `src/entities/guild-message/api/guildMessageApi.ts`
- `src/entities/guild-message/index.ts`
- `src/app/api/guilds/[id]/messages/route.ts`
- `src/app/api/guilds/[id]/messages/[messageId]/route.ts`
- `src/app/api/guilds/[id]/messages/read/route.ts`
- `src/app/api/guilds/[id]/messages/unread/route.ts`
- `src/shared/ui/MessageBubble/MessageBubble.tsx` + `.module.css` + `index.ts` (+ `.test.tsx`)
- `src/shared/ui/MessageComposer/MessageComposer.tsx` + `.module.css` + `index.ts`
- `src/features/select-guild/model/useGuildSelection.ts` (+ `.test.tsx`) + `ui/GuildSelect.tsx` + `index.ts`
- `src/shared/ui/Panel/Panel.tsx` + `.module.css` + `index.ts`
- `src/widgets/guild-chat/ui/GuildChat.tsx` + `.module.css` + `index.ts` + `ui/GuildChat.test.tsx`
- `src/app/guild-chat/page.tsx`

**Modify:**
- `src/shared/api/baseApi.ts` (tag types)
- `src/features/event-detail/ui/CommentItem.tsx`, `CommentInput.tsx` (render shared primitives; delete their `.module.css`)
- `src/widgets/calendar/ui/CalendarGrid.tsx`, `CalendarGrid.module.css` (use `Panel`, import hook/dropdown from `features/select-guild`)
- delete `src/widgets/calendar/model/useGuildSelection.ts` + `.test.tsx`
- `src/widgets/sidebar/model/navItems.ts`, `ui/Sidebar.tsx`, `ui/SidebarItem.tsx`, `ui/Sidebar.module.css`
- `messages/en.json`, `messages/ru.json`

**No proxy change needed:** `src/proxy.ts` denies all unauthenticated routes by default except `/login` and `/auth/*`, so `/guild-chat` is already protected.

---

## Task 1: Database tables + types

**Files:**
- Supabase migration (via `mcp__supabase__apply_migration`)
- Modify: `src/shared/api/supabase/types.ts`

- [ ] **Step 1: Inspect current schema**

Run `mcp__supabase__list_tables` and confirm `event_comments` / `event_comment_reads` exist as the reference shape. Note the project follows `project_supabase_migrations` memory: apply DDL via MCP, then hand-edit `types.ts`.

- [ ] **Step 2: Apply migration**

Use `mcp__supabase__apply_migration` with name `guild_chat` and this SQL:

```sql
create table public.guild_messages (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guild_messages_guild_created_idx
  on public.guild_messages (guild_id, created_at);

create table public.guild_message_reads (
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  last_read_at timestamptz not null default now(),
  primary key (guild_id, user_id)
);

alter table public.guild_messages enable row level security;
alter table public.guild_message_reads enable row level security;

-- Membership predicate helper inlined into policies.
create policy "guild_messages_select_members" on public.guild_messages
  for select using (
    exists (select 1 from public.guild_members gm
            where gm.guild_id = guild_messages.guild_id and gm.user_id = auth.uid())
  );
create policy "guild_messages_insert_members" on public.guild_messages
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.guild_members gm
                where gm.guild_id = guild_messages.guild_id and gm.user_id = auth.uid())
  );
create policy "guild_messages_update_own" on public.guild_messages
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "guild_messages_delete_own" on public.guild_messages
  for delete using (user_id = auth.uid());

create policy "guild_message_reads_select_own" on public.guild_message_reads
  for select using (user_id = auth.uid());
create policy "guild_message_reads_insert_own" on public.guild_message_reads
  for insert with check (user_id = auth.uid());
create policy "guild_message_reads_update_own" on public.guild_message_reads
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
```

- [ ] **Step 3: Verify**

Run `mcp__supabase__list_tables` again; confirm both tables exist with the policies. Run `mcp__supabase__get_advisors` (security) and confirm no new RLS-disabled warnings for these tables.

- [ ] **Step 4: Regenerate / hand-edit types**

Run `mcp__supabase__generate_typescript_types`, then hand-merge the `guild_messages` and `guild_message_reads` `Row`/`Insert`/`Update` definitions into `src/shared/api/supabase/types.ts` (follow the existing `event_comments` block formatting; do not wholesale-overwrite the file).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: passes (no references yet, just new types).

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat(guild-chat): add guild_messages and guild_message_reads tables"
```

---

## Task 2: Register RTK Query tag types

**Files:**
- Modify: `src/shared/api/baseApi.ts`

- [ ] **Step 1: Add tags**

Replace the `tagTypes` array:

```ts
  tagTypes: ['Event', 'Participant', 'GuildMember', 'Guild', 'Notification', 'JoinRequest', 'EventJoinRequest', 'Comment', 'CommentRead', 'GuildMessage', 'GuildChatRead'],
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

```bash
git add src/shared/api/baseApi.ts
git commit -m "feat(guild-chat): register GuildMessage and GuildChatRead RTK tags"
```

---

## Task 3: Entity model + row mapper

**Files:**
- Create: `src/entities/guild-message/model/types.ts`
- Create: `src/entities/guild-message/api/mapMessageRow.ts`

- [ ] **Step 1: Types**

`src/entities/guild-message/model/types.ts`:

```ts
export interface GuildMessage {
  id: string;
  guildId: string;
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

- [ ] **Step 2: Row mapper**

`src/entities/guild-message/api/mapMessageRow.ts`:

```ts
import type { GuildMessage } from '../model/types';

export const MESSAGE_SELECT =
  'id, guild_id, user_id, body, created_at, updated_at, profiles(full_name, avatar_url)';

interface MessageRow {
  id: string;
  guild_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

export const mapMessageRow = (row: MessageRow): GuildMessage => ({
  id: row.id,
  guildId: row.guild_id,
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

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

```bash
git add src/entities/guild-message/model/types.ts src/entities/guild-message/api/mapMessageRow.ts
git commit -m "feat(guild-chat): add GuildMessage type and row mapper"
```

---

## Task 4: Server helper — getGuildMessages (TDD)

**Files:**
- Create: `src/entities/guild-message/api/getGuildMessages.ts`
- Test: `src/entities/guild-message/api/getGuildMessages.test.ts`

- [ ] **Step 1: Write failing test**

`src/entities/guild-message/api/getGuildMessages.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGuildMessages } from './getGuildMessages';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ from }) as never);

describe('getGuildMessages', () => {
  it('maps rows to GuildMessage shape', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: [
      { id: 'm1', guild_id: 'g1', user_id: 'u2', body: 'hi', created_at: '2026-06-05T10:00:00Z', updated_at: '2026-06-05T10:00:00Z', profiles: { full_name: 'Bob', avatar_url: 'a.png' } },
    ] }));
    useClient(from);

    const result = await getGuildMessages('g1');
    expect(result).toEqual([
      { id: 'm1', guildId: 'g1', userId: 'u2', body: 'hi', createdAt: '2026-06-05T10:00:00Z', updatedAt: '2026-06-05T10:00:00Z', profile: { fullName: 'Bob', avatarUrl: 'a.png' } },
    ]);
  });

  it('throws on query error', async () => {
    useClient(vi.fn().mockReturnValueOnce(query({ error: new Error('boom') })));
    await expect(getGuildMessages('g1')).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run test — verify fail**

Run: `pnpm test:run src/entities/guild-message/api/getGuildMessages.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/entities/guild-message/api/getGuildMessages.ts`:

```ts
import { createClient } from '@/shared/api/supabase/server';
import type { GuildMessage } from '../model/types';
import { MESSAGE_SELECT, mapMessageRow } from './mapMessageRow';

export const getGuildMessages = async (guildId: string): Promise<GuildMessage[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('guild_messages')
    .select(MESSAGE_SELECT)
    .eq('guild_id', guildId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMessageRow);
};
```

- [ ] **Step 4: Run test — verify pass**

Run: `pnpm test:run src/entities/guild-message/api/getGuildMessages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/guild-message/api/getGuildMessages.ts src/entities/guild-message/api/getGuildMessages.test.ts
git commit -m "feat(guild-chat): add getGuildMessages server helper"
```

---

## Task 5: Server helper — createGuildMessage (TDD)

**Files:**
- Create: `src/entities/guild-message/api/createGuildMessage.ts`
- Test: `src/entities/guild-message/api/createGuildMessage.test.ts`

- [ ] **Step 1: Write failing test**

`src/entities/guild-message/api/createGuildMessage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGuildMessage, InvalidGuildMessageError } from './createGuildMessage';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('createGuildMessage', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(createGuildMessage('g1', 'hi')).rejects.toThrow('Not authenticated');
  });

  it('rejects empty body', async () => {
    useClient({ id: 'u1' }, vi.fn());
    await expect(createGuildMessage('g1', '   ')).rejects.toBeInstanceOf(InvalidGuildMessageError);
  });

  it('rejects body over 2000 chars', async () => {
    useClient({ id: 'u1' }, vi.fn());
    await expect(createGuildMessage('g1', 'a'.repeat(2001))).rejects.toBeInstanceOf(InvalidGuildMessageError);
  });

  it('inserts trimmed body and returns mapped message', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: {
      id: 'm1', guild_id: 'g1', user_id: 'u1', body: 'hi', created_at: 't', updated_at: 't', profiles: { full_name: 'Me', avatar_url: null },
    } }));
    useClient({ id: 'u1' }, from);

    const result = await createGuildMessage('g1', '  hi  ');
    expect(result.id).toBe('m1');
    expect(result.profile.fullName).toBe('Me');
  });
});
```

- [ ] **Step 2: Run test — verify fail**

Run: `pnpm test:run src/entities/guild-message/api/createGuildMessage.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/entities/guild-message/api/createGuildMessage.ts`:

```ts
import { createClient } from '@/shared/api/supabase/server';
import type { GuildMessage } from '../model/types';
import { MESSAGE_SELECT, mapMessageRow } from './mapMessageRow';

export const MAX_MESSAGE_LENGTH = 2000;

/** Thrown when the message body is empty or exceeds the length limit. */
export class InvalidGuildMessageError extends Error {}

export const createGuildMessage = async (
  guildId: string,
  body: string,
): Promise<GuildMessage> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidGuildMessageError('Message is empty');
  if (trimmed.length > MAX_MESSAGE_LENGTH) throw new InvalidGuildMessageError('Message is too long');

  const { data, error } = await supabase
    .from('guild_messages')
    .insert({ guild_id: guildId, user_id: user.id, body: trimmed })
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create message');
  return mapMessageRow(data);
};
```

- [ ] **Step 4: Run test — verify pass**

Run: `pnpm test:run src/entities/guild-message/api/createGuildMessage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/guild-message/api/createGuildMessage.ts src/entities/guild-message/api/createGuildMessage.test.ts
git commit -m "feat(guild-chat): add createGuildMessage server helper"
```

---

## Task 6: Server helpers — update + delete

**Files:**
- Create: `src/entities/guild-message/api/updateGuildMessage.ts`
- Create: `src/entities/guild-message/api/deleteGuildMessage.ts`

- [ ] **Step 1: Implement update**

`src/entities/guild-message/api/updateGuildMessage.ts`:

```ts
import { createClient } from '@/shared/api/supabase/server';
import type { GuildMessage } from '../model/types';
import { MESSAGE_SELECT, mapMessageRow } from './mapMessageRow';
import { InvalidGuildMessageError, MAX_MESSAGE_LENGTH } from './createGuildMessage';

export const updateGuildMessage = async (
  messageId: string,
  body: string,
): Promise<GuildMessage> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidGuildMessageError('Message is empty');
  if (trimmed.length > MAX_MESSAGE_LENGTH) throw new InvalidGuildMessageError('Message is too long');

  const { data, error } = await supabase
    .from('guild_messages')
    .update({ body: trimmed, updated_at: new Date().toISOString() })
    .eq('id', messageId)
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to update message');
  return mapMessageRow(data);
};
```

- [ ] **Step 2: Implement delete**

`src/entities/guild-message/api/deleteGuildMessage.ts`:

```ts
import { createClient } from '@/shared/api/supabase/server';

export const deleteGuildMessage = async (messageId: string): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('guild_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
};
```

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

```bash
git add src/entities/guild-message/api/updateGuildMessage.ts src/entities/guild-message/api/deleteGuildMessage.ts
git commit -m "feat(guild-chat): add update/delete message server helpers"
```

---

## Task 7: Server helpers — read state + mark read

**Files:**
- Create: `src/entities/guild-message/api/getGuildChatReadState.ts`
- Create: `src/entities/guild-message/api/markGuildChatRead.ts`

- [ ] **Step 1: Implement read state**

`src/entities/guild-message/api/getGuildChatReadState.ts`:

```ts
import { createClient } from '@/shared/api/supabase/server';

/** Returns the current user's last-read timestamp for a guild's chat. */
export const getGuildChatReadState = async (
  guildId: string,
): Promise<{ lastReadAt: string | null }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('guild_message_reads')
    .select('last_read_at')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return { lastReadAt: data?.last_read_at ?? null };
};
```

- [ ] **Step 2: Implement mark read**

`src/entities/guild-message/api/markGuildChatRead.ts`:

```ts
import { createClient } from '@/shared/api/supabase/server';

/** Marks a guild's chat as read for the current user (stores `last_read_at`). */
export const markGuildChatRead = async (guildId: string): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('guild_message_reads')
    .upsert(
      { guild_id: guildId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: 'guild_id,user_id' },
    );
  if (error) throw error;
};
```

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

```bash
git add src/entities/guild-message/api/getGuildChatReadState.ts src/entities/guild-message/api/markGuildChatRead.ts
git commit -m "feat(guild-chat): add read-state server helpers"
```

---

## Task 8: Server helper — getGuildChatUnread (TDD)

**Files:**
- Create: `src/entities/guild-message/api/getGuildChatUnread.ts`
- Test: `src/entities/guild-message/api/getGuildChatUnread.test.ts`

- [ ] **Step 1: Write failing test**

`src/entities/guild-message/api/getGuildChatUnread.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGuildChatUnread } from './getGuildChatUnread';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

// First `from` call = read state, second = messages list.
const useClient = (user: { id: string }, read: unknown, messages: unknown[]) => {
  const from = vi.fn()
    .mockReturnValueOnce(query({ data: read }))
    .mockReturnValueOnce(query({ data: messages }));
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);
  return from;
};

describe('getGuildChatUnread', () => {
  it('reports unread when another user posted after last read', async () => {
    useClient(
      { id: 'u1' },
      { last_read_at: '2026-06-05T10:00:00Z' },
      [{ user_id: 'u2', created_at: '2026-06-05T11:00:00Z' }],
    );
    expect(await getGuildChatUnread('g1')).toEqual({ hasUnread: true });
  });

  it('ignores the viewer’s own newer messages', async () => {
    useClient(
      { id: 'u1' },
      { last_read_at: '2026-06-05T10:00:00Z' },
      [{ user_id: 'u1', created_at: '2026-06-05T11:00:00Z' }],
    );
    expect(await getGuildChatUnread('g1')).toEqual({ hasUnread: false });
  });

  it('treats all others’ messages as unread when never read', async () => {
    useClient(
      { id: 'u1' },
      null,
      [{ user_id: 'u2', created_at: '2026-06-05T09:00:00Z' }],
    );
    expect(await getGuildChatUnread('g1')).toEqual({ hasUnread: true });
  });
});
```

- [ ] **Step 2: Run test — verify fail**

Run: `pnpm test:run src/entities/guild-message/api/getGuildChatUnread.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/entities/guild-message/api/getGuildChatUnread.ts` (uses only mock-supported chain methods — `select/eq/order/maybeSingle`):

```ts
import { createClient } from '@/shared/api/supabase/server';

/**
 * Lightweight unread check for the sidebar dot: true when any message from
 * another user is newer than the viewer's last-read timestamp.
 */
export const getGuildChatUnread = async (
  guildId: string,
): Promise<{ hasUnread: boolean }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: read } = await supabase
    .from('guild_message_reads')
    .select('last_read_at')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();
  const lastReadAt: string | null = read?.last_read_at ?? null;

  const { data: rows, error } = await supabase
    .from('guild_messages')
    .select('user_id, created_at')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const hasUnread = (rows ?? []).some(
    (r: { user_id: string; created_at: string }) =>
      r.user_id !== user.id && (!lastReadAt || r.created_at > lastReadAt),
  );
  return { hasUnread };
};
```

- [ ] **Step 4: Run test — verify pass**

Run: `pnpm test:run src/entities/guild-message/api/getGuildChatUnread.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/guild-message/api/getGuildChatUnread.ts src/entities/guild-message/api/getGuildChatUnread.test.ts
git commit -m "feat(guild-chat): add getGuildChatUnread server helper"
```

---

## Task 9: RTK Query API slice + entity barrel

**Files:**
- Create: `src/entities/guild-message/api/guildMessageApi.ts`
- Create: `src/entities/guild-message/index.ts`

- [ ] **Step 1: API slice**

`src/entities/guild-message/api/guildMessageApi.ts` (mirrors `commentApi`; optimistic append on add, optimistic read-state write on mark-read):

```ts
import { baseApi } from '@/shared/api/baseApi';
import type { GuildMessage } from '../model/types';

export const guildMessageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGuildMessages: builder.query<GuildMessage[], string>({
      query: (guildId) => `guilds/${guildId}/messages`,
      providesTags: (_, __, guildId) => [
        { type: 'GuildMessage' as const, id: `LIST-${guildId}` },
      ],
    }),
    addGuildMessage: builder.mutation<GuildMessage, { guildId: string; body: string }>({
      query: ({ guildId, body }) => ({
        url: `guilds/${guildId}/messages`,
        method: 'POST',
        body: { body },
      }),
      async onQueryStarted({ guildId }, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled;
          dispatch(
            guildMessageApi.util.updateQueryData('getGuildMessages', guildId, (draft) => {
              if (!draft.some((m) => m.id === created.id)) draft.push(created);
            }),
          );
        } catch {
          // GuildChat surfaces the error toast.
        }
      },
    }),
    updateGuildMessage: builder.mutation<
      GuildMessage,
      { guildId: string; messageId: string; body: string }
    >({
      query: ({ guildId, messageId, body }) => ({
        url: `guilds/${guildId}/messages/${messageId}`,
        method: 'PATCH',
        body: { body },
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'GuildMessage' as const, id: `LIST-${guildId}` },
      ],
    }),
    deleteGuildMessage: builder.mutation<
      { deleted: boolean },
      { guildId: string; messageId: string }
    >({
      query: ({ guildId, messageId }) => ({
        url: `guilds/${guildId}/messages/${messageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'GuildMessage' as const, id: `LIST-${guildId}` },
      ],
    }),
    getGuildChatReadState: builder.query<{ lastReadAt: string | null }, string>({
      query: (guildId) => `guilds/${guildId}/messages/read`,
      providesTags: (_, __, guildId) => [
        { type: 'GuildChatRead' as const, id: `LIST-${guildId}` },
      ],
    }),
    markGuildChatRead: builder.mutation<{ marked: boolean }, string>({
      query: (guildId) => ({ url: `guilds/${guildId}/messages/read`, method: 'POST' }),
      async onQueryStarted(guildId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          guildMessageApi.util.updateQueryData('getGuildChatReadState', guildId, (draft) => {
            draft.lastReadAt = new Date().toISOString();
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_, __, guildId) => [
        { type: 'GuildChatRead' as const, id: `LIST-${guildId}` },
      ],
    }),
    getGuildChatUnread: builder.query<{ hasUnread: boolean }, string>({
      query: (guildId) => `guilds/${guildId}/messages/unread`,
      providesTags: (_, __, guildId) => [
        { type: 'GuildChatRead' as const, id: `LIST-${guildId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGuildMessagesQuery,
  useAddGuildMessageMutation,
  useUpdateGuildMessageMutation,
  useDeleteGuildMessageMutation,
  useGetGuildChatReadStateQuery,
  useMarkGuildChatReadMutation,
  useGetGuildChatUnreadQuery,
} = guildMessageApi;
```

- [ ] **Step 2: Barrel**

`src/entities/guild-message/index.ts`:

```ts
export {
  guildMessageApi,
  useGetGuildMessagesQuery,
  useAddGuildMessageMutation,
  useUpdateGuildMessageMutation,
  useDeleteGuildMessageMutation,
  useGetGuildChatReadStateQuery,
  useMarkGuildChatReadMutation,
  useGetGuildChatUnreadQuery,
} from './api/guildMessageApi';
export type { GuildMessage } from './model/types';
```

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

```bash
git add src/entities/guild-message/api/guildMessageApi.ts src/entities/guild-message/index.ts
git commit -m "feat(guild-chat): add guildMessageApi RTK Query slice"
```

---

## Task 10: Route handlers — list + create (TDD)

**Files:**
- Create: `src/app/api/guilds/[id]/messages/route.ts`
- Test: `src/app/api/guilds/[id]/messages/route.test.ts`

- [ ] **Step 1: Write failing test**

`src/app/api/guilds/[id]/messages/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { getGuildMessages } from '@/entities/guild-message/api/getGuildMessages';
import { createGuildMessage, InvalidGuildMessageError } from '@/entities/guild-message/api/createGuildMessage';
import { requireUser } from '@/shared/api/guildAuth';

vi.mock('@/entities/guild-message/api/getGuildMessages');
vi.mock('@/entities/guild-message/api/createGuildMessage');
vi.mock('@/shared/api/guildAuth');
beforeEach(() => vi.clearAllMocks());

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const okAuth = () => vi.mocked(requireUser).mockResolvedValue({ ok: true } as never);

describe('GET /api/guilds/[id]/messages', () => {
  it('returns messages', async () => {
    vi.mocked(getGuildMessages).mockResolvedValue([{ id: 'm1' }] as never);
    const res = await GET({} as NextRequest, params('g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'm1' }]);
  });

  it('returns 500 on failure', async () => {
    vi.mocked(getGuildMessages).mockRejectedValue(new Error('boom'));
    const res = await GET({} as NextRequest, params('g1'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/guilds/[id]/messages', () => {
  it('401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) } as never);
    const req = { json: async () => ({ body: 'hi' }) } as unknown as NextRequest;
    const res = await POST(req, params('g1'));
    expect(res.status).toBe(401);
  });

  it('creates a message', async () => {
    okAuth();
    vi.mocked(createGuildMessage).mockResolvedValue({ id: 'm1' } as never);
    const req = { json: async () => ({ body: 'hi' }) } as unknown as NextRequest;
    const res = await POST(req, params('g1'));
    expect(res.status).toBe(201);
    expect(createGuildMessage).toHaveBeenCalledWith('g1', 'hi');
  });

  it('400 on invalid body type', async () => {
    okAuth();
    const req = { json: async () => ({ body: 123 }) } as unknown as NextRequest;
    const res = await POST(req, params('g1'));
    expect(res.status).toBe(400);
  });

  it('400 on InvalidGuildMessageError', async () => {
    okAuth();
    vi.mocked(createGuildMessage).mockRejectedValue(new InvalidGuildMessageError('too long'));
    const req = { json: async () => ({ body: 'x' }) } as unknown as NextRequest;
    const res = await POST(req, params('g1'));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test — verify fail**

Run: `pnpm test:run "src/app/api/guilds/[id]/messages/route.test.ts"`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/app/api/guilds/[id]/messages/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getGuildMessages } from '@/entities/guild-message/api/getGuildMessages';
import { createGuildMessage, InvalidGuildMessageError } from '@/entities/guild-message/api/createGuildMessage';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const messages = await getGuildMessages(id);
    return NextResponse.json(messages);
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
    const { body } = await request.json();
    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid message body' }, { status: 400 });
    }
    const message = await createGuildMessage(id, body);
    return NextResponse.json(message, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidGuildMessageError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test — verify pass**

Run: `pnpm test:run "src/app/api/guilds/[id]/messages/route.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/guilds/[id]/messages/route.ts" "src/app/api/guilds/[id]/messages/route.test.ts"
git commit -m "feat(guild-chat): add list/create message route handlers"
```

---

## Task 11: Route handlers — update + delete

**Files:**
- Create: `src/app/api/guilds/[id]/messages/[messageId]/route.ts`

- [ ] **Step 1: Implement**

`src/app/api/guilds/[id]/messages/[messageId]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { updateGuildMessage } from '@/entities/guild-message/api/updateGuildMessage';
import { deleteGuildMessage } from '@/entities/guild-message/api/deleteGuildMessage';
import { InvalidGuildMessageError } from '@/entities/guild-message/api/createGuildMessage';
import { requireUser } from '@/shared/api/guildAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { messageId } = await params;
    const { body } = await request.json();
    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid message body' }, { status: 400 });
    }
    const message = await updateGuildMessage(messageId, body);
    return NextResponse.json(message);
  } catch (e) {
    if (e instanceof InvalidGuildMessageError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { messageId } = await params;
    await deleteGuildMessage(messageId);
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

```bash
git add "src/app/api/guilds/[id]/messages/[messageId]/route.ts"
git commit -m "feat(guild-chat): add update/delete message route handlers"
```

---

## Task 12: Route handlers — read + unread

**Files:**
- Create: `src/app/api/guilds/[id]/messages/read/route.ts`
- Create: `src/app/api/guilds/[id]/messages/unread/route.ts`

- [ ] **Step 1: Implement read**

`src/app/api/guilds/[id]/messages/read/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getGuildChatReadState } from '@/entities/guild-message/api/getGuildChatReadState';
import { markGuildChatRead } from '@/entities/guild-message/api/markGuildChatRead';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const state = await getGuildChatReadState(id);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch read state' }, { status: 500 });
  }
}

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    await markGuildChatRead(id);
    return NextResponse.json({ marked: true });
  } catch {
    return NextResponse.json({ error: 'Failed to mark chat read' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Implement unread**

`src/app/api/guilds/[id]/messages/unread/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getGuildChatUnread } from '@/entities/guild-message/api/getGuildChatUnread';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const state = await getGuildChatUnread(id);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch unread state' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

```bash
git add "src/app/api/guilds/[id]/messages/read/route.ts" "src/app/api/guilds/[id]/messages/unread/route.ts"
git commit -m "feat(guild-chat): add read/unread message route handlers"
```

---

## Task 13: shared/ui/MessageBubble (TDD)

Generic, domain-agnostic message bubble extracted from `CommentItem`. All labels passed as props.

**Files:**
- Create: `src/shared/ui/MessageBubble/MessageBubble.tsx` + `MessageBubble.module.css` + `index.ts`
- Test: `src/shared/ui/MessageBubble/MessageBubble.test.tsx`

- [ ] **Step 1: Write failing test**

`src/shared/ui/MessageBubble/MessageBubble.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MessageBubble } from './MessageBubble';

const labels = { edited: 'edited', edit: 'edit', delete: 'delete', save: 'save', cancel: 'cancel', confirmDelete: 'confirm-delete' };
const base = {
  authorName: 'Alice', avatarUrl: null, body: 'Hello there',
  createdAt: '2026-06-05T10:00:00Z', updatedAt: '2026-06-05T10:00:00Z',
  locale: 'en', labels, maxLength: 2000,
};

describe('MessageBubble', () => {
  it('renders body and author', () => {
    render(<MessageBubble {...base} isOwn={false} />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows edited marker when updatedAt is later', () => {
    render(<MessageBubble {...base} updatedAt="2026-06-05T12:00:00Z" isOwn={false} />);
    expect(screen.getByText('edited')).toBeInTheDocument();
  });

  it('hides edit/delete for non-owners', () => {
    render(<MessageBubble {...base} isOwn={false} />);
    expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
  });

  it('enters edit mode and saves edited text', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MessageBubble {...base} isOwn onSave={onSave} onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'edit' }));
    const field = screen.getByRole('textbox');
    await user.clear(field);
    await user.type(field, 'Updated');
    await user.click(screen.getByText('save'));
    expect(onSave).toHaveBeenCalledWith('Updated');
  });
});
```

- [ ] **Step 2: Run test — verify fail**

Run: `pnpm test:run src/shared/ui/MessageBubble/MessageBubble.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement component**

`src/shared/ui/MessageBubble/MessageBubble.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import dayjs from '@/shared/lib/dayjs';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import styles from './MessageBubble.module.css';

export interface MessageBubbleLabels {
  edited: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  confirmDelete: string;
}

interface MessageBubbleProps {
  authorName: string | null;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  isOwn: boolean;
  locale: string;
  labels: MessageBubbleLabels;
  maxLength?: number;
  onSave?: (body: string) => void | Promise<void>;
  onDelete?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  authorName,
  avatarUrl,
  body,
  createdAt,
  updatedAt,
  isOwn,
  locale,
  labels,
  maxLength = 2000,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isEdited = dayjs(updatedAt).diff(dayjs(createdAt), 'second') > 2;
  const time = dayjs(createdAt).locale(locale).fromNow();

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      await onSave?.(trimmed);
      setIsEditing(false);
    } catch {
      // Keep edit mode open so the draft is preserved; the consumer shows the error toast.
    }
  };

  const handleCancel = () => {
    setDraft(body);
    setIsEditing(false);
  };

  return (
    <div className={`${styles.item} ${isOwn ? styles.own : ''}`}>
      <UserAvatar avatarUrl={avatarUrl} name={authorName} size="md" />
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.name}>{authorName || '—'}</span>
          <span className={styles.meta}>{time}</span>
          {isEdited && (
            <>
              <span className={styles.meta} aria-hidden>·</span>
              <span className={styles.meta}>{labels.edited}</span>
            </>
          )}
        </div>

        {isEditing ? (
          <>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={maxLength} />
            <div className={styles.editActions}>
              <Button type="button" size="xs" variant="primary" onClick={handleSave} isLoading={isSaving}>
                {labels.save}
              </Button>
              <Button type="button" size="xs" variant="secondary" onClick={handleCancel} disabled={isSaving}>
                {labels.cancel}
              </Button>
            </div>
          </>
        ) : (
          <p className={styles.text}>{body}</p>
        )}
      </div>

      {isOwn && !isEditing && (
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            size="icon_sm"
            aria-label={labels.edit}
            className={styles.actionBtn}
            onClick={() => setIsEditing(true)}
          >
            <Edit2 size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon_sm"
            aria-label={labels.delete}
            className={styles.deleteBtn}
            onClick={() => setConfirmOpen(true)}
            isLoading={isDeleting}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { onDelete?.(); setConfirmOpen(false); }}
        title={labels.delete}
        description={labels.confirmDelete}
        confirmLabel={labels.delete}
      />
    </div>
  );
};
```

- [ ] **Step 4: CSS (moved verbatim from CommentItem.module.css)**

`src/shared/ui/MessageBubble/MessageBubble.module.css`:

```css
.item {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  max-width: 90%;
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px 16px 16px 4px;
}

.own {
  align-self: flex-end;
  background: rgba(96, 165, 250, 0.18);
  border-radius: 16px 16px 4px 16px;
}

.body { flex: 1; min-width: 0; }

.head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }

.name { font-weight: 600; font-size: 0.9rem; color: var(--accent-primary); }

.meta { font-size: 0.75rem; opacity: 0.6; }

.text {
  margin: 4px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9rem;
  line-height: 1.4;
}

.editActions { display: flex; gap: 8px; margin-top: 6px; }

.actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(20, 28, 46, 0.85);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.item:hover .actions,
.item:focus-within .actions { opacity: 1; }

.actionBtn:hover { color: var(--accent-primary); }

.deleteBtn:hover { color: #ff4d4d; }
```

- [ ] **Step 5: Barrel**

`src/shared/ui/MessageBubble/index.ts`:

```ts
export { MessageBubble } from './MessageBubble';
export type { MessageBubbleLabels } from './MessageBubble';
```

- [ ] **Step 6: Run test — verify pass**

Run: `pnpm test:run src/shared/ui/MessageBubble/MessageBubble.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/shared/ui/MessageBubble
git commit -m "feat(ui): add shared MessageBubble component"
```

---

## Task 14: shared/ui/MessageComposer

Generic composer extracted from `CommentInput`. Labels/placeholder passed as props.

**Files:**
- Create: `src/shared/ui/MessageComposer/MessageComposer.tsx` + `MessageComposer.module.css` + `index.ts`

- [ ] **Step 1: Implement component**

`src/shared/ui/MessageComposer/MessageComposer.tsx`:

```tsx
'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import styles from './MessageComposer.module.css';

interface MessageComposerProps {
  canWrite: boolean;
  onSubmit: (body: string) => void;
  isSubmitting?: boolean;
  placeholder: string;
  sendLabel: string;
  lockedPrompt: string;
  maxLength?: number;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  canWrite,
  onSubmit,
  isSubmitting = false,
  placeholder,
  sendLabel,
  lockedPrompt,
  maxLength = 2000,
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea: reset height, then match it to the content.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  if (!canWrite) {
    return <p className={styles.locked}>{lockedPrompt}</p>;
  }

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  // Enter sends; Shift+Enter inserts a newline.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        maxLength={maxLength}
      />
      {isSubmitting ? (
        <span className={styles.spinner} role="status" aria-label={sendLabel} />
      ) : (
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className={styles.sendButton}
          disabled={!value.trim()}
          aria-label={sendLabel}
        >
          <Send size={26} />
        </Button>
      )}
    </form>
  );
};
```

- [ ] **Step 2: CSS (moved verbatim from CommentInput.module.css)**

`src/shared/ui/MessageComposer/MessageComposer.module.css`:

```css
.form {
  position: relative;
  padding-top: 12px;
  margin-top: 12px;
  flex-shrink: 0;
}

.form .textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  max-height: 160px;
  padding-right: 52px;
  overflow-y: auto;
  resize: none;
  scrollbar-width: none;
}

.form .textarea::-webkit-scrollbar { display: none; }

.sendButton {
  position: absolute;
  right: 7px;
  top: calc(50% - 14px);
  color: var(--accent-primary);
}

.form .sendButton:hover:not(:disabled) {
  color: var(--accent-hover);
  background: transparent;
}

.sendButton:disabled { color: var(--text-secondary); }

.spinner {
  position: absolute;
  right: 11px;
  top: calc(50% - 10px);
  width: 28px;
  height: 28px;
  box-sizing: border-box;
  border: 2px solid var(--accent-primary);
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: message-send-spin 0.6s linear infinite;
}

@keyframes message-send-spin {
  to { transform: rotate(360deg); }
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

- [ ] **Step 3: Barrel**

`src/shared/ui/MessageComposer/index.ts`:

```ts
export { MessageComposer } from './MessageComposer';
```

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

```bash
git add src/shared/ui/MessageComposer
git commit -m "feat(ui): add shared MessageComposer component"
```

---

## Task 15: Refactor event-detail onto shared primitives

Make `CommentItem` / `CommentInput` thin adapters over the shared components. Existing tests must stay green (they query by text/role, not CSS classes).

**Files:**
- Modify: `src/features/event-detail/ui/CommentItem.tsx`
- Modify: `src/features/event-detail/ui/CommentInput.tsx`
- Delete: `src/features/event-detail/ui/CommentItem.module.css`, `CommentInput.module.css`

- [ ] **Step 1: Rewrite CommentItem**

`src/features/event-detail/ui/CommentItem.tsx`:

```tsx
'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MessageBubble } from '@/shared/ui/MessageBubble';
import type { EventComment } from '@/entities/comment';

interface CommentItemProps {
  comment: EventComment;
  isOwn: boolean;
  onSave?: (body: string) => void | Promise<void>;
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

  return (
    <MessageBubble
      authorName={comment.profile.fullName}
      avatarUrl={comment.profile.avatarUrl}
      body={comment.body}
      createdAt={comment.createdAt}
      updatedAt={comment.updatedAt}
      isOwn={isOwn}
      locale={locale}
      labels={{
        edited: t('edited'),
        edit: t('edit'),
        delete: t('delete'),
        save: t('save'),
        cancel: t('cancel'),
        confirmDelete: t('confirmDelete'),
      }}
      maxLength={2000}
      onSave={onSave}
      onDelete={onDelete}
      isSaving={isSaving}
      isDeleting={isDeleting}
    />
  );
};
```

- [ ] **Step 2: Rewrite CommentInput**

`src/features/event-detail/ui/CommentInput.tsx`:

```tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { MessageComposer } from '@/shared/ui/MessageComposer';

interface CommentInputProps {
  canWrite: boolean;
  onSubmit: (body: string) => void;
  isSubmitting?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({ canWrite, onSubmit, isSubmitting = false }) => {
  const t = useTranslations('EventComments');
  return (
    <MessageComposer
      canWrite={canWrite}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      placeholder={t('placeholder')}
      sendLabel={t('send')}
      lockedPrompt={t('lockedPrompt')}
      maxLength={2000}
    />
  );
};
```

- [ ] **Step 3: Delete now-unused CSS**

```bash
git rm src/features/event-detail/ui/CommentItem.module.css src/features/event-detail/ui/CommentInput.module.css
```

- [ ] **Step 4: Run event-detail tests — verify still green**

Run: `pnpm test:run src/features/event-detail`
Expected: PASS (CommentItem.test, CommentInput.test, CommentsTab.test). If `CommentInput.test.tsx` asserts a CSS-module classname directly, update that single assertion to query by role/label instead — do not change behavior.

- [ ] **Step 5: Lint FSD + commit**

Run: `pnpm lint:fsd`
Expected: no new violations.

```bash
git add src/features/event-detail/ui/CommentItem.tsx src/features/event-detail/ui/CommentInput.tsx
git commit -m "refactor(event-detail): render shared MessageBubble/MessageComposer"
```

---

## Task 16: features/select-guild (move guild selection)

**Files:**
- Create: `src/features/select-guild/model/useGuildSelection.ts`
- Create: `src/features/select-guild/model/useGuildSelection.test.tsx` (moved from calendar)
- Create: `src/features/select-guild/ui/GuildSelect.tsx`
- Create: `src/features/select-guild/index.ts`
- Modify: `src/widgets/calendar/ui/CalendarGrid.tsx`
- Delete: `src/widgets/calendar/model/useGuildSelection.ts`, `src/widgets/calendar/model/useGuildSelection.test.tsx`

- [ ] **Step 1: Move the hook verbatim**

Copy `src/widgets/calendar/model/useGuildSelection.ts` to `src/features/select-guild/model/useGuildSelection.ts` unchanged (same imports from `@/entities/guild` and `@/entities/user`).

- [ ] **Step 2: Move the hook test**

Move `src/widgets/calendar/model/useGuildSelection.test.tsx` to `src/features/select-guild/model/useGuildSelection.test.tsx`. Update any relative import of the hook to `./useGuildSelection` (path is identical, so likely no change).

- [ ] **Step 3: GuildSelect component**

`src/features/select-guild/ui/GuildSelect.tsx`:

```tsx
'use client';

import React from 'react';
import { Select } from '@/shared/ui/Select';

interface GuildOption {
  label: React.ReactNode;
  value: string;
  avatar?: string;
  avatarFallback?: React.ReactNode;
}

interface GuildSelectProps {
  value: string;
  options: GuildOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const GuildSelect: React.FC<GuildSelectProps> = ({ value, options, onValueChange, placeholder, className }) => (
  <Select
    value={value}
    onValueChange={onValueChange}
    options={options}
    placeholder={placeholder}
    className={className}
    truncate
  />
);
```

- [ ] **Step 4: Barrel**

`src/features/select-guild/index.ts`:

```ts
export { useGuildSelection } from './model/useGuildSelection';
export { GuildSelect } from './ui/GuildSelect';
```

- [ ] **Step 5: Update CalendarGrid imports + dropdown**

In `src/widgets/calendar/ui/CalendarGrid.tsx`:
- Remove `import { useGuildSelection } from '../model/useGuildSelection';`
- Remove `import { Select } from '@/shared/ui/Select';`
- Add `import { useGuildSelection, GuildSelect } from '@/features/select-guild';`
- Replace the guild `<Select … />` block (lines around the `guildSelect` wrapper) with:

```tsx
          <div className={styles.guildSelect}>
            <GuildSelect
              value={activeGuildId}
              onValueChange={handleGuildChange}
              options={guildOptions}
              placeholder="Выберите гильдию"
            />
          </div>
```

(Other `Select` usages for month/year remain — re-add `import { Select } from '@/shared/ui/Select';` since month/year still use it. Keep that import.)

- [ ] **Step 6: Delete old hook + test**

```bash
git rm src/widgets/calendar/model/useGuildSelection.ts src/widgets/calendar/model/useGuildSelection.test.tsx
```

- [ ] **Step 7: Verify**

Run: `pnpm test:run src/features/select-guild src/widgets/calendar`
Expected: PASS.
Run: `pnpm lint:fsd`
Expected: no new violations (calendar now imports a lower layer `features`, which is allowed).

- [ ] **Step 8: Commit**

```bash
git add src/features/select-guild src/widgets/calendar
git commit -m "refactor(guild): extract guild selection into features/select-guild"
```

---

## Task 17: shared/ui/Panel + use it in CalendarGrid

**Files:**
- Create: `src/shared/ui/Panel/Panel.tsx` + `Panel.module.css` + `index.ts`
- Modify: `src/widgets/calendar/ui/CalendarGrid.tsx`, `CalendarGrid.module.css`

- [ ] **Step 1: Panel component**

`src/shared/ui/Panel/Panel.tsx`:

```tsx
import React from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({ children, className }) => (
  <div className={`${styles.panel} ${className ?? ''}`}>{children}</div>
);
```

- [ ] **Step 2: Panel CSS (moved from CalendarGrid `.container`)**

`src/shared/ui/Panel/Panel.module.css`:

```css
.panel {
  padding: 2rem;
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--shadow-glass);
}
```

- [ ] **Step 3: Barrel**

`src/shared/ui/Panel/index.ts`:

```ts
export { Panel } from './Panel';
```

- [ ] **Step 4: Use Panel in CalendarGrid**

In `src/widgets/calendar/ui/CalendarGrid.tsx`:
- Add `import { Panel } from '@/shared/ui/Panel';`
- Replace the outer `<div className={styles.container}>…</div>` wrapper with `<Panel>…</Panel>`.

In `src/widgets/calendar/ui/CalendarGrid.module.css`: delete the `.container { … }` rule (now provided by Panel).

- [ ] **Step 5: Verify**

Run: `pnpm test:run src/widgets/calendar`
Expected: PASS.
Run: `pnpm exec tsc --noEmit`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/shared/ui/Panel src/widgets/calendar
git commit -m "refactor(ui): extract glassmorphism Panel and use it in calendar"
```

---

## Task 18: i18n strings

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`

- [ ] **Step 1: en.json**

Add `"guildChat": "Guild Chat"` to the `Common` object, and a new top-level `GuildChat` namespace:

```json
  "GuildChat": {
    "empty": "No messages yet. Say hello!",
    "placeholder": "Write a message…",
    "send": "Send",
    "edited": "edited",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel",
    "confirmDelete": "Delete this message?",
    "lockedPrompt": "Join this guild to write messages",
    "sendError": "Failed to send message",
    "updateError": "Failed to update message",
    "deleteError": "Failed to delete message"
  }
```

- [ ] **Step 2: ru.json**

Add `"guildChat": "Чат гильдии"` to `Common`, and:

```json
  "GuildChat": {
    "empty": "Пока нет сообщений. Поздоровайтесь!",
    "placeholder": "Написать сообщение…",
    "send": "Отправить",
    "edited": "изменено",
    "edit": "Изменить",
    "delete": "Удалить",
    "save": "Сохранить",
    "cancel": "Отмена",
    "confirmDelete": "Удалить это сообщение?",
    "lockedPrompt": "Вступите в гильдию, чтобы писать сообщения",
    "sendError": "Не удалось отправить сообщение",
    "updateError": "Не удалось изменить сообщение",
    "deleteError": "Не удалось удалить сообщение"
  }
```

- [ ] **Step 3: Validate JSON + commit**

Run: `node -e "require('./messages/en.json'); require('./messages/ru.json'); console.log('ok')"`
Expected: `ok`.

```bash
git add messages/en.json messages/ru.json
git commit -m "feat(guild-chat): add GuildChat i18n strings"
```

---

## Task 19: widgets/guild-chat (TDD)

**Files:**
- Create: `src/widgets/guild-chat/ui/GuildChat.tsx` + `GuildChat.module.css` + barrel
- Create: `src/widgets/guild-chat/index.ts`
- Test: `src/widgets/guild-chat/ui/GuildChat.test.tsx`

- [ ] **Step 1: Write failing test**

`src/widgets/guild-chat/ui/GuildChat.test.tsx` (verifies empty-state render + composer presence with mocked hooks):

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildChat } from './GuildChat';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const mockAdd = vi.fn();
vi.mock('@/entities/guild-message', () => ({
  useGetGuildMessagesQuery: () => ({ data: [], isLoading: false }),
  useGetGuildChatReadStateQuery: () => ({ data: { lastReadAt: null } }),
  useAddGuildMessageMutation: () => [mockAdd, { isLoading: false }],
  useUpdateGuildMessageMutation: () => [vi.fn(), {}],
  useDeleteGuildMessageMutation: () => [vi.fn(), {}],
  useMarkGuildChatReadMutation: () => [vi.fn()],
}));

vi.mock('@/features/select-guild', () => ({
  useGuildSelection: () => ({ activeGuildId: 'g1', guildOptions: [], handleGuildChange: vi.fn() }),
  GuildSelect: () => <div data-testid="guild-select" />,
}));

const guilds = [{ id: 'g1', name: 'Test', avatarUrl: null }] as never;

beforeEach(() => vi.clearAllMocks());

describe('GuildChat', () => {
  it('renders the guild select and empty state', () => {
    render(<GuildChat guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.getByTestId('guild-select')).toBeInTheDocument();
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('renders the composer placeholder for a member', () => {
    render(<GuildChat guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.getByPlaceholderText('placeholder')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify fail**

Run: `pnpm test:run src/widgets/guild-chat/ui/GuildChat.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement widget**

`src/widgets/guild-chat/ui/GuildChat.tsx` (mark-read + autoscroll logic mirrored from `CommentsTab`):

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Panel } from '@/shared/ui/Panel';
import { MessageBubble } from '@/shared/ui/MessageBubble';
import { MessageComposer } from '@/shared/ui/MessageComposer';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import type { Guild } from '@/entities/guild';
import {
  useGetGuildMessagesQuery,
  useGetGuildChatReadStateQuery,
  useAddGuildMessageMutation,
  useUpdateGuildMessageMutation,
  useDeleteGuildMessageMutation,
  useMarkGuildChatReadMutation,
} from '@/entities/guild-message';
import styles from './GuildChat.module.css';

interface GuildChatProps {
  guilds: Guild[];
  userId?: string;
  initialGuildId?: string;
}

export const GuildChat: React.FC<GuildChatProps> = ({ guilds, userId, initialGuildId }) => {
  const t = useTranslations('GuildChat');
  const locale = useLocale();
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds, initialGuildId, userId);

  const { data: messages = [], isLoading } = useGetGuildMessagesQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
    pollingInterval: 60_000,
    refetchOnFocus: true,
    skipPollingIfUnfocused: true,
  });
  const { data: readState } = useGetGuildChatReadStateQuery(activeGuildId ?? '', { skip: !activeGuildId });
  const [addMessage, { isLoading: isAdding }] = useAddGuildMessageMutation();
  const [updateMessage, updateState] = useUpdateGuildMessageMutation();
  const [deleteMessage, deleteState] = useDeleteGuildMessageMutation();
  const [markRead] = useMarkGuildChatReadMutation();
  const listRef = useRef<HTMLDivElement>(null);

  const hasUnread =
    !!readState &&
    messages.some(
      (m) =>
        m.userId !== userId &&
        (!readState.lastReadAt || m.createdAt > readState.lastReadAt),
    );

  useEffect(() => {
    if (activeGuildId && hasUnread) markRead(activeGuildId);
  }, [activeGuildId, hasUnread, markRead]);

  const pendingScrollRef = useRef(true);
  const isAtBottomRef = useRef(true);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (pendingScrollRef.current || isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      pendingScrollRef.current = false;
    }
  }, [messages.length]);

  const labels = {
    edited: t('edited'),
    edit: t('edit'),
    delete: t('delete'),
    save: t('save'),
    cancel: t('cancel'),
    confirmDelete: t('confirmDelete'),
  };

  const handleAdd = async (body: string) => {
    if (!activeGuildId) return;
    try {
      await addMessage({ guildId: activeGuildId, body }).unwrap();
      pendingScrollRef.current = true;
    } catch {
      toast.error(t('sendError'));
    }
  };

  const handleUpdate = async (messageId: string, body: string) => {
    if (!activeGuildId) return;
    try {
      await updateMessage({ guildId: activeGuildId, messageId, body }).unwrap();
    } catch (e) {
      toast.error(t('updateError'));
      throw e;
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!activeGuildId) return;
    try {
      await deleteMessage({ guildId: activeGuildId, messageId }).unwrap();
    } catch {
      toast.error(t('deleteError'));
    }
  };

  return (
    <Panel>
      <div className={styles.header}>
        <div className={styles.guildSelect}>
          <GuildSelect value={activeGuildId} onValueChange={handleGuildChange} options={guildOptions} />
        </div>
      </div>

      <div className={styles.chat}>
        <div className={styles.list} ref={listRef} onScroll={handleScroll}>
          {!isLoading && messages.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              authorName={m.profile.fullName}
              avatarUrl={m.profile.avatarUrl}
              body={m.body}
              createdAt={m.createdAt}
              updatedAt={m.updatedAt}
              isOwn={m.userId === userId}
              locale={locale}
              labels={labels}
              maxLength={2000}
              onSave={(body) => handleUpdate(m.id, body)}
              onDelete={() => handleDelete(m.id)}
              isSaving={updateState.isLoading && updateState.originalArgs?.messageId === m.id}
              isDeleting={deleteState.isLoading && deleteState.originalArgs?.messageId === m.id}
            />
          ))}
        </div>
        <MessageComposer
          canWrite={!!userId}
          onSubmit={handleAdd}
          isSubmitting={isAdding}
          placeholder={t('placeholder')}
          sendLabel={t('send')}
          lockedPrompt={t('lockedPrompt')}
          maxLength={2000}
        />
      </div>
    </Panel>
  );
};
```

- [ ] **Step 4: CSS**

`src/widgets/guild-chat/ui/GuildChat.module.css`:

```css
.header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 24px;
  margin-bottom: 24px;
}

.guildSelect {
  width: 270px;
  max-width: 350px;
  flex-shrink: 0;
}

.chat {
  display: flex;
  flex-direction: column;
  height: 60vh;
  min-height: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.empty {
  font-size: 0.85rem;
  opacity: 0.6;
  padding: 16px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .chat { height: auto; }
  .list { flex: none; max-height: 60vh; }
}
```

- [ ] **Step 5: Barrel**

`src/widgets/guild-chat/index.ts`:

```ts
export { GuildChat } from './ui/GuildChat';
```

- [ ] **Step 6: Run test — verify pass**

Run: `pnpm test:run src/widgets/guild-chat/ui/GuildChat.test.tsx`
Expected: PASS.

- [ ] **Step 7: Lint FSD + commit**

Run: `pnpm lint:fsd`
Expected: no new violations.

```bash
git add src/widgets/guild-chat
git commit -m "feat(guild-chat): add GuildChat widget"
```

---

## Task 20: Page route /guild-chat

**Files:**
- Create: `src/app/guild-chat/page.tsx`

- [ ] **Step 1: Implement page (server component, mirrors `src/app/page.tsx`)**

`src/app/guild-chat/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { getUser } from '@/entities/user/api/getUser';
import { UpcomingEventsStrip } from '@/widgets/upcoming-events';
import { GuildChat } from '@/widgets/guild-chat';
import { getServerEvents } from '@/entities/event/api/getEvents';
import styles from '../HomePage.module.css';

export default async function GuildChatPage() {
  const user = await getUser();
  const guilds = await getMyGuilds(user?.id);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const lastActiveGuildId = user?.profile?.lastActiveGuildId;
  const defaultGuildId = lastActiveGuildId && guilds.some((g) => g.id === lastActiveGuildId)
    ? lastActiveGuildId
    : guilds[0].id;
  const initialEvents = await getServerEvents(defaultGuildId);

  return (
    <main className={styles.main}>
      <UpcomingEventsStrip guilds={guilds} userId={user?.id} initialEvents={initialEvents} initialGuildId={defaultGuildId} />
      <GuildChat guilds={guilds} userId={user?.id} initialGuildId={defaultGuildId} />
    </main>
  );
}
```

> Note: `getUser` and `getServerEvents` import paths copied from `src/app/page.tsx`. If `getUser` is exported from the `@/entities/user` barrel, prefer that; otherwise keep the deep path used by the home page (it already does `getUser` via `@/entities/user/api/getUser`).

- [ ] **Step 2: Verify build of the route**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/guild-chat/page.tsx
git commit -m "feat(guild-chat): add /guild-chat page route"
```

---

## Task 21: Sidebar item + unread dot

**Files:**
- Modify: `src/widgets/sidebar/model/navItems.ts`
- Modify: `src/widgets/sidebar/ui/SidebarItem.tsx`
- Modify: `src/widgets/sidebar/ui/Sidebar.tsx`
- Modify: `src/widgets/sidebar/ui/Sidebar.module.css`

- [ ] **Step 1: Add nav item**

`src/widgets/sidebar/model/navItems.ts` — import icon and append item:

```ts
import { Users, Calendar, MessagesSquare, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  badge?: number;
}

export const navItems: NavItem[] = [
  { href: '/', icon: Calendar, labelKey: 'Common.calendar' },
  { href: '/guild-chat', icon: MessagesSquare, labelKey: 'Common.guildChat' },
  { href: '/guilds', icon: Users, labelKey: 'Guild.title' },
];
```

- [ ] **Step 2: Add `dot` prop to SidebarItem**

`src/widgets/sidebar/ui/SidebarItem.tsx`:

```tsx
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
  dot?: boolean;
}

export const SidebarItem = ({ href, icon: Icon, label, active, badge, dot }: SidebarItemProps) => (
  <Link href={href} className={`${styles.item} ${active ? styles.active : ''}`}>
    <span className={styles.iconWrap}>
      <Icon size={22} className={styles.icon} />
      {dot ? <span className={styles.dot} aria-label="unread" /> : null}
    </span>
    <span className={styles.label}>{label}</span>
    {badge ? <span className={styles.badge}>{badge}</span> : null}
  </Link>
);
```

- [ ] **Step 3: Wire unread query in Sidebar**

`src/widgets/sidebar/ui/Sidebar.tsx` — add the active-guild unread query and pass `dot` to the guild-chat item:

```tsx
'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAppSelector } from '@/shared/lib/hooks';
import { useGetGuildChatUnreadQuery } from '@/entities/guild-message';
import { navItems } from '../model/navItems';
import { SidebarItem } from './SidebarItem';
import styles from './Sidebar.module.css';

interface SidebarProps {
  footer?: ReactNode;
}

export const Sidebar = ({ footer }: SidebarProps) => {
  const pathname = usePathname();
  const t = useTranslations();
  const activeGuildId = useAppSelector((state) => state.guild.currentGuildId);
  const { data: unread } = useGetGuildChatUnreadQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });

  return (
    <nav className={styles.sidebar} aria-label="Main navigation">
      <ul className={styles.list}>
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          const dot = item.href === '/guild-chat' && !!unread?.hasUnread && pathname !== '/guild-chat';
          return (
            <li key={item.href}>
              <SidebarItem
                href={item.href}
                icon={item.icon}
                label={t(item.labelKey)}
                active={active}
                badge={item.badge}
                dot={dot}
              />
            </li>
          );
        })}
      </ul>
      {footer && <div className={styles.footer}>{footer}</div>}
    </nav>
  );
};
```

> Note: the original `active` logic was `pathname === href || pathname.startsWith(href + '/')`; the `item.href !== '/'` guard prevents the root `/` item from matching every path. If the existing `Sidebar.test.tsx` asserts the old behavior, keep the original expression instead — verify in Step 5.

- [ ] **Step 4: Dot + iconWrap CSS**

Append to `src/widgets/sidebar/ui/Sidebar.module.css`:

```css
.iconWrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #93c5fd;
  border: 2px solid var(--bg-primary, #0b1120);
}
```

(The existing `.icon { flex-shrink: 0; }` rule can stay; the icon now sits inside `.iconWrap`.)

- [ ] **Step 5: Mock the new store hooks in Sidebar.test.tsx**

`Sidebar.test.tsx` renders `<Sidebar />` with no Redux Provider, so the newly added `useAppSelector` and `useGetGuildChatUnreadQuery` would throw. Add these mocks near the top of `src/widgets/sidebar/ui/Sidebar.test.tsx` (after the existing `vi.mock('next/navigation', …)` block):

```ts
vi.mock('@/shared/lib/hooks', () => ({
  useAppSelector: () => null,
}));

vi.mock('@/entities/guild-message', () => ({
  useGetGuildChatUnreadQuery: () => ({ data: { hasUnread: false } }),
}));
```

- [ ] **Step 6: Verify**

Run: `pnpm test:run src/widgets/sidebar`
Expected: PASS. The existing tests still hold: `/guilds` marks only the guilds item active, and `/profile` marks nothing active.
Run: `pnpm lint:fsd`
Expected: no new violations.

- [ ] **Step 7: Commit**

```bash
git add src/widgets/sidebar
git commit -m "feat(guild-chat): add Guild Chat sidebar item with unread dot"
```

---

## Task 22: Full verification

- [ ] **Step 1: Run the whole suite**

Run: `pnpm test:run`
Expected: all PASS.

- [ ] **Step 2: Lint**

Run: `pnpm lint && pnpm lint:fsd`
Expected: clean.

- [ ] **Step 3: Typecheck + build**

Run: `pnpm exec tsc --noEmit`
Expected: passes.
(Optional) Run: `pnpm build` and confirm `/guild-chat` appears in the route output.

- [ ] **Step 4: Final commit (if any lint/format fixes were applied)**

```bash
git add -A
git commit -m "chore(guild-chat): final verification fixes"
```

---

## Notes / out of scope

- No realtime; polling at 60s (matches event comments).
- No pagination; full history loads (acceptable for now).
- No admin/owner moderation of others' messages — edit/delete own only (RLS-enforced).
- Sidebar dot reflects the **active** guild only (`state.guild.currentGuildId`); it stays off until a guild is selected on a guild-scoped page. Per-guild aggregate counts are out of scope.
- The hardcoded "Выберите гильдию" placeholder is preserved from the existing calendar (not newly introduced) — do not "fix" it as part of this work.
