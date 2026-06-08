# Guild Chat — Design

**Date:** 2026-06-08
**Branch:** `guild-chat`

## Goal

A guild chat page at `/guild-chat` where all members of a guild can post messages.
Visually it mirrors the calendar page: the `UpcomingEventsStrip` on top, then a
glassmorphism panel whose header contains **only** the guild-selection dropdown
(no month/year selects, no event filter, no month-navigation arrows). Inside the
panel is a message thread instead of the calendar grid.

The sidebar gains a "Guild Chat" item with the `MessagesSquare` icon and a dot
indicator when the active guild has unread messages.

## Decisions

- **Delivery:** polling, reusing the existing comment pattern (RTK Query
  `pollingInterval` + `refetchOnFocus`). Interval: **60s**. No realtime.
- **Data model:** a **new** `guild-message` entity + new tables — the existing
  `comment` entity stays event-scoped and untouched.
- **Thread UI:** lift the presentational parts into `shared/ui` and reuse in both
  event comments and guild chat (data-wiring stays per-feature).
- **Permissions:** any guild member can post; edit/delete **own messages only**.
  Admin/owner moderation is out of scope (YAGNI).
- **Sidebar badge:** a simple **dot** ("has unread") for the active guild only.
- **Icon:** `MessagesSquare`.
- **History:** loaded in full, no pagination (mirrors comments; acceptable now).

## Route

- `src/app/guild-chat/page.tsx` — server component, mirrors `src/app/page.tsx`:
  - `getUser()`, `getMyGuilds(user?.id)`; redirect to `/guilds` if no guilds.
  - `defaultGuildId` from `lastActiveGuildId` (fallback to first guild).
  - Renders `<UpcomingEventsStrip … />` (reused as-is) and `<GuildChat … />`.
- Add `/guild-chat` to the protected-routes logic in `src/proxy.ts` (same gating
  as the home route).

## Database (Supabase)

Applied via Supabase MCP migration; `types.ts` hand-edited afterwards.

### `guild_messages`
| column | type |
|---|---|
| `id` | uuid, pk, default gen_random_uuid() |
| `guild_id` | uuid, FK → guilds(id) on delete cascade |
| `user_id` | uuid, FK → profiles(id) |
| `body` | text, not null |
| `created_at` | timestamptz, default now() |
| `updated_at` | timestamptz, default now() |

Index: `(guild_id, created_at)`.

### `guild_message_reads`
| column | type |
|---|---|
| `guild_id` | uuid, FK → guilds(id) on delete cascade |
| `user_id` | uuid, FK → profiles(id) |
| `last_read_at` | timestamptz |

Primary key `(guild_id, user_id)`.

### RLS
- `guild_messages` SELECT/INSERT: caller must be a member of `guild_id`
  (membership check against `guild_members`). INSERT also requires
  `user_id = auth.uid()`.
- `guild_messages` UPDATE/DELETE: only rows where `user_id = auth.uid()`.
- `guild_message_reads` SELECT/INSERT/UPDATE: only rows where
  `user_id = auth.uid()`.

## Entity: `entities/guild-message`

- `model/types.ts`
  ```ts
  export interface GuildMessage {
    id: string;
    guildId: string;
    userId: string;
    body: string;
    createdAt: string;
    updatedAt: string;
    profile: { fullName: string | null; avatarUrl: string | null };
  }
  ```
- `api/guildMessageApi.ts` — `baseApi.injectEndpoints`, mirroring `commentApi`:
  - `getGuildMessages(guildId)` → `GuildMessage[]`, tag `GuildMessage` `LIST-${guildId}`.
  - `addGuildMessage({ guildId, body })` — optimistic append into the cached list
    (same `onQueryStarted` pattern as `addComment`).
  - `updateGuildMessage({ guildId, messageId, body })` — invalidates the list.
  - `deleteGuildMessage({ guildId, messageId })` — invalidates the list.
  - `getGuildChatReadState(guildId)` → `{ lastReadAt: string | null }`,
    tag `GuildChatRead` `LIST-${guildId}`.
  - `markGuildChatRead(guildId)` — optimistic cache write of `lastReadAt`
    (same pattern as `markCommentsRead`).
  - `getGuildChatUnread(guildId)` → `{ hasUnread: boolean }` — lightweight query
    for the sidebar dot (does not load the full thread); tag `GuildChatRead`.
