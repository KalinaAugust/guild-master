# Officer-only Chat — Design

## Goal

Add a second, private chat channel per guild visible and writable only to
**officers** (members with role `ADMIN` or `OWNER`). It lives alongside the
existing guild chat in the same `/guild-chat` screen as a separate entry in the
conversation sidebar.

## Approach: Variant A — `scope` column on `guild_messages`

Reuse the existing guild chat machinery (cursor pagination, Realtime,
attachments, read-state, optimistic send) by adding a `scope` discriminator to
`guild_messages` instead of building a parallel table. An "officers" channel is
the same table filtered by `scope = 'officers'`, gated by Row-Level Security.

Rejected alternatives:
- **Separate `officer_messages` table** — duplicates the table, RLS, Realtime
  publication and read-state for no benefit.
- **Duplicate RTK Query endpoints** (`getOfficerMessages`, …) — ~200 lines of
  copy. Threading a `scope` arg through the existing endpoints is cleaner.

"Officer" = `ADMIN` or `OWNER`. No new role or flag is introduced; access is
decided with the existing `has_guild_role(guild_id, ARRAY['ADMIN','OWNER'])`
helper.

## 1. Database schema

`guild_messages`:
- Add `scope text NOT NULL DEFAULT 'all'` with `CHECK (scope IN ('all','officers'))`.
- Add index `(guild_id, scope, created_at)` to keep both channels' reads fast.

`guild_message_reads`:
- Add `scope text NOT NULL DEFAULT 'all'`.
- Replace the unique constraint `(guild_id, user_id)` with
  `(guild_id, user_id, scope)`.

No backfill required: existing rows default to `scope = 'all'`, preserving
current behaviour.

## 2. Row-Level Security (the security boundary)

`guild_messages`:
- **SELECT**: existing "is a guild member" predicate is ANDed with
  `(scope = 'all' OR has_guild_role(guild_id, ARRAY['ADMIN','OWNER']))`.
  Officer rows are therefore invisible to non-officers, including via Realtime
  (delivery is RLS-gated).
- **INSERT**: inserting a `scope = 'officers'` row additionally requires
  `has_guild_role(guild_id, ARRAY['ADMIN','OWNER'])`. `scope = 'all'` inserts
  are unchanged.
- **UPDATE / DELETE**: unchanged — still limited to the author's own rows. (A
  demoted ex-officer can still edit/delete their own past officer messages; this
  is acceptable since it is their own row and they once had access.)

`guild_message_reads`:
- Policies already key on `user_id` (own row only). Adding the `scope` column
  needs no policy change.

UI hiding of the officer entry for non-officers is UX only; RLS is the real
guard.

## 3. Transport — route handlers (`src/app/api/guilds/[id]/messages`)

- `GET .../messages?scope=officers` → forwards `scope` to `getGuildMessages`
  (default `'all'`).
