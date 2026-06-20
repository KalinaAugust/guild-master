# Direct Messages — Design

**Date:** 2026-06-20
**Status:** Approved (design)

## Goal

Replace the disabled "Send message" placeholder with real direct messaging (DMs).
On `/guild-chat`, a left conversation list shows the pinned guild chat on top and
private 1:1 conversations below (Telegram-style). The active thread occupies the
right panel. DMs reach full feature parity with the existing guild chat.

## Decisions

- **Layout:** list left, active thread right. Guild chat is a single pinned row at
  the top of the list (guild switching stays as a dropdown inside the active guild
  thread header). DMs listed below, sorted by last message.
- **Feature parity:** send / edit / delete, image attachments, realtime delivery,
  cursor pagination, read/unread badges — reusing `MessageBubble` / `MessageComposer`
  and mirroring the `guild-message` pattern.
- **Access:** you may DM only users you share at least one ACCEPTED guild with
  (consistent with the `guildmates` privacy tier). Enforced by RLS.
- **Starting a chat:** "Send message" on a profile navigates to
  `/guild-chat?dm=<publicId>` and opens the thread (empty if no history). An empty
  thread joins the list after the first message.
- **Attachment cleanup:** the existing 30-day `chat-attachments` cron is extended to
  cover `direct_messages` too.
- **Slice rename:** `widgets/guild-chat` → `widgets/chat` (more accurate now that it
  hosts both guild and direct threads).
- **Presence:** show online / last-seen everywhere a peer appears — both the thread
  header and conversation-list rows.

## 1. Data Model (Supabase)

A single messages table; conversations are derived from it (no `conversations`
table). A read-state table mirrors `guild_message_reads`.

```
direct_messages
  id            uuid pk default gen_random_uuid()
  sender_id     uuid not null FK -> profiles(id)
  recipient_id  uuid not null FK -> profiles(id)
  body          text not null
  attachment_url text null        -- public URL in chat-attachments bucket
  created_at    timestamptz default now()
  updated_at    timestamptz default now()
  indexes: (sender_id, recipient_id, created_at), (recipient_id, sender_id, created_at)
  Realtime: added to supabase_realtime publication, REPLICA IDENTITY FULL

direct_message_reads
  id           uuid pk
  user_id      uuid not null FK -> profiles(id)
  peer_id      uuid not null FK -> profiles(id)
  last_read_at timestamptz not null default now()
  unique(user_id, peer_id)
```

**Conversation key:** the unordered pair `{me, peer}`. Thread query:
`(sender_id = me AND recipient_id = peer) OR (sender_id = peer AND recipient_id = me)`.

**Shared-guild helper:** SQL function
`users_share_guild(a uuid, b uuid) returns boolean` (SECURITY DEFINER) — true when
both users have an ACCEPTED `guild_members` row in some common guild.

**RLS — `direct_messages`:**
- SELECT / INSERT: `auth.uid()` is `sender_id` or `recipient_id`, **and**
  `users_share_guild(sender_id, recipient_id)`.
- UPDATE / DELETE: `sender_id = auth.uid()` (edit/delete own only).

**RLS — `direct_message_reads`:** select / insert / update only rows where
`user_id = auth.uid()`.

**Storage:** reuse the existing public `chat-attachments` bucket (`{userId}/...`,
own-folder write policy already in place). Uploaded client-side via the existing
`uploadChatAttachment`. The file is removed in `deleteDirectMessage` when its
message is deleted.

**Cron:** extend `cleanup-chat-attachments-daily` (and its Edge Function) to also
null `attachment_url` and delete bucket files for `direct_messages` rows older than
30 days.

## 2. Data Layer — `entities/direct-message`

New FSD slice mirroring `entities/guild-message`.

```
entities/direct-message/
  model/types.ts            DirectMessage, DmConversation
  api/
    directMessageApi.ts     RTK Query injectEndpoints on baseApi
    getDirectMessages.ts    cursor pagination (limit/before/after) — mirror of getGuildMessages
    getConversations.ts     list of conversations (last message + per-peer unread)
    createDirectMessage.ts
    updateDirectMessage.ts
    deleteDirectMessage.ts  (also removes the attachment file)
    getDmReadState.ts
    markDmRead.ts
    getDmUnread.ts          aggregate unread flag for the sidebar
    mapDmRow.ts             DM_SELECT + row mapper (sender profile join)
  index.ts
```

`uploadChatAttachment` is reused from `entities/guild-message` (cross-entity import
via `@x` if needed, or lifted to `shared` — decide in the plan).

**Types:**
```ts
interface DirectMessage {
  id: string; senderId: string; recipientId: string;
  body: string; attachmentUrl: string | null;
  createdAt: string; updatedAt: string;
  senderProfile: {
    publicId: string | null; fullName: string | null; avatarUrl: string | null;
    alias: string | null; displayAsAlias: boolean; icon: string | null;
  };
}
interface DmConversation {
  peer: {
    id: string; publicId: string | null; fullName: string | null;
    avatarUrl: string | null; alias: string | null; displayAsAlias: boolean;
    icon: string | null; lastSeenAt: string | null;
  };
  lastMessage: { body: string; attachmentUrl: string | null; createdAt: string; senderIsMe: boolean };
  hasUnread: boolean;
}
```

