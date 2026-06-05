# Event Comments — Unread Indicator & Notifications Design Spec

**Date:** 2026-06-05
**Status:** Approved
**Builds on:** `2026-06-05-event-comments-design.md`

## Goal

Surface new comment activity: a red unread badge on the "Comments" tab, and a bell notification telling a user that an event they belong to has new comments.

## Decisions

- **Notification frequency:** one per event (deduplicated) — do not create a new `event_comment` notification for a recipient who already has an unread one for that event. Effectively "event X has new messages" until read.
- **Recipients:** confirmed participants + event creator, excluding the comment author.
- **Unread reset:** when the user opens the Comments tab → `last_read_at = now()`, which clears both the tab badge and the user's unread `event_comment` notifications for that event.
- **Badge audience:** the tab badge shows for anyone who can read the chat (creator / pending / confirmed). Notifications are narrower (confirmed + creator) — a pending viewer sees the badge but receives no bell notification. This is intentional.
- **Notification text:** `New comments in «{eventTitle}»` / `Новые комментарии в «{eventTitle}»`.

## Data Model

New table `event_comment_reads`:

| Column | Type | Notes |
|---|---|---|
| `event_id` | uuid | FK → `events(id)` on delete cascade |
| `user_id` | uuid | FK → `profiles(id)` on delete cascade |
| `last_read_at` | timestamptz | default `now()` |
| PK | `(event_id, user_id)` | one row per user per event |

RLS: a user manages only their own row — SELECT/INSERT/UPDATE policies all require `user_id = auth.uid()`.

The `event_comment` notification type needs no schema change (`notifications.type` is free text).

## Unread Count (client-side)

- New query `getCommentReadState(eventId) → { lastReadAt: string | null }` (the current user's `last_read_at`, or null).
- Unread = `comments.filter(c => c.userId !== currentUserId && (!lastReadAt || c.createdAt > lastReadAt)).length`.
- Both `EventTabs` (for the badge) and `CommentsTab` (for the list) call `useGetCommentsQuery(eventId, { pollingInterval: 60_000, refetchOnFocus: true, skipPollingIfUnfocused: true })`; RTK Query shares one cache entry. The badge therefore updates while the Participants tab is active.

## Reset / Mark Read

- `markCommentsRead(eventId)` mutation:
  1. Upsert `event_comment_reads (event_id, user_id, last_read_at = now())`.
  2. Mark the user's `event_comment` notifications for this event as read (`is_read = true` where `type='event_comment' and entity_id=eventId and user_id=auth.uid()`).
- Called from `CommentsTab` on mount and whenever `comments.length` changes while mounted (tab open).
- `invalidatesTags`: `CommentRead` (badge recomputes via read-state refetch → 0) and `Notification/LIST` (bell unread count updates).

## Notifications on New Comment

In `createComment`, after a successful insert, call helper `notifyEventComment(eventId, authorId)` (admin client, mirroring `guilds/[id]/join-requests` notification inserts):

1. Recipients = `events.created_by` ∪ `event_participants.user_id where status='confirmed'`, minus `authorId`.
2. Dedup: load `user_id`s that already have an unread `event_comment` notification for this `entity_id`; exclude them.
3. Insert `{ user_id, type: 'event_comment', entity_type: 'event', entity_id: eventId }` for the remaining recipients (single batch insert).

Notification creation must never break comment creation — failures are caught and ignored (best effort), consistent with the existing join-request pattern.

## Rendering

- `NOTIFICATION_TYPE_CONFIG`: add `event_comment: { Icon: MessageSquare, getLabel: (t, n) => t('eventComment', { eventTitle: n.event_title ?? '' }) }`.
- i18n `Notifications` namespace: add `eventComment` (en: `New comments in «{eventTitle}»`, ru: `Новые комментарии в «{eventTitle}»`).
- Click navigates to `/events/[id]` (existing behavior for `entity_type='event'`).

## Tab Badge

- Extend `shared/ui/Tabs`: `TabItem` gains optional `badge?: number`. When `badge > 0`, render a red pill after the label (`9+` when `> 9`).
- `EventTabs` receives `eventId` and `currentUserId`, computes the Comments unread count, and passes it as the `badge` of the comments tab.

## FSD Placement

- **`entities/comment`**: `api/getCommentReadState.ts`, `api/markCommentsRead.ts`, `api/notifyEventComment.ts` (server); `commentApi.ts` gains `getCommentReadState` query + `markCommentsRead` mutation; new tag `CommentRead` (registered in `baseApi`).
- **`entities/notification`**: add `event_comment` to `NOTIFICATION_TYPE_CONFIG`.
- **`shared/ui/Tabs`**: `badge` support + pill style.
- **`features/event-detail`**: `EventTabs` (badge + polling + currentUserId prop), `CommentsTab` (markRead on open); `EventDetailContent` passes `currentUserId` to `EventTabs`.
- **transport**: `GET /api/events/[id]/comments/read` (read state), `POST /api/events/[id]/comments/read` (mark read).

## Testing

- Unit (`supabaseMock`): `getCommentReadState` (maps row / null), `markCommentsRead` (upsert + notification update, auth guard), `notifyEventComment` (recipients = confirmed + creator minus author; dedup skips users with an unread one; no-op when no recipients).
- Route tests: `GET`/`POST /api/events/[id]/comments/read` (200, 401, 500).
- `shared/ui/Tabs`: renders badge when > 0, `9+` cap, hidden when 0.
- Component: `EventTabs` shows badge from unread; `CommentsTab` calls `markCommentsRead` on mount.

## Out of Scope

Realtime push, per-comment notifications, mention notifications, aggregated digest, email.
