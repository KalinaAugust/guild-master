# Notifications for new Call to Action and Announcements

## Goal

Notify guild members in-app when a new Call to Action or Announcement is
created in their guild. Mirror the existing `new_event` notification mechanism
(DB trigger → `notifications` row → route-handler enrichment → frontend config).

Recipients: all members of the guild **except the creator**. In-app only
(no email/push — out of scope).

## Existing mechanism (reference)

`new_event` works as follows:

- `notify_new_event()` — `AFTER INSERT` trigger on `events`. Inserts one
  `notifications` row (`type='new_event'`, `entity_type='event'`,
  `entity_id=new.id`) per guild member, excluding `new.created_by`.
- `enforce_notification_limit()` — keeps only the latest 20 rows per user.
- `delete_event_notifications()` — `AFTER DELETE` on `events`, removes
  notifications whose `entity_type='event'` and `entity_id=old.id`.
- `notifications` columns: `user_id, type, entity_type, entity_id, is_read,
  created_at`. **No schema change needed** — `guild_id`/title are derived in
  the route handler via joins.
- `GET /api/notifications` enriches event rows by joining `events` → `guilds`.
- Frontend `NOTIFICATION_TYPE_CONFIG` maps `type` → icon + label; the panel
  pages live at `/call-to-action` and `/announcements` (guild-scoped feeds,
  no per-id route).

## Design

### 1. DB triggers (applied via Supabase MCP `apply_migration`)

- `notify_new_call_to_action()` — `AFTER INSERT` on `call_to_actions`.
  Inserts notifications `type='new_call_to_action'`,
  `entity_type='call_to_action'`, `entity_id=new.id` for every
  `guild_members.user_id` of `new.guild_id` where
  `user_id IS DISTINCT FROM new.created_by`. `SECURITY DEFINER`,
  `SET search_path TO ''`.
- `notify_new_announcement()` — `AFTER INSERT` on `announcements`. Same shape
  with `type='new_announcement'`, `entity_type='announcement'`.
- Cleanup `AFTER DELETE` triggers mirroring `delete_event_notifications`:
  - `delete_call_to_action_notifications()` — deletes notifications where
    `entity_type='call_to_action' AND entity_id=old.id` (CTAs are removed by
    the hourly `delete_expired_call_to_actions` job — prevents stale rows).
  - `delete_announcement_notifications()` — same for `entity_type='announcement'`.
- The existing `enforce_notification_limit` trigger caps each user at 20 rows;
  no change required.

### 2. Route handler `GET /api/notifications` (`src/app/api/notifications/route.ts`)

Add enrichment for the two new entity types alongside the existing event/guild
maps:

- Collect `ctaIds` (`entity_type='call_to_action'`) and `announcementIds`
  (`entity_type='announcement'`).
- If non-empty, query each table once:
  `select id, title, guild_id, guilds(name)`.
- Build maps `ctaMap`/`announcementMap`: `id → { title, guild_id, guild_name }`.
- In the result mapping, set per type:
  - `title`: CTA/announcement title (else `null`).
  - `guild_id`: from the map (else `null`).
  - `guild_name`: extend the existing ternary to also resolve from
    `ctaMap`/`announcementMap`.
  - `event_title`/`event_date`: stay `null` for these types.

### 3. `Notification` type (`src/entities/notification/model/types.ts`)

Add two fields:

```ts
guild_id: string | null;
title: string | null; // CTA / announcement title (event_title stays event-only)
```

Add two `NOTIFICATION_TYPE_CONFIG` entries:

```ts
new_call_to_action: {
  Icon: Swords,
  feedHref: '/call-to-action',
  switchesGuild: true,
  getLabel: (t, n) => t('newCallToAction', { guildName: n.guild_name ?? '' }),
},
new_announcement: {
  Icon: Megaphone,
  feedHref: '/announcements',
  switchesGuild: true,
  getLabel: (t, n) => t('newAnnouncement', { guildName: n.guild_name ?? '' }),
},
```

Extend the config value type with optional `feedHref?: string` and
`switchesGuild?: boolean`. Import `Swords, Megaphone` from `lucide-react`.

### 4. `NotificationItem` (`src/features/notification-panel/ui/NotificationItem.tsx`)

- Accept a new prop `userId?: string`.
- Compute `href`: existing event/guild logic, plus
  `config.feedHref` for the new types.
- For `switchesGuild` types: render the link **in the same tab** (drop
  `target="_blank"`) and add an `onClick` that, before navigation:
  - `dispatch(setCurrentGuild(notification.guild_id))` (from `@/entities/guild`),
  - if `userId` present, `updateLastActiveGuild(userId, notification.guild_id)`
    (from `@/entities/user`) — fire-and-forget so the feed stays on this guild
    after a later reload. (In-memory dispatch alone already makes same-tab
    navigation land on the right guild; the persist call is best-effort.)
  - keep the existing `onClose()` behavior.
- Sub-line: show `notification.title` (with the same `· date` block omitted —
  CTAs/announcements have no date in the sub-line) for the new types, reusing
  the existing `event_title` rendering branch generalized to also use `title`.

### 5. `userId` threading

There is **no user slice in the Redux store** (`store.ts` has only `ui` and
`guild`), and `getUser` is server-only. So `userId` cannot be read "from the
store" in a client component. Thread it as a prop from the server boundary that
already has the user:

`Header` (server, has `user`) → `NotificationBell` (`userId={user.id}`) →
`NotificationPanel` → `NotificationItem`.

Add an optional `userId?: string` prop to `NotificationBell`,
`NotificationPanel`, and `NotificationItem`.

### 6. i18n

Add to the `Notifications` namespace in every locale file:

```json
"newCallToAction": "New Call to Action in {guildName}",
"newAnnouncement": "New announcement in {guildName}"
```

`Notifications` is already a registered client namespace (no `requiredNamespaces`
change needed).

## Testing

- Unit: `NOTIFICATION_TYPE_CONFIG` includes the new types with correct labels
  (extend `entities/notification/model/types.test.ts`).
- Route handler: enrichment maps CTA/announcement rows to `title`/`guild_id`/
  `guild_name` (extend `app/api/notifications/route.test.ts`).
- Manual: create a CTA and an announcement as one member; confirm other members
  receive notifications, the creator does not, clicking navigates to the feed on
  the correct guild, and deleting the CTA/announcement removes the notification.

## Out of scope

- Email / push notifications.
- Per-item deep links (feeds have no per-id route).
- Notifications for CTA launch / interest events.