**RTK Query** (parity with `guildMessageApi`):
- `getDirectMessages(peerId)` — main per-peer window cache.
- `fetchOlderDirectMessages` / `fetchNewDirectMessages` — grow the window up/down.
- `addDirectMessage` — optimistic bubble, reconcile on fulfilment, rollback on error.
- `updateDirectMessage` / `deleteDirectMessage` — patch cache by id (no invalidate).
- `getConversations` — the list.
- `getDmReadState(peerId)` / `markDmRead(peerId)` — read cursor.
- `getDmUnread` — aggregate flag.
- New tag types: `DirectMessage`, `DmRead`.

**API routes** (`src/app/api/dm/...`), all behind `requireUser()`; peer access and
shared-guild membership are guaranteed by RLS (no redundant role checks):
```
GET/POST   /api/dm/[peerId]/messages          (?limit/before/after ; POST {body, attachmentUrl})
PATCH/DEL  /api/dm/[peerId]/messages/[id]
GET/POST   /api/dm/[peerId]/read
GET        /api/dm/conversations
GET        /api/dm/unread
```
`peerId` here is the peer's `publicId` (resolved to the uuid server-side), so it
matches the `?dm=<publicId>` URL and the profile link.

## 3. Widget & Layout — `widgets/chat`

Rename `widgets/guild-chat` → `widgets/chat`. Split the thread rendering into a
reusable presentational base so guild and direct threads don't duplicate scroll /
pagination / lightbox logic.

```
widgets/chat/
  ui/
    ChatPage.tsx          orchestrator: left list + right active panel
    ConversationList.tsx  left column: pinned "Guild chat" row + DM list
    ConversationItem.tsx  one row (avatar, name, preview, time, unread dot, presence)
    GuildThread.tsx       current GuildChat behavior (guild dropdown in header)
    DirectThread.tsx      DM thread (mirror of GuildThread; peer presence in header)
    ChatThread.tsx        shared presentational base: message list (MessageBubble),
                          day-dividers, scroll-anchor / prepend handling, lightbox.
                          Extracted from GuildChat so Guild/Direct reuse it.
```

**Selection state in URL:** `/guild-chat` → pinned guild thread (default);
`/guild-chat?dm=<publicId>` → that DM. `ChatPage` reads `?dm` and renders
`DirectThread` or `GuildThread`.

**`ConversationList`** (always visible left column):
- Pinned "Guild chat" row on top; guild switching dropdown lives in the active
  guild thread header (unchanged). Unread dot aggregated via `getGuildChatUnread`.
- DM rows below from `getConversations`, sorted by `lastMessage.createdAt`, with
  preview, presence dot, and unread dot. Empty list → hint text.
- Selecting a row `router.push`es with `?dm=` (or clears it for guild chat).

**`DirectThread`** mirrors `GuildThread`: realtime subscription on `direct_messages`
filtered to the pair (INSERT pulls the `fetchNew` delta; UPDATE/DELETE patch the
cache), cursor pagination upward, optimistic send, edit/delete, attachments,
day-dividers, lightbox, mark-read on view. Header shows peer avatar + name +
presence (`isOnline` / last-seen, reusing the profile presence logic).

> Realtime filtering note: Postgres Changes filters on a single column, so the
> channel filters by `recipient_id=eq.<me>` (and a second handler / OR by
> `sender_id`), then the callback narrows to the active peer. Detail finalized in
> the plan.

**Mobile:** when a thread is selected, show the thread and hide the list (back
button); breakpoint per existing `GuildChat.module.css`.

## 4. Profile Button + Navigation

`SendMessageButton` (`ProfileBlocks.tsx`) stops being a placeholder:
- Takes `peerPublicId`; renders as a link/button to `/guild-chat?dm=<publicId>`.
- Shown only on **another** user's profile, and only when a guild is shared (the
  profile page already computes "Common guilds" — reuse that flag). RLS backstops.

`ChatPage` with a `?dm=<publicId>` not yet in the conversation list opens an **empty
thread**, resolving the peer profile by `publicId`. After the first message the
conversation appears in the list (realtime / `getConversations` invalidation).

## 5. Unread Sidebar, i18n, Tests

- **Sidebar:** add an aggregate DM-unread dot next to the chat nav item
  (`getDmUnread`), mirroring the announcement / CTA unread dots; refreshed by
  realtime.
- **i18n:** new namespace(s) `DirectMessages` (and `Chat` if needed) in
  `messages/en.json` and `messages/ru.json` at full key parity, registered in
  `requiredNamespaces` in `src/app/layout.tsx`. Reuse `Common`. Every user-facing
  string (preview, placeholders, toasts, aria) goes through next-intl.
- **types.ts (Supabase):** hand-add `direct_messages`, `direct_message_reads`, and
  `users_share_guild` (no CLI; via Supabase MCP + manual edit).
- **Tests (vitest):** mirror existing — `createDirectMessage.test`,
  `getDirectMessages.test`, `updateDirectMessage.test`, `deleteDirectMessage.test`,
  a route test; update `GuildChat`/`GuildThread` tests for the `ChatThread` refactor.

## Build Order

1. DB schema + RLS + `users_share_guild` + realtime publication + cron extension.
2. `entities/direct-message` (types, api, mappers) + `/api/dm/*` route handlers.
3. Refactor `widgets/guild-chat` → `widgets/chat`; extract `ChatThread`, derive
   `GuildThread`.
4. `DirectThread` + `ConversationList` / `ConversationItem` + `ChatPage` URL wiring.
5. Profile `SendMessageButton` + navigation + empty-thread peer resolution.
6. Sidebar DM-unread dot.
7. i18n + tests.
