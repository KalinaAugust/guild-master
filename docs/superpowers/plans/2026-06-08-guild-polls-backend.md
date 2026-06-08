# Guild Polls Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Persist guild polls, list them with results, and allow voting — wiring the existing `features/guild-poll` UI to a new `entities/poll` slice, route handlers, and Supabase tables.

**Architecture:** New `entities/poll` slice holds the data model, server helpers (Supabase via user-session client + RLS), and an RTK Query `pollApi`. Route handlers under `src/app/api/guilds/[id]/polls/` are the transport. `features/guild-poll` (PollWizard, PollCard) consumes the entity. DB migration applied via Supabase MCP; `types.ts` hand-edited.

**Tech Stack:** Next.js App Router route handlers, Supabase JS (RLS), Redux Toolkit Query, React 19, CSS Modules, next-intl, Vitest.

Full behavioral contract is in `docs/superpowers/specs/2026-06-08-guild-polls-backend-design.md` — read it alongside this plan.

---

### Task 1: Database migration + types (controller does this — sensitive shared state)

- [ ] Apply migration `create_poll_tables` via Supabase MCP with the SQL below.
- [ ] Run `get_advisors(security)` — confirm no new RLS-missing warnings.
- [ ] Hand-edit `src/shared/api/supabase/types.ts`: add `polls`, `poll_options`, `poll_votes` to `Database['public']['Tables']` (Row/Insert/Update + Relationships), mirroring the shape of `guild_messages`.

Migration SQL:
```sql
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text check (char_length(trim(description)) <= 1000),
  is_anonymous boolean not null default false,
  allow_multiple boolean not null default false,
  allow_custom boolean not null default false,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 200),
  position int not null default 0,
  is_custom boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (option_id, user_id)
);

create index poll_options_poll_id_idx on public.poll_options(poll_id);
create index poll_votes_poll_id_idx on public.poll_votes(poll_id);
create index poll_votes_user_id_idx on public.poll_votes(user_id);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

create policy polls_select_members on public.polls for select using (is_member_of(guild_id));
create policy polls_insert_members on public.polls for insert with check (created_by = auth.uid() and is_member_of(guild_id));
create policy polls_update_manage on public.polls for update using (created_by = auth.uid() or has_guild_role(guild_id, array['ADMIN','OWNER'])) with check (created_by = auth.uid() or has_guild_role(guild_id, array['ADMIN','OWNER']));
create policy polls_delete_manage on public.polls for delete using (created_by = auth.uid() or has_guild_role(guild_id, array['ADMIN','OWNER']));

create policy poll_options_select_members on public.poll_options for select
  using (exists (select 1 from public.polls p where p.id = poll_id and is_member_of(p.guild_id)));
create policy poll_options_insert on public.poll_options for insert with check (
  created_by = auth.uid() and exists (
    select 1 from public.polls p where p.id = poll_id and is_member_of(p.guild_id)
      and (p.created_by = auth.uid() or (p.allow_custom and p.closed_at is null))
  )
);

create policy poll_votes_select_members on public.poll_votes for select
  using (exists (select 1 from public.polls p where p.id = poll_id and is_member_of(p.guild_id)));
create policy poll_votes_insert on public.poll_votes for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.polls p where p.id = poll_id and is_member_of(p.guild_id) and p.closed_at is null
  )
);
create policy poll_votes_delete_own on public.poll_votes for delete using (user_id = auth.uid());
```

---

### Task 2: entities/poll model + mapper + baseApi tag

**Files:**
- Create: `src/entities/poll/model/types.ts`
- Create: `src/entities/poll/api/mapPollRow.ts`
- Modify: `src/shared/api/baseApi.ts` (add `'Poll'` to tagTypes)
- Create: `src/entities/poll/index.ts`

Types per spec §"Domain types". `CreatePollInput = { title: string; description: string; options: string[]; isAnonymous: boolean; allowMultiple: boolean; allowCustom: boolean }`. `VoteInput = { optionId?: string; customBody?: string }`.

`mapPollRow.ts` exports a `buildPoll(row, currentUserId, canManage)` that takes a joined poll row (with `poll_options` and nested `poll_votes(user_id, profiles(full_name, avatar_url))`) and returns a domain `Poll`: aggregate option vote counts; `voters` filled only when `!row.is_anonymous`; `myVoteOptionIds` = options where a vote.user_id === currentUserId; `totalVotes` = distinct voter ids across the poll. Sort options by `position` then `created_at`.

`index.ts` re-exports types + the RTK hooks (added in Task 4).

- [ ] Implement, then `npx tsc --noEmit` (no new errors under entities/poll). Commit.

---

### Task 3: Server helpers (Supabase)

