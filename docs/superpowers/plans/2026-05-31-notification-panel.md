# Notification Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bell-icon button in the header that opens a dropdown panel listing the current user's unread/read notifications about new guild events and event invitations.

**Architecture:** New `notifications` DB table populated by two Postgres triggers (new event in guild, event invitation). RTK Query fetches notifications via `/api/notifications`; a single `markAllRead` mutation fires on panel open. FSD layers: `entities/notification` owns types + API, `features/notification-panel` owns all UI, `widgets/header` mounts the bell.

**Tech Stack:** Next.js App Router, RTK Query (`baseApi.injectEndpoints`), Supabase (server client + RLS + PL/pgSQL triggers), CSS Modules, lucide-react, next-intl.

**Spec:** `docs/superpowers/specs/2026-05-31-notification-panel-design.md`

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/shared/api/baseApi.ts` | Add `'Notification'` to `tagTypes` |
| Modify | `src/shared/api/supabase/types.ts` | Add `notifications` table type (regenerate after migration) |
| Create | `src/entities/notification/model/types.ts` | `Notification` interface + `NOTIFICATION_TYPE_CONFIG` |
| Create | `src/entities/notification/api/notificationApi.ts` | RTK Query `getNotifications` + `markAllRead` |
| Create | `src/entities/notification/index.ts` | Public API |
| Create | `src/app/api/notifications/route.ts` | `GET` — fetch last 20 notifications with event+guild data |
| Create | `src/app/api/notifications/read/route.ts` | `PATCH` — mark all as read |
| Create | `src/features/notification-panel/ui/NotificationItem.tsx` | Single notification row |
| Create | `src/features/notification-panel/ui/NotificationItem.module.css` | |
| Create | `src/features/notification-panel/ui/NotificationPanel.tsx` | Dropdown panel with list |
| Create | `src/features/notification-panel/ui/NotificationPanel.module.css` | |
| Create | `src/features/notification-panel/ui/NotificationBell.tsx` | Bell button, badge, open/close logic |
| Create | `src/features/notification-panel/ui/NotificationBell.module.css` | |
| Create | `src/features/notification-panel/index.ts` | Public API |
| Modify | `src/widgets/header/ui/Header.tsx` | Mount `<NotificationBell />` |
| Modify | `messages/en.json` | Add `Notifications` keys |
| Modify | `messages/ru.json` | Add `Notifications` keys |

---

## Task 1: Database migration — table, RLS, triggers

**Files:**
- DB migration (apply via Supabase MCP `apply_migration` or CLI)
- Modify: `src/shared/api/supabase/types.ts`

- [ ] **Step 1: Apply the migration SQL**

Use the Supabase MCP tool `mcp__supabase__apply_migration` (or `supabase db push` locally) with the following SQL:

```sql
-- Table
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,
  entity_type text,
  entity_id   uuid,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Partial index for fast unread lookups
CREATE INDEX notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own notifications"
  ON notifications FOR ALL
  USING (user_id = auth.uid());

-- Trigger: notify guild members when a new event is created
CREATE OR REPLACE FUNCTION notify_new_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, entity_type, entity_id)
  SELECT gm.user_id, 'new_event', 'event', NEW.id
  FROM guild_members gm
  WHERE gm.guild_id = NEW.guild_id
    AND gm.user_id IS DISTINCT FROM NEW.created_by;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_event
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION notify_new_event();