- `POST .../messages` with `{ scope }` in the body → forwards `scope` to
  `createGuildMessage`. When `scope === 'officers'`, add an **explicit**
  `requireGuildRole(supabase, id, userId, ['ADMIN','OWNER'])` check on top of
  RLS (the project's two-tier authorization model), returning 403 otherwise.
- `read` and `unread` routes accept `?scope=` and pass it through.
- Invalid `scope` values are rejected with 400.

## 4. Data layer (`src/entities/guild-message/api`)

- `getGuildMessages(guildId, { scope, limit, before, after })` adds
  `.eq('scope', scope)` to every query branch.
- `createGuildMessage(guildId, body, attachmentUrl, scope)` validates
  `scope ∈ {'all','officers'}` and inserts `scope`.
- `getGuildChatReadState(guildId, scope)` and `getGuildChatUnread(guildId, scope)`
  filter on `scope`; the unread query adds `.eq('scope', scope)`.
- `markGuildChatRead(guildId, scope)` upserts with
  `onConflict: 'guild_id,user_id,scope'`.
- `MESSAGE_SELECT` includes `scope`; `mapMessageRow` may carry `scope` through
  only if the client needs it (the Realtime callback reads it from the raw
  payload, not from the mapped type, so the client `GuildMessage` type can stay
  unchanged).

## 5. RTK Query cache (highest-churn, must be threaded carefully)

- Change the query argument of `getGuildMessages`, `fetchOlderMessages`,
  `fetchNewMessages`, `addGuildMessage`, `updateGuildMessage`,
  `deleteGuildMessage` from `guildId: string` to `{ guildId, scope }`.
- Cache tags become `LIST-${guildId}-${scope}`.
- Every `guildMessageApi.util.updateQueryData('getGuildMessages', …)` cross
  reference uses the `{ guildId, scope }` key so the two channels never collide
  in cache.
- `getGuildChatReadState`, `markGuildChatRead`, `getGuildChatUnread` likewise
  take `{ guildId, scope }` and tag `LIST-${guildId}-${scope}`.

This is the most error-prone part: a missed `scope` would merge the two
channels' messages. The plan must enumerate every call site.

## 6. UI / widget

- `Guild` type gains `role?: 'OWNER' | 'ADMIN' | 'MEMBER'`; `getMyGuilds`
  selects `guild_members.role` (the page already passes `guilds` down). `role`
  here is the **viewer's** role in that guild.
- `ChatPage` resolves the viewer's role in the active guild and renders the
  third **"Officer chat"** entry in `ConversationList` only when role is `ADMIN`
  or `OWNER`. Routing scheme:
  - default (`/guild-chat`) → guild chat (`scope='all'`)
  - `/guild-chat?scope=officers` → officer chat
  - `/guild-chat?dm=<publicId>` → direct message
- `ConversationList`: new officer entry with a Shield icon avatar, last
  officer-message preview (same `senderPrefix`/`You:` styling as the guild
  entry), and an unread dot driven by the officer-scope unread query.
- `GuildThread` is parameterized by `scope` and used for both channels. Its
  Realtime callback checks `payload.new.scope === scope` before reacting, so an
  officer subscribed to the `'all'` thread does not trigger a no-op `fetchNew`
  on officer inserts. Non-officers never receive officer ticks (RLS). The guild
  selector (`GuildSelect`) is shown in both channels.

## 7. Unread parity

- Officer channel gets its own `getGuildChatUnread({ guildId, scope: 'officers' })`
  query, surfaced as the unread dot on the officer entry in `ConversationList`.
- `Sidebar` chat-unread dot, for officers, becomes the OR of the `'all'` and
  `'officers'` unread queries (the officer query is only issued when the viewer
  is an officer).

## 8. i18n + tests

i18n (namespace `DirectMessages`, already registered in `requiredNamespaces`):
- `officerChat` — fallback label.
- `officerChatLabel` — `"{name} officers"` / Russian equivalent.
- Reuse existing `you` / `senderPrefix` / `attachmentPreview` keys.
- Keep `en.json` and `ru.json` in full key parity.

Tests:
- Update existing guild-message unit tests for the new `scope` parameter.
- Add a route-handler test: non-officer `POST scope=officers` → 403.
- Add data-layer tests asserting `scope` is applied on read/insert/unread.
- RLS check: a non-officer cannot SELECT or INSERT officer rows (Supabase-level
  assertion where feasible, otherwise documented as a manual verification step).

## Risks

1. **RLS correctness** — verify officer rows are invisible to ordinary members,
   including Realtime delivery and the unread probe. Primary risk.
2. **Scope threading in RTK Query** — every cache key/tag/`updateQueryData`
   call must include `scope` or the channels merge.
3. **Role propagation** — the viewer's per-guild role must reach `ChatPage` to
   hide the entry from non-officers (defense-in-depth behind RLS).

## Out of scope

- Notifications for officer messages.
- Per-message scope switching / moving messages between channels.
- More than two channels or custom channel creation.
