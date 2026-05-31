# Notification Panel — Design Spec

## Overview

A bell-icon button in the header opens a dropdown panel listing the current user's notifications. Two notification types are supported in v1: new events created in guilds the user belongs to, and event invitations (pending `event_participants` entries).

## Scope

**In scope (v1):**
- Notification type `new_event` — triggered when a new event is created in any guild the user is a member of (excluding the creator)
- Notification type `invitation` — triggered when the user is added to `event_participants` with `status = 'pending'`
- Read/unread state with a badge counter on the bell button
- All notifications marked as read when the panel is opened
- Last 20 notifications shown, sorted by `created_at DESC`

**Out of scope (v1):**
- Realtime updates (Supabase Realtime subscriptions)
- Notifications for guild membership changes
- Message or comment notifications (no `messages`/`comments` tables yet)
- Per-notification dismiss or delete

## Database Schema

New table `notifications`:

```sql
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,         -- 'new_event' | 'invitation' | <future types>
  entity_type text,                  -- 'event' | <future entity types>
  entity_id   uuid,                  -- generic reference, no FK (for extensibility)
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: users see only their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own notifications"
  ON notifications FOR ALL
  USING (user_id = auth.uid());
```

### Triggers

**`trg_notify_new_event`** — fires on `INSERT` into `events`:
- Inserts one `notifications` row per `guild_members.user_id` where `guild_id = NEW.guild_id` AND `user_id != NEW.created_by`
- `type = 'new_event'`, `entity_type = 'event'`, `entity_id = NEW.id`

**`trg_notify_invitation`** — fires on `INSERT` into `event_participants` where `NEW.status = 'pending'`:
- Inserts one `notifications` row for `NEW.user_id`
- `type = 'invitation'`, `entity_type = 'event'`, `entity_id = NEW.event_id`

### Extensibility rule

Adding a new notification type requires only:
1. A new trigger in the DB (existing triggers untouched)
2. One new entry in `NOTIFICATION_TYPE_CONFIG` on the frontend (see below)

`type` is `text` (not a Postgres ENUM) to avoid `ALTER TYPE` migrations. `entity_type + entity_id` is a generic pair without FK constraints, allowing future entity types without schema changes.

## FSD Architecture

### `entities/notification`
- `model/types.ts` — `Notification` interface, `NOTIFICATION_TYPE_CONFIG` map
- `api/notificationApi.ts` — RTK Query endpoints via `injectEndpoints` on `baseApi`
- `index.ts` — public API

### `features/notification-panel`
- `ui/NotificationBell.tsx` — Client Component; bell icon button with unread badge; calls `getNotifications` and `markAllRead`
- `ui/NotificationPanel.tsx` — dropdown panel; renders list of `NotificationItem`
- `ui/NotificationItem.tsx` — single item; reads icon and label from `NOTIFICATION_TYPE_CONFIG[type]`
- `ui/*.module.css` — CSS Modules for all components
- `index.ts` — public API

### `widgets/header`
Mounts `<NotificationBell />` alongside `<AiHelperButton />`. Header remains a Server Component; `NotificationBell` is a Client Component and composes in without issue.

### `src/app/api/notifications/`
- `GET route.ts` — fetches last 20 notifications for the current user, ordered by `created_at DESC`. RLS enforces ownership. The query joins `notifications` with `events` (via `entity_id`) and `guilds` (via `events.guild_id`) to return `event_title`, `event_date`, and `guild_name` inline — no secondary fetches needed on the client.
- `PATCH read/route.ts` — sets `is_read = true` for all unread notifications of the current user.

## Data Flow

1. User clicks bell → `NotificationBell` triggers `getNotifications` query
2. RTK Query → `GET /api/notifications` → Supabase → returns array
3. Panel renders; simultaneously `markAllRead` mutation fires → `PATCH /api/notifications/read`
4. On mutation success, RTK Query invalidates `getNotifications` cache → badge clears

## Frontend Type Config

```ts
// entities/notification/model/types.ts
export const NOTIFICATION_TYPE_CONFIG: Record<string, {
  icon: LucideIcon;
  getLabel: (t: TranslationFn) => string;
}> = {
  new_event:  { icon: CalendarIcon, getLabel: (t) => t('notifications.newEvent') },
  invitation: { icon: MailIcon,     getLabel: (t) => t('notifications.invitation') },
  // new type → one line here
};
```

## UI Details

- Bell button placed in `<nav>` in `Header.tsx`, after `<AiHelperButton />`
- Badge: red circle with unread count; hidden when count is 0
- Panel: dropdown ~320px wide, max-height with internal scroll after 5 items
- Each item shows: type icon, title (from `getLabel`), event title + date + guild name (returned inline by GET route via join), unread dot
- "Mark all as read" link at panel top (triggers `markAllRead` immediately, without waiting for panel close)
- Reads occur automatically on panel open (no explicit action required from user)

## i18n

New keys needed in `messages/en.json` and `messages/ru.json`:
```json
{
  "Notifications": {
    "title": "Notifications",
    "newEvent": "New event in «{guildName}»",
    "invitation": "You're invited to an event",
    "markAllRead": "Mark all as read",
    "empty": "No notifications"
  }
}
```

## Error Handling

- `GET /api/notifications` failure: panel shows empty state (no crash)
- `PATCH /api/notifications/read` failure: silent (badge may not clear; non-critical)
- Both route handlers follow the existing two-tier auth model: GET relies on RLS only; PATCH uses `requireUser()` from `guildAuth.ts`