-- Trigger: notify user when they receive an event invitation (status = 'pending')
CREATE OR REPLACE FUNCTION notify_invitation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, entity_type, entity_id)
    VALUES (NEW.user_id, 'invitation', 'event', NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_invitation
  AFTER INSERT ON event_participants
  FOR EACH ROW EXECUTE FUNCTION notify_invitation();
```

- [ ] **Step 2: Regenerate TypeScript types**

Run `mcp__supabase__generate_typescript_types` and replace `src/shared/api/supabase/types.ts` with the result.

If the tool is unavailable, manually add the following block inside the `Tables` object in `src/shared/api/supabase/types.ts` (in alphabetical order, after `guild_members`):

```ts
notifications: {
  Row: {
    id: string
    user_id: string
    type: string
    entity_type: string | null
    entity_id: string | null
    is_read: boolean
    created_at: string
  }
  Insert: {
    id?: string
    user_id: string
    type: string
    entity_type?: string | null
    entity_id?: string | null
    is_read?: boolean
    created_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    type?: string
    entity_type?: string | null
    entity_id?: string | null
    is_read?: boolean
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
  ]
}
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

---

## Task 2: Notification entity — types, RTK Query API, baseApi update

**Files:**
- Modify: `src/shared/api/baseApi.ts`
- Create: `src/entities/notification/model/types.ts`
- Create: `src/entities/notification/api/notificationApi.ts`
- Create: `src/entities/notification/index.ts`

- [ ] **Step 1: Add `'Notification'` to baseApi tagTypes**

In `src/shared/api/baseApi.ts`, change line 6:

```ts
// Before:
tagTypes: ['Event', 'Participant', 'GuildMember', 'Guild'],

// After:
tagTypes: ['Event', 'Participant', 'GuildMember', 'Guild', 'Notification'],
```

- [ ] **Step 2: Create `src/entities/notification/model/types.ts`**

```ts
import { Calendar, Mail } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  event_title: string | null;
  event_date: string | null;
  guild_name: string | null;
}

export type NotificationTranslationFn = (key: string, values?: Record<string, string>) => string;

export const NOTIFICATION_TYPE_CONFIG: Record<string, {
  Icon: LucideIcon;
  getLabel: (t: NotificationTranslationFn, n: Notification) => string;
}> = {
  new_event: {
    Icon: Calendar,
    getLabel: (t, n) => t('newEvent', { guildName: n.guild_name ?? '' }),
  },
  invitation: {
    Icon: Mail,
    getLabel: (t) => t('invitation'),
  },
};
```

> **Extensibility note:** To add a new notification type in the future, add one entry to `NOTIFICATION_TYPE_CONFIG`. No other frontend files need to change.

- [ ] **Step 3: Create `src/entities/notification/api/notificationApi.ts`**

```ts
import { baseApi } from '@/shared/api/baseApi';
import type { Notification } from '../model/types';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<Notification[], void>({
      query: () => 'notifications',
      providesTags: [{ type: 'Notification' as const, id: 'LIST' }],
    }),
    markAllRead: build.mutation<void, void>({
      query: () => ({ url: 'notifications/read', method: 'PATCH' }),
      invalidatesTags: [{ type: 'Notification' as const, id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetNotificationsQuery, useMarkAllReadMutation } = notificationApi;
```

- [ ] **Step 4: Create `src/entities/notification/index.ts`**

```ts
export type { Notification } from './model/types';
export { NOTIFICATION_TYPE_CONFIG } from './model/types';
export { useGetNotificationsQuery, useMarkAllReadMutation } from './api/notificationApi';
```

- [ ] **Step 5: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

---

## Task 3: GET /api/notifications route

**Files:**
- Create: `src/app/api/notifications/route.ts`

- [ ] **Step 1: Create `src/app/api/notifications/route.ts`**

This route relies on RLS for ownership — no explicit `auth.getUser()` needed. It fetches the last 20 notifications, then batch-fetches the related events (with guild names) in a second query, since `entity_id` has no FK constraint.

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, type, entity_type, entity_id, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!notifications?.length) return NextResponse.json([]);

  const eventIds = notifications
    .filter((n) => n.entity_type === 'event' && n.entity_id)
    .map((n) => n.entity_id as string);

  let eventsMap: Record<string, { title: string; event_date: string; guild_name: string | null }> = {};

  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from('events')
      .select('id, title, event_date, guilds(name)')
      .in('id', eventIds);

    eventsMap = Object.fromEntries(
      (events ?? []).map((e) => {
        const guild = e.guilds as { name: string } | null;
        return [e.id, {
          title: e.title,
          event_date: e.event_date,
          guild_name: guild?.name ?? null,
        }];
      })
    );
  }

  const result = notifications.map((n) => ({
    ...n,
    event_title: eventsMap[n.entity_id ?? '']?.title ?? null,
    event_date: eventsMap[n.entity_id ?? '']?.event_date ?? null,
    guild_name: eventsMap[n.entity_id ?? '']?.guild_name ?? null,
  }));

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

---

## Task 4: PATCH /api/notifications/read route

**Files:**
- Create: `src/app/api/notifications/read/route.ts`

- [ ] **Step 1: Create `src/app/api/notifications/read/route.ts`**

This is a mutation endpoint — uses `requireUser()` following the two-tier auth model. RLS already restricts writes to own rows; the explicit `user_id` filter is an extra safeguard.

```ts
import { NextResponse } from 'next/server';
import { requireUser } from '@/shared/api/guildAuth';

export async function PATCH() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { error } = await auth.supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', auth.user.id)
    .eq('is_read', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

---

## Task 5: NotificationItem component

**Files:**
- Create: `src/features/notification-panel/ui/NotificationItem.tsx`
- Create: `src/features/notification-panel/ui/NotificationItem.module.css`

- [ ] **Step 1: Create `src/features/notification-panel/ui/NotificationItem.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { NOTIFICATION_TYPE_CONFIG, type Notification, type NotificationTranslationFn } from '@/entities/notification';
import styles from './NotificationItem.module.css';

interface Props {
  notification: Notification;
}

export const NotificationItem = ({ notification }: Props) => {
  const t = useTranslations('Notifications');
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];

  if (!config) return null;

  const { Icon, getLabel } = config;
  // next-intl's typed t function is not directly assignable to NotificationTranslationFn
  // due to overloaded signatures; the cast is intentional.
  const label = getLabel(t as unknown as NotificationTranslationFn, notification);

  return (
    <div className={`${styles.item} ${notification.is_read ? styles.itemRead : ''}`}>
      <Icon size={16} className={styles.icon} />
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        {notification.event_title && (
          <span className={styles.sub}>
            {notification.event_title}
            {notification.event_date && ` · ${dayjs(notification.event_date).format('D MMM')}`}
          </span>
        )}
      </div>
      {!notification.is_read && <span className={styles.dot} />}
    </div>
  );
};
```

- [ ] **Step 2: Create `src/features/notification-panel/ui/NotificationItem.module.css`**

```css
.item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
  transition: background 0.15s ease;
}

