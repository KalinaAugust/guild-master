# Guild Polls — Backend & Wiring Design

**Date:** 2026-06-08
**Scope:** Make the guild-poll feature fully working: persist polls, list them with
results, and allow voting. New `entities/poll` slice + route handlers + Supabase tables.

## Decisions (from brainstorming)

- Full cycle: create + list + vote.
- Any guild member can create a poll. Author OR ADMIN/OWNER can delete and close.
- Lifecycle: create / delete / **close** (no edit).
- Anonymity enforced at the **API layer**: members may read vote rows; the API returns
  voter profiles only for non-anonymous polls. Known limitation: a direct table query
  could reveal anonymous voters, but no browser code queries these tables directly
  (all access goes through `/api`). Acceptable for v1.

## Database (Supabase project `uzmyvxpjsfobqkcepygh`)

Applied via Supabase MCP `apply_migration`; `src/shared/api/supabase/types.ts` hand-edited
to match (no CLI, per project workflow). RLS uses existing SECURITY DEFINER helpers
`is_member_of(uuid)` and `has_guild_role(uuid, text[])`.

### `polls`
| col | type | notes |
|---|---|---|
| id | uuid pk | `gen_random_uuid()` |
| guild_id | uuid not null | → guilds(id) on delete cascade |
| created_by | uuid | → profiles(id) on delete set null, nullable |
| title | text not null | check `char_length(trim(title))` 1..200 |
| description | text | nullable, check `char_length(trim(description)) <= 1000` |
| is_anonymous | boolean not null default false | |
| allow_multiple | boolean not null default false | |
| allow_custom | boolean not null default false | |
| closed_at | timestamptz | null = open |
| created_at | timestamptz not null default now() | |

### `poll_options`
| col | type | notes |
|---|---|---|
| id | uuid pk | `gen_random_uuid()` |
| poll_id | uuid not null | → polls(id) on delete cascade |
| body | text not null | check `char_length(trim(body))` 1..200 |
| position | int not null default 0 | display order |
| is_custom | boolean not null default false | voter-added option |
| created_by | uuid | → profiles(id) on delete set null, nullable |
| created_at | timestamptz not null default now() | |

### `poll_votes`
| col | type | notes |
|---|---|---|
| id | uuid pk | `gen_random_uuid()` |
| poll_id | uuid not null | → polls(id) on delete cascade (denormalized for queries) |
| option_id | uuid not null | → poll_options(id) on delete cascade |
| user_id | uuid not null | → profiles(id) on delete cascade |
| created_at | timestamptz not null default now() | |
| | | `unique(option_id, user_id)` |

Indexes: `poll_options(poll_id)`, `poll_votes(poll_id)`, `poll_votes(user_id)`.

### RLS policies
- **polls** SELECT `is_member_of(guild_id)`; INSERT with_check `created_by = auth.uid() AND is_member_of(guild_id)`; UPDATE using/with_check `created_by = auth.uid() OR has_guild_role(guild_id, array['ADMIN','OWNER'])`; DELETE using same as UPDATE.
- **poll_options** SELECT `exists(select 1 from polls p where p.id = poll_id and is_member_of(p.guild_id))`; INSERT with_check `created_by = auth.uid() AND exists(select 1 from polls p where p.id = poll_id and is_member_of(p.guild_id) and (p.created_by = auth.uid() or (p.allow_custom and p.closed_at is null)))`.
- **poll_votes** SELECT `exists(select 1 from polls p where p.id = poll_id and is_member_of(p.guild_id))`; INSERT with_check `user_id = auth.uid() and exists(select 1 from polls p where p.id = poll_id and is_member_of(p.guild_id) and p.closed_at is null)`; DELETE using `user_id = auth.uid()`.

## FSD: `entities/poll`

```
entities/poll/
  index.ts                     # public API
  model/types.ts               # Poll, PollOption, CreatePollInput, VoteInput
  api/mapPollRow.ts            # row → domain mapper + SELECT constants
  api/getGuildPolls.ts         # server helper (aggregates votes, respects anonymity)
  api/createPoll.ts            # server helper (insert poll + options)
  api/deletePoll.ts            # server helper
  api/closePoll.ts             # server helper (set closed_at)
  api/votePoll.ts              # server helper (toggle/set vote, optional custom option)
  api/pollApi.ts               # RTK Query injectEndpoints on baseApi
```

`baseApi` gains tag type `'Poll'`.

