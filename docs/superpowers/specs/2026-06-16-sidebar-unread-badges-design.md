# Sidebar Unread Badges (Announcements & Call to Action) — Design Spec

Date: 2026-06-16
Status: Approved

## Summary

Show an unread indicator (a **dot**, like the existing Guild Chat indicator) on
the **Announcements** and **Call to Action** sidebar items when the active guild
has posts the current user has not yet seen. Opening the respective page marks
it read and clears the dot. This is a direct mirror of the existing Guild Chat
unread mechanism (`guild_message_reads` + last-read timestamp).

## Decisions (from brainstorming)

1. **Indicator style:** a dot (bool "has unread"), consistent with Guild Chat.
   No numeric count.
2. **Own posts excluded:** an item authored by the viewer never counts as
   unread (mirrors chat's `neq user_id`).
3. **Read trigger:** visiting the page (the feed widget marks read on mount /
   guild change), same as chat.
4. **Scope:** unread is computed per **active guild** (the feeds are guild-scoped).

## Data Model (Supabase)

Two new tables, exact copies of `guild_message_reads`:

- `announcement_reads(id, guild_id, user_id, last_read_at)`, `unique(guild_id, user_id)`.
- `call_to_action_reads(id, guild_id, user_id, last_read_at)`, `unique(guild_id, user_id)`.

RLS: a user reads/writes only their own row (`user_id = auth.uid()`).

## Data Layer + API

In `entities/announcement` and `entities/call-to-action`, mirroring
`entities/guild-message`:

- `get{Announcements,CallToActions}Unread(guildId) → { hasUnread }`:
  `hasUnread` = exists a row in the feed table for `guildId` with
  `created_at > last_read_at` (or no read row yet) **and** `created_by != me`.
- `mark{Announcements,CallToActions}Read(guildId)`: upsert `last_read_at = now()`
  on `(guild_id, user_id)`.

RTK Query (new tag types `AnnouncementRead`, `CallToActionRead`):
- `useGet{Announcements,CallToActions}UnreadQuery(guildId)` — provides the tag.
- `useMark{Announcements,CallToActions}ReadMutation(guildId)` — invalidates the tag.

Route handlers (mirror `/messages/unread` and `/messages/read`):
- `GET /api/guilds/[id]/announcements/unread`
- `POST /api/guilds/[id]/announcements/read`
- `GET /api/guilds/[id]/call-to-actions/unread`
- `POST /api/guilds/[id]/call-to-actions/read`

## UI

- **Sidebar** (`widgets/sidebar/ui/Sidebar.tsx`): add
  `useGetAnnouncementsUnreadQuery` and `useGetCallToActionsUnreadQuery` for the
  active guild (polling 60s, `skipPollingIfUnfocused`). Render `dot` when
  `hasUnread && pathname !== item.href`. Generalize the current chat-only `dot`
  computation into a per-item lookup keyed by `href`.
- **Mark read on view:** `widgets/guild-announcements/ui/GuildAnnouncements.tsx`
  and `widgets/call-to-action-board/ui/CallToActionBoard.tsx` call their
  mark-read mutation in an effect once the active guild is set, which invalidates
  the unread tag and clears the dot.

## FSD

Read/unread endpoints live in the respective entities; the sidebar widget and
the feed widgets import entity hooks (widget → entity, allowed). No new
cross-layer violations.

## Testing

- Unit tests for `getAnnouncementsUnread` / `getCallToActionsUnread`, mirroring
  `getGuildChatUnread.test.ts` (mock Supabase): no read row → unread when a
  foreign post exists; own-only posts → not unread; nothing newer than
  `last_read_at` → not unread.

## Out of Scope

- Numeric unread counts.
- Per-item (per announcement/CTA) read receipts — only a per-guild last-seen
  timestamp is tracked.
- Notifications.