.item:last-child {
  border-bottom: none;
}

.item:hover {
  background: var(--accent-glow);
}

.itemRead {
  opacity: 0.55;
  background: transparent;
}

.icon {
  color: var(--accent-primary);
  margin-top: 2px;
  flex-shrink: 0;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-primary);
  flex-shrink: 0;
  margin-top: 4px;
}
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

---

## Task 6: NotificationPanel component

**Files:**
- Create: `src/features/notification-panel/ui/NotificationPanel.tsx`
- Create: `src/features/notification-panel/ui/NotificationPanel.module.css`

- [ ] **Step 1: Create `src/features/notification-panel/ui/NotificationPanel.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { Notification } from '@/entities/notification';
import { NotificationItem } from './NotificationItem';
import styles from './NotificationPanel.module.css';

interface Props {
  notifications: Notification[];
}

export const NotificationPanel = ({ notifications }: Props) => {
  const t = useTranslations('Notifications');

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
      </div>
      {notifications.length === 0 ? (
        <div className={styles.empty}>{t('empty')}</div>
      ) : (
        <ul className={styles.list}>
          {notifications.map((n) => (
            <li key={n.id}>
              <NotificationItem notification={n} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create `src/features/notification-panel/ui/NotificationPanel.module.css`**

```css
.panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  background: var(--modal-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--shadow-glass);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  z-index: 200;
  overflow: hidden;
}

.header {
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--glass-border);
}

.title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 360px;
  overflow-y: auto;
}

.empty {
  padding: 1.5rem 0.875rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

---

## Task 7: NotificationBell component + feature index

**Files:**
- Create: `src/features/notification-panel/ui/NotificationBell.tsx`
- Create: `src/features/notification-panel/ui/NotificationBell.module.css`
- Create: `src/features/notification-panel/index.ts`

- [ ] **Step 1: Create `src/features/notification-panel/ui/NotificationBell.tsx`**

Fetches notifications on mount (for badge count). On toggle-open: fires `markAllRead` if there are unread items, then `invalidatesTags` triggers a refetch that clears the badge after the panel opens.

```tsx
'use client';

import { Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useGetNotificationsQuery, useMarkAllReadMutation } from '@/entities/notification';
import { NotificationPanel } from './NotificationPanel';
import styles from './NotificationBell.module.css';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications = [] } = useGetNotificationsQuery();
  const [markAllRead] = useMarkAllReadMutation();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleToggle = () => {
    if (!isOpen && unreadCount > 0) markAllRead();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button className={styles.bell} onClick={handleToggle} aria-label="Notifications">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {isOpen && <NotificationPanel notifications={notifications} />}
    </div>
  );
};
```

- [ ] **Step 2: Create `src/features/notification-panel/ui/NotificationBell.module.css`**

```css
.wrapper {
  position: relative;
}

.bell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--text-primary);
  cursor: pointer;
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  transition: all 0.2s ease;
  position: relative;
}

.bell:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.bell:focus {
  border-color: var(--accent-primary);
  outline: none;
  box-shadow: 0 0 10px var(--accent-glow);
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #e74c3c;
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 5px;
  line-height: 1.4;
  min-width: 16px;
  text-align: center;
}
```

- [ ] **Step 3: Create `src/features/notification-panel/index.ts`**

```ts
export { NotificationBell } from './ui/NotificationBell';
```

- [ ] **Step 4: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

---

## Task 8: Wire into Header + i18n keys

**Files:**
- Modify: `src/widgets/header/ui/Header.tsx`
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add i18n keys to `messages/en.json`**

Add the following top-level key (alphabetical order doesn't matter, keep after existing keys):

```json
"Notifications": {
  "title": "Notifications",
  "newEvent": "New event in «{guildName}»",
  "invitation": "You're invited to an event",
  "empty": "No notifications"
}
```

- [ ] **Step 2: Add i18n keys to `messages/ru.json`**

```json
"Notifications": {
  "title": "Уведомления",
  "newEvent": "Новое событие в «{guildName}»",
  "invitation": "Вас пригласили на событие",
  "empty": "Нет уведомлений"
}
```

- [ ] **Step 3: Mount `NotificationBell` in `src/widgets/header/ui/Header.tsx`**

Add the import at the top of the file:

```ts
import { NotificationBell } from '@/features/notification-panel';
```

In the JSX, add `<NotificationBell />` between `<AiHelperButton />` and `<UserMenu email={user.email} />`:

```tsx
{user ? (
  <>
    <AiHelperButton />
    <NotificationBell />
    <UserMenu email={user.email} />
  </>
) : (
```

- [ ] **Step 4: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Verify tests still pass**

```bash
npm run test:run
```

Expected: all existing tests pass (no new tests added per project rules).