### Domain types
```ts
interface PollOption {
  id: string;
  body: string;
  isCustom: boolean;
  voteCount: number;
  voters: { fullName: string | null; avatarUrl: string | null }[]; // empty when anonymous
}
interface Poll {
  id: string;
  guildId: string;
  createdBy: string | null;
  title: string;
  description: string | null;
  isAnonymous: boolean;
  allowMultiple: boolean;
  allowCustom: boolean;
  closedAt: string | null;
  createdAt: string;
  options: PollOption[];
  myVoteOptionIds: string[];   // option ids the current user voted for
  totalVotes: number;          // distinct voters or sum of votes
  canManage: boolean;          // current user is author or ADMIN/OWNER
}
```

### Server helper behavior
- **getGuildPolls(guildId):** fetch polls (newest first) + options + votes for the guild.
  Aggregate counts per option; set `voters` only when `!is_anonymous`; compute
  `myVoteOptionIds` from current user's votes; compute `canManage` via author check or
  `has_guild_role`. `totalVotes` = count of distinct voting users.
- **createPoll(guildId, input):** insert `polls` row (created_by = user), then insert
  `poll_options` rows (position by index, is_custom=false). Validate title non-empty and
  ≥2 non-empty options server-side; throw `InvalidPollError` (400) otherwise. Return the
  created poll via getGuildPolls-shaped mapper for one poll.
- **deletePoll(pollId):** delete row (RLS enforces author/admin). Returns `{ deleted }`.
- **closePoll(pollId):** `update polls set closed_at = now()` (RLS author/admin). Returns poll.
- **votePoll(pollId, { optionId?, customBody? }):**
  - Reject if poll closed (404/400).
  - If `customBody` and poll.allow_custom: insert a `poll_options` row (is_custom=true,
    created_by=user), use its id as optionId.
  - If poll.allow_multiple: toggle — if a vote by user for optionId exists, delete it; else insert.
  - Else (single): if user already voted that exact option, delete it (toggle off);
    otherwise delete all user votes for the poll and insert the one.
  - Returns the updated poll (getGuildPolls-shaped).

## Endpoints (`src/app/api/guilds/[id]/polls/…`)
- `GET  /polls` → `getGuildPolls(id)` (RLS read).
- `POST /polls` → `requireUser`, body `{ title, description, options, isAnonymous, allowMultiple, allowCustom }` → `createPoll`. 400 on `InvalidPollError`.
- `DELETE /polls/[pollId]` → `requireUser` → `deletePoll`.
- `PATCH  /polls/[pollId]` → `requireUser` → `closePoll`.
- `POST   /polls/[pollId]/vote` → `requireUser`, body `{ optionId?, customBody? }` → `votePoll`.

## RTK Query (`pollApi`)
- `getGuildPolls` query (providesTags `Poll` LIST-<guildId>).
- `createPoll`, `deletePoll`, `closePoll`, `votePoll` mutations — all invalidate
  `Poll` LIST-<guildId>. (No optimistic updates in v1; rely on invalidation + refetch.)

## UI wiring (`features/guild-poll`)
- **PollWizard:** submit calls `createPoll`; on success `handleClose()`. Show error toast
  (`sonner`) on failure. Needs `guildId` prop. Validation unchanged (title + ≥2 options).
- **PollCard:** receives a `Poll`. Renders title/description, options as clickable rows
  with progress fill = `voteCount / totalVotes`, percent + count, checkmark on
  `myVoteOptionIds`. Clicking an option calls `votePoll`. When `allowCustom && !closed`,
  show an "add your option" input that calls `votePoll({ customBody })`. When `canManage`,
  show close (if open) and delete buttons. Closed poll: disable voting, show "closed" badge.
  Non-anonymous: show voter avatars per option.
- **GuildChat poll column:** replace the single stub `PollCard` with `getGuildPolls`
  query → map real `PollCard`s (empty state when none). `PollWizard` gets `guildId`.

## i18n (`GuildPoll` namespace, en + ru)
Add: `closeLabel`, `deleteLabel`, `closedBadge`, `votesCount` (`{count}`), `addCustomPlaceholder`, `emptyPolls`, `voteError`, `createError`, `deleteError`, `closeError`, `confirmDelete`.

## Out of scope (v1)
- Editing poll title/options after creation.
- Notifications on new polls.
- Realtime updates (polling/refetch only).
- Drag-reorder of options.

## Constraints
- RTK Query for all data; Supabase calls only in route handlers / server helpers.
- CSS Modules only; design-system tokens; no inline styles.
- `React.SubmitEvent` for submit handlers.
- Route auth: reads rely on RLS; mutations use `requireUser` (RLS enforces role).