- New `baseApi` tag types: `GuildMessage`, `GuildChatRead`.
- Server helpers + `mapMessageRow` — by analogy with `entities/comment/api/*`
  (Supabase calls live in route handlers, helpers shape rows).
- `index.ts` re-exports the hooks and the `GuildMessage` type.

## Route handlers (transport): `src/app/api/guilds/[id]/messages/`

- `GET /messages` — list (RLS only).
- `POST /messages` — create (RLS + `requireUser()`).
- `PATCH /messages/[messageId]` — edit own (RLS + `requireUser()`).
- `DELETE /messages/[messageId]` — delete own (RLS + `requireUser()`).
- `GET /messages/read` — current read state (RLS).
- `POST /messages/read` — mark read = upsert `last_read_at = now()` (RLS + `requireUser()`).
- `GET /messages/unread` — `{ hasUnread }`: true if any message from another user
  is newer than `last_read_at` (RLS).

Authorization follows the two-tier model in `src/CLAUDE.md`: reads rely on RLS,
writes add `requireUser()`. No extra role gate (any member may post/edit-own).

## Shared UI (lifted from `features/event-detail`)

- `shared/ui/MessageBubble` — presentational: avatar, author name, body,
  timestamp, and edit/delete affordances shown for the viewer's own messages.
  Pure props; no data fetching.
- `shared/ui/MessageComposer` — textarea + send button, char limit, disabled
  state. Pure props (`onSubmit`, `isSubmitting`, `canWrite`).
- Refactor `features/event-detail` `CommentItem`/`CommentInput` to render these
  shared primitives; the mutation wiring stays in `event-detail`. Update the
  affected tests.

## Feature: `features/select-guild`

- Move `useGuildSelection` from `widgets/calendar/model/useGuildSelection.ts`
  into this feature (re-exported from its `index.ts`); move the colocated test.
- Add a `GuildSelect` component wrapping `shared/ui/Select` with `guildOptions`.
- Update `widgets/calendar` to import `useGuildSelection` (and optionally the
  dropdown) from `features/select-guild`. Adjust calendar imports/tests.

## Shared `Panel` wrapper

- `shared/ui/Panel` — the glassmorphism container currently in
  `CalendarGrid.module.css` `.container` (`padding`, `--glass-*`, radius, shadow).
- Reused by `widgets/guild-chat` and (by refactor) `widgets/calendar`, so the
  wrapper is genuinely shared.

## Widget: `widgets/guild-chat`

- `GuildChat.tsx` (`'use client'`), props `{ guilds, userId, initialGuildId }`:
  - `Panel` → header with **only** `GuildSelect` (from `features/select-guild`).
  - Message thread: list of `MessageBubble` + `MessageComposer`, fed by
    `guildMessageApi` (`getGuildMessages` with `pollingInterval: 60_000`,
    `refetchOnFocus`, `skipPollingIfUnfocused`).
  - Auto-`markGuildChatRead` when there is something unread, and auto-scroll to
    the latest message — logic mirrored from `CommentsTab`.
  - Permissions: member → can write; edit/delete only own messages.

## Sidebar

- New nav item: `{ href: '/guild-chat', icon: MessagesSquare, labelKey: 'Common.guildChat' }`.
- `SidebarItem` gains a `dot?: boolean` prop rendering a small indicator dot.
- `Sidebar` (already a client component) uses a small hook reading
  `getGuildChatUnread` for the active guild (`state.guild.currentGuildId`) and
  passes `dot` to the Guild Chat item.

## i18n

- Add `Common.guildChat` and a `GuildChat.*` namespace (empty, send error,
  edit/delete labels, etc.) to both `en` and `ru` locale files, by analogy with
  `EventComments`.

## Testing (TDD)

- API helpers + route handlers for messages/read/unread (mirror comment tests).
- Unread derivation (`getGuildChatUnread`).
- `useGuildSelection` after the move.
- Widget mark-read / unread behavior.
- CSS and pure-markup files are not unit-tested.

## Out of scope / future

- Realtime delivery.
- Pagination / infinite history.
- Admin/owner moderation of others' messages.
- Per-guild aggregate unread counts in the sidebar.