**Files (create):**
- `src/entities/poll/api/getGuildPolls.ts`
- `src/entities/poll/api/createPoll.ts` (+ `InvalidPollError`)
- `src/entities/poll/api/deletePoll.ts`
- `src/entities/poll/api/closePoll.ts`
- `src/entities/poll/api/votePoll.ts`
- Tests: `getGuildPolls.test.ts`, `createPoll.test.ts`, `votePoll.test.ts` (mock the Supabase client like existing `createGuildMessage.test.ts`).

Behavior per spec §"Server helper behavior". All use `createClient()` from `@/shared/api/supabase/server` and `supabase.auth.getUser()`. Shared poll SELECT (joined) constant lives in `mapPollRow.ts`:
```
POLL_SELECT = 'id, guild_id, created_by, title, description, is_anonymous, allow_multiple, allow_custom, closed_at, created_at, poll_options(id, body, position, is_custom, created_at), poll_votes(option_id, user_id, profiles(full_name, avatar_url))'
```
`canManage` is computed by reading the caller's `guild_members.role` once per request and checking author-or-ADMIN/OWNER.

- [ ] TDD each helper (validation + branching for votePoll toggle/single/custom). Run tests green. Commit.

---

### Task 4: Route handlers + pollApi

**Files (create):**
- `src/app/api/guilds/[id]/polls/route.ts` (GET, POST)
- `src/app/api/guilds/[id]/polls/[pollId]/route.ts` (DELETE, PATCH)
- `src/app/api/guilds/[id]/polls/[pollId]/vote/route.ts` (POST)
- `src/entities/poll/api/pollApi.ts`
- Modify: `src/entities/poll/index.ts` (export hooks)

Route handlers mirror `messages/route.ts`: reads rely on RLS, mutations use `requireUser`; map `InvalidPollError` → 400. `pollApi` injects `getGuildPolls` query + `createPoll`/`deletePoll`/`closePoll`/`votePoll` mutations, all invalidating `Poll` LIST-<guildId>.

- [ ] Implement, `npx tsc --noEmit`, `npx eslint` clean. Commit.

---

### Task 5: i18n keys

Add to `GuildPoll` (en + ru): `closeLabel`, `deleteLabel`, `closedBadge`, `votesCount` (`{count}`), `addCustomPlaceholder`, `emptyPolls`, `voteError`, `createError`, `deleteError`, `closeError`, `confirmDelete`. Validate JSON. Commit.

---

### Task 6: Wire PollWizard → createPoll

**Files:** Modify `src/features/guild-poll/ui/PollWizard.tsx`.

Add `guildId: string` prop. Replace stub submit: call `useCreatePollMutation`; on success `handleClose()`, on error `toast.error(t('createError'))`. Disable submit while `isLoading`. Keep validation.

- [ ] `npx tsc --noEmit`, eslint clean. Commit.

---

### Task 7: PollCard interactive

**Files:** Rewrite `src/features/guild-poll/ui/PollCard.tsx` + `.module.css` (replace the static stub).

Props: `poll: Poll`, `guildId: string`. Render per spec §"PollCard": clickable option rows with progress fill `voteCount/totalVotes`, percent, count, checkmark on `myVoteOptionIds`; `votePoll` on click (disabled when closed); custom-option input when `allowCustom && !closedAt`; close + delete buttons when `canManage` (delete behind a confirm); "closed" badge; voter avatars per option when `!isAnonymous` (reuse `UserAvatar`). Uses `useVotePollMutation`, `useClosePollMutation`, `useDeletePollMutation` + error toasts.

- [ ] `npx tsc --noEmit`, eslint clean. Commit.

---

### Task 8: GuildChat poll column → real data

**Files:** Modify `src/widgets/guild-chat/ui/GuildChat.tsx`.

Replace the single stub `<PollCard />` with `useGetGuildPollsQuery(activeGuildId)` → map `PollCard poll={p} guildId={activeGuildId}`; empty state `t('emptyPolls')` when none. Pass `guildId={activeGuildId}` to `PollWizard`.

- [ ] `npx tsc --noEmit`, eslint clean. Commit.

---

### Task 9: Full verification

- [ ] `npx vitest run src/entities/poll src/features/guild-poll src/widgets/guild-chat`
- [ ] `npx eslint src/entities/poll src/features/guild-poll src/widgets/guild-chat src/app/api/guilds`
- [ ] `pnpm lint:fsd` — only pre-existing insignificant-slice notes.
- [ ] `npx tsc --noEmit` — no new errors outside pre-existing test-mock issues.
- [ ] `get_advisors(security)` — clean for the new tables.

---

## Notes
- Migration + `types.ts` are done by the controller, not delegated.
- No optimistic updates — mutations invalidate `Poll` and refetch.
- Anonymity is enforced in `buildPoll` (omit `voters` when `is_anonymous`).
