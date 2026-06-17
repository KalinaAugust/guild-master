# CTA & Announcement Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify all guild members (except the creator) in-app when a new Call to Action or Announcement is created in their guild.

**Architecture:** Mirror the existing `new_event` flow end-to-end: DB `AFTER INSERT` triggers write `notifications` rows; `GET /api/notifications` enriches them via joins; `NOTIFICATION_TYPE_CONFIG` maps each type to an icon + label; `NotificationItem` links to the guild-scoped feed and switches the active guild on click.

**Tech Stack:** Next.js 16 (App Router), React 19, Redux Toolkit + RTK Query, Supabase (Postgres triggers, RLS), next-intl, Vitest, CSS Modules.

## Global Constraints

- Supabase migrations: no CLI — apply DDL via Supabase MCP `apply_migration`, then regenerate/hand-edit types. No SQL files in the repo for this work.
- FSD import direction only (`app → widgets → features → entities → shared`); cross-slice same-layer imports forbidden; import slices via their `index.ts` barrel only.
- Trigger functions: `SECURITY DEFINER`, `SET search_path TO ''`, fully-qualified table names (`public.<table>`).
- Recipients: every `guild_members.user_id` of the row's guild where `user_id IS DISTINCT FROM <creator>`.
- Two locales only: `messages/en.json`, `messages/ru.json`. Both must be updated together.
- No inline styles; CSS Modules only. `React.SubmitEvent` (not `FormEvent`); `React.MouseEvent` is fine.
- Baseline noise to ignore when verifying: master has 3 pre-existing `tsc` errors and 2 `lint:fsd` insignificant-slice warnings.

---

### Task 1: DB triggers for new CTA & announcement notifications

**Files:**
- Apply via Supabase MCP `apply_migration` (project `uzmyvxpjsfobqkcepygh`), migration name `notify_new_cta_and_announcement`.
- No repo files change in this task.

**Interfaces:**
- Produces: `notifications` rows with `type IN ('new_call_to_action','new_announcement')`, `entity_type IN ('call_to_action','announcement')`, `entity_id = <row id>`. Consumed by Task 3 (route handler) and Task 2 (config types).

- [ ] **Step 1: Apply the migration**

Use Supabase MCP `apply_migration` with this SQL:

```sql
-- New Call to Action -> notify guild members (except creator)
create or replace function public.notify_new_call_to_action()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.notifications (user_id, type, entity_type, entity_id)
  select gm.user_id, 'new_call_to_action', 'call_to_action', new.id
  from public.guild_members gm
  where gm.guild_id = new.guild_id
    and gm.user_id is distinct from new.created_by;
  return new;
end;
$function$;

create trigger trg_notify_new_call_to_action
after insert on public.call_to_actions
for each row execute function public.notify_new_call_to_action();

-- New Announcement -> notify guild members (except creator)
create or replace function public.notify_new_announcement()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.notifications (user_id, type, entity_type, entity_id)
  select gm.user_id, 'new_announcement', 'announcement', new.id
  from public.guild_members gm
  where gm.guild_id = new.guild_id
    and gm.user_id is distinct from new.created_by;
  return new;
end;
$function$;

create trigger trg_notify_new_announcement
after insert on public.announcements
for each row execute function public.notify_new_announcement();

-- Cleanup on delete (CTAs are pruned by the hourly job; avoid stale notifications)
create or replace function public.delete_call_to_action_notifications()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  delete from public.notifications
  where entity_type = 'call_to_action' and entity_id = old.id;
  return old;
end;
$function$;

create trigger trg_delete_call_to_action_notifications
after delete on public.call_to_actions
for each row execute function public.delete_call_to_action_notifications();

create or replace function public.delete_announcement_notifications()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  delete from public.notifications
  where entity_type = 'announcement' and entity_id = old.id;
  return old;
end;
$function$;

create trigger trg_delete_announcement_notifications
after delete on public.announcements
for each row execute function public.delete_announcement_notifications();
```

- [ ] **Step 2: Verify triggers exist**

Run via Supabase MCP `execute_sql`:

```sql
select event_object_table, trigger_name, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'trg_notify_new_call_to_action','trg_notify_new_announcement',
    'trg_delete_call_to_action_notifications','trg_delete_announcement_notifications'
  )
order by event_object_table;
```

Expected: 4 rows — INSERT triggers on `call_to_actions` and `announcements`, DELETE triggers on each.

- [ ] **Step 3: Check security advisors**

Run Supabase MCP `get_advisors` with `type: "security"`. Expected: no new findings about the four functions (they already set `search_path` and are `SECURITY DEFINER`, matching `notify_new_event`).

---

### Task 2: Extend Notification type & config

**Files:**
- Modify: `src/entities/notification/model/types.ts`
- Test: `src/entities/notification/model/types.test.ts`

**Interfaces:**
- Consumes: `type` values from Task 1.
- Produces: `Notification` gains `guild_id: string | null` and `title: string | null`; `NOTIFICATION_TYPE_CONFIG` gains `new_call_to_action` and `new_announcement` entries; config value type gains optional `feedHref?: string` and `switchesGuild?: boolean`. Consumed by Tasks 3 & 5.

- [ ] **Step 1: Write failing tests**

Append to `src/entities/notification/model/types.test.ts`. Also add the two new fields to the `base` fixture object (after `guild_name: null,`):

```ts
  guild_id: null,
  title: null,
```

Then add these tests inside the `describe`:

```ts
  it('new_call_to_action: getLabel includes guildName and config has feed link', () => {
    const cfg = NOTIFICATION_TYPE_CONFIG.new_call_to_action;
    expect(cfg.feedHref).toBe('/call-to-action');
    expect(cfg.switchesGuild).toBe(true);
    const label = cfg.getLabel!(t, { ...base, guild_name: 'Alpha' });
    expect(label).toBe(t('newCallToAction', { guildName: 'Alpha' }));
  });

  it('new_announcement: getLabel includes guildName and config has feed link', () => {
    const cfg = NOTIFICATION_TYPE_CONFIG.new_announcement;
    expect(cfg.feedHref).toBe('/announcements');
    expect(cfg.switchesGuild).toBe(true);
    const label = cfg.getLabel!(t, { ...base, guild_name: 'Alpha' });
    expect(label).toBe(t('newAnnouncement', { guildName: 'Alpha' }));
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/entities/notification/model/types.test.ts`
Expected: FAIL — `cfg.feedHref` undefined / `new_call_to_action` missing, and TS errors on `guild_id`/`title`.

- [ ] **Step 3: Implement type & config changes**

In `src/entities/notification/model/types.ts`:

Update the lucide import to add the two icons:

```ts
import { Calendar, UserRoundPlus, UserPlus, CheckCircle, XCircle, MessageSquare, Swords, Megaphone } from 'lucide-react';
```

Add the two fields to the `Notification` interface (after `guild_name`):

```ts
  guild_id: string | null;
  title: string | null;
```

Extend the config value type — add these two optional members to the `Record<string, { ... }>` shape (alongside `messageKey`/`linksToGuild`):

```ts
  // Guild-scoped feed notifications (CTA / announcement): link to the feed
  // page and switch the active guild on click.
  feedHref?: string;
  switchesGuild?: boolean;
```

Add the two entries at the end of `NOTIFICATION_TYPE_CONFIG` (before the closing `}`):

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run src/entities/notification/model/types.test.ts`
Expected: PASS (all tests, including the two new ones).

- [ ] **Step 5: Commit**

```bash
git add src/entities/notification/model/types.ts src/entities/notification/model/types.test.ts
git commit -m "feat(notification): add CTA & announcement notification types"
```

---

### Task 3: Enrich CTA & announcement notifications in the route handler

**Files:**
- Modify: `src/app/api/notifications/route.ts`
- Test: `src/app/api/notifications/route.test.ts`

**Interfaces:**
- Consumes: notification rows from Task 1; `Notification` fields from Task 2 (`guild_id`, `title`).
- Produces: JSON objects where CTA/announcement rows carry `title`, `guild_id`, `guild_name`.

- [ ] **Step 1: Write a failing test**

Append inside the `describe` in `src/app/api/notifications/route.test.ts`:

```ts
  it('enriches call_to_action notifications with title, guild_id and guild name', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: [
        { id: 'n2', type: 'new_call_to_action', entity_type: 'call_to_action', entity_id: 'c1', is_read: false, created_at: 't' },
      ] }))
      .mockReturnValueOnce(query({ data: [
        { id: 'c1', title: 'Raid night', guild_id: 'g1', guilds: { name: 'Alpha' } },
      ] }));
    useFrom(from);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json[0].title).toBe('Raid night');
    expect(json[0].guild_id).toBe('g1');
    expect(json[0].guild_name).toBe('Alpha');
    expect(json[0].event_title).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/app/api/notifications/route.test.ts`
Expected: FAIL — `json[0].title` is `undefined`, `guild_id`/`guild_name` null.

- [ ] **Step 3: Implement enrichment**

Replace the body of `src/app/api/notifications/route.ts` (keep the imports at top) so it reads:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

type FeedRow = { title: string; guild_id: string | null; guild_name: string | null };

export async function GET() {
  const supabase = await createClient();

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, type, entity_type, entity_id, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!notifications?.length) return NextResponse.json([]);

  const idsOf = (entityType: string) => [...new Set(
    notifications
      .filter((n) => n.entity_type === entityType && n.entity_id)
      .map((n) => n.entity_id as string)
  )];

  const eventIds = idsOf('event');
  const guildIds = idsOf('guild');
  const ctaIds = idsOf('call_to_action');
  const announcementIds = idsOf('announcement');

  let eventsMap: Record<string, { title: string; event_date: string; guild_name: string | null }> = {};
  let guildsMap: Record<string, string> = {};
  let ctaMap: Record<string, FeedRow> = {};
  let announcementMap: Record<string, FeedRow> = {};

  if (eventIds.length > 0) {
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, event_date, guilds(name)')
      .in('id', eventIds);

    if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 });

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

  if (guildIds.length > 0) {
    const { data: guilds } = await supabase
      .from('guilds')
      .select('id, name')
      .in('id', guildIds);

    guildsMap = Object.fromEntries((guilds ?? []).map((g) => [g.id, g.name]));
  }

  const buildFeedMap = async (table: 'call_to_actions' | 'announcements', ids: string[]) => {
    if (ids.length === 0) return {} as Record<string, FeedRow>;
    const { data } = await supabase
      .from(table)
      .select('id, title, guild_id, guilds(name)')
      .in('id', ids);
    return Object.fromEntries(
      (data ?? []).map((r) => {
        const guild = r.guilds as { name: string } | null;
        return [r.id, { title: r.title, guild_id: r.guild_id ?? null, guild_name: guild?.name ?? null }];
      })
    ) as Record<string, FeedRow>;
  };

  ctaMap = await buildFeedMap('call_to_actions', ctaIds);
  announcementMap = await buildFeedMap('announcements', announcementIds);

  const result = notifications.map((n) => {
    const id = n.entity_id ?? '';
    const feed = n.entity_type === 'call_to_action'
      ? ctaMap[id]
      : n.entity_type === 'announcement'
        ? announcementMap[id]
        : undefined;
    return {
      ...n,
      event_title: n.entity_type === 'event' ? (eventsMap[id]?.title ?? null) : null,
      event_date: n.entity_type === 'event' ? (eventsMap[id]?.event_date ?? null) : null,
      title: feed?.title ?? null,
      guild_id: feed?.guild_id ?? null,
      guild_name: n.entity_type === 'event'
        ? (eventsMap[id]?.guild_name ?? null)
        : n.entity_type === 'guild'
          ? (guildsMap[id] ?? null)
          : (feed?.guild_name ?? null),
    };
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run src/app/api/notifications/route.test.ts`
Expected: PASS (existing event/empty/error tests + the new CTA test).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/notifications/route.ts src/app/api/notifications/route.test.ts
git commit -m "feat(api): enrich CTA & announcement notifications with title and guild"
```

---

### Task 4: Add i18n labels

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

**Interfaces:**
- Consumes: label keys referenced by config in Task 2 (`newCallToAction`, `newAnnouncement`).
- Produces: translations in the `Notifications` namespace. (Already a registered client namespace — no `requiredNamespaces` change.)

- [ ] **Step 1: Add EN keys**

In `messages/en.json`, inside the `"Notifications"` object, after `"eventComment"`, add:

```json
"newCallToAction": "New Call to Action in «{guildName}»",
"newAnnouncement": "New announcement in «{guildName}»"
```

(Add a comma after the previous `eventComment` line so JSON stays valid.)

- [ ] **Step 2: Add RU keys**

In `messages/ru.json`, inside the `"Notifications"` object, after `"eventComment"`, add:

```json
"newCallToAction": "Новый призыв к действию в «{guildName}»",
"newAnnouncement": "Новый анонс в «{guildName}»"
```

- [ ] **Step 3: Verify JSON validity**

Run: `node -e "require('./messages/en.json'); require('./messages/ru.json'); console.log('ok')"`
Expected: prints `ok` (no JSON parse error).

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "i18n: add CTA & announcement notification labels"
```

---

### Task 5: Wire NotificationItem navigation + thread userId

**Files:**
- Modify: `src/features/notification-panel/ui/NotificationItem.tsx`
- Modify: `src/features/notification-panel/ui/NotificationPanel.tsx`
- Modify: `src/features/notification-panel/ui/NotificationBell.tsx`
- Modify: `src/widgets/header/ui/Header.tsx`

**Interfaces:**
- Consumes: `Notification.guild_id`/`title` (Task 2), `feedHref`/`switchesGuild` config (Task 2), labels (Task 4); `setCurrentGuild` from `@/entities/guild`; `updateLastActiveGuild` from `@/entities/user`; `useAppDispatch` from `@/shared/lib/hooks`.
- Produces: `userId?: string` prop on `NotificationBell`, `NotificationPanel`, `NotificationItem`.

**Note:** No automated test — this is presentational/navigation wiring verified by tsc + lint. Per project rule, do NOT launch the browser; the user verifies the UI.

- [ ] **Step 1: Update `NotificationItem.tsx`**

Add imports (top of file, with the other imports):

```ts
import { useAppDispatch } from '@/shared/lib/hooks';
import { setCurrentGuild } from '@/entities/guild';
import { updateLastActiveGuild } from '@/entities/user';
```

Change the `Props` interface to add `userId`:

```ts
interface Props {
  notification: Notification;
  userId?: string;
  onClose?: () => void;
}
```

Update the component signature and add the dispatch hook + click handler. Replace the `href` computation so it also resolves `config.feedHref`:

```ts
export const NotificationItem = ({ notification, userId, onClose }: Props) => {
  const t = useTranslations('Notifications');
  const locale = useLocale();
  const [markAsRead] = useMarkAsReadMutation();
  const dispatch = useAppDispatch();
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];

  if (!config) return null;

  const { Icon } = config;
  const timeAgo = dayjs(notification.created_at).locale(locale).fromNow();

  const handleMouseEnter = () => {
    if (!notification.is_read) markAsRead(notification.id);
  };

  const href =
    notification.entity_id && notification.entity_type === 'event'
      ? `/events/${notification.entity_id}`
      : notification.entity_id && notification.entity_type === 'guild'
        ? `/guilds/${notification.entity_id}`
        : config.feedHref ?? null;

  // Feed notifications (CTA / announcement) open the guild-scoped feed in the
  // same tab and switch the active guild so the feed lands on the right guild.
  const handleFeedClick = () => {
    if (config.switchesGuild && notification.guild_id) {
      dispatch(setCurrentGuild(notification.guild_id));
      if (userId) {
        updateLastActiveGuild(userId, notification.guild_id).catch((err) => {
          console.error('Failed to update last active guild:', err);
        });
      }
    }
    onClose?.();
  };
```

Then update the JSX. For the title sub-line, render either `event_title` (events) or `title` (feeds). Replace the sub-line block and actions link so feed types use `handleFeedClick` and same-tab navigation:

```tsx
  const subTitle = notification.event_title ?? notification.title;
  const isFeed = Boolean(config.switchesGuild);

  return (
    <div
      className={`${styles.item} ${notification.is_read ? styles.itemRead : ''}`}
      onMouseEnter={handleMouseEnter}
    >
      <Icon size={16} className={styles.icon} />
      <div className={styles.content}>
        <span className={styles.time}>{timeAgo}</span>
        <span className={styles.label}>{label}</span>
        {subTitle && (
          <span className={styles.sub}>
            {href ? (
              <Link
                href={href}
                className={styles.titleLink}
                {...(isFeed
                  ? { onClick: handleFeedClick }
                  : { target: '_blank', rel: 'noopener noreferrer', onClick: onClose })}
              >
                {subTitle}
              </Link>
            ) : (
              subTitle
            )}
            {notification.event_date && ` · ${dayjs(notification.event_date).format('D MMM')}`}
          </span>
        )}
      </div>
      <div className={styles.actions}>
        {href && (
          <Link
            href={href}
            className={styles.link}
            {...(isFeed
              ? { onClick: handleFeedClick }
              : { target: '_blank', rel: 'noopener noreferrer', onClick: onClose })}
          >
            <ArrowUpRight size={14} />
          </Link>
        )}
        {!notification.is_read && <span className={styles.dot} />}
      </div>
    </div>
  );
```

Keep the existing `label` computation (the `config.linksToGuild` rich branch and `getLabel` fallback) unchanged between `handleFeedClick` and `return`.

- [ ] **Step 2: Thread `userId` through `NotificationPanel.tsx`**

Add `userId` to `Props` and pass it down:

```tsx
interface Props {
  notifications: Notification[];
  userId?: string;
  onMarkAllRead?: () => void;
  onClose?: () => void;
}

export const NotificationPanel = ({ notifications, userId, onMarkAllRead, onClose }: Props) => {
```

And in the list render, pass it to the item:

```tsx
              <NotificationItem notification={n} userId={userId} onClose={onClose} />
```

- [ ] **Step 3: Thread `userId` through `NotificationBell.tsx`**

Add a prop and forward it. Change the component signature:

```tsx
interface Props {
  userId?: string;
}

export const NotificationBell = ({ userId }: Props) => {
```

And pass it to the panel:

```tsx
      {isOpen && <NotificationPanel notifications={knownNotifications} userId={userId} onMarkAllRead={markAllRead} onClose={() => setIsOpen(false)} />}
```

- [ ] **Step 4: Pass `userId` from `Header.tsx`**

`Header` already awaits `getUser()`. Pass the id:

```tsx
            <NotificationBell userId={user.id} />
```

- [ ] **Step 5: Verify types & lint**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors beyond the 3 known baseline errors.

Run: `pnpm lint`
Expected: passes (only the 2 known `lint:fsd` insignificant-slice warnings, unrelated to these files).

Run: `pnpm test:run src/entities/notification src/app/api/notifications`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/notification-panel/ui/NotificationItem.tsx src/features/notification-panel/ui/NotificationPanel.tsx src/features/notification-panel/ui/NotificationBell.tsx src/widgets/header/ui/Header.tsx
git commit -m "feat(notification-panel): navigate to feed and switch guild for CTA & announcement notifications"
```

---

### Task 6: Regenerate Supabase types & update docs

**Files:**
- Modify: `src/shared/api/supabase/types.ts` (only if trigger functions surface in generated types — usually a no-op for triggers; verify).
- Modify: `src/CLAUDE.md` (document the new triggers under the schema notes).

**Interfaces:**
- Consumes: triggers from Task 1.
- Produces: up-to-date docs.

- [ ] **Step 1: Check generated types**

Run Supabase MCP `generate_typescript_types`. Triggers don't add tables/columns, so `types.ts` likely needs no change. If the diff is empty, skip editing. If functions appear under `Functions`, hand-merge them into `src/shared/api/supabase/types.ts` (the project hand-edits types per the migrations workflow).

- [ ] **Step 2: Document the triggers in `src/CLAUDE.md`**

In the `## Database Schema (Supabase)` area, add a short note near the `call_to_actions` / `announcements` rows (or in a "Triggers" note) stating: inserting a `call_to_actions` or `announcements` row fires `notify_new_call_to_action` / `notify_new_announcement`, which notify all guild members except the creator; deletion fires the matching cleanup triggers. Keep it one or two lines, matching the file's terse style.

- [ ] **Step 3: Run the graph update**

Run: `graphify update .`
Expected: completes (AST-only, no API cost).

- [ ] **Step 4: Commit**

```bash
git add src/CLAUDE.md src/shared/api/supabase/types.ts
git commit -m "docs: note CTA & announcement notification triggers"
```

---

## Self-Review

**Spec coverage:**
- §1 DB triggers → Task 1 ✓ (insert + cleanup, both tables).
- §2 Route enrichment → Task 3 ✓.
- §3 Type + config → Task 2 ✓ (`guild_id`, `title`, `feedHref`, `switchesGuild`, `Swords`/`Megaphone`).
- §4 NotificationItem navigation → Task 5 ✓ (same-tab, `setCurrentGuild` + `updateLastActiveGuild`).
- §5 userId threading → Task 5 ✓ (Header → Bell → Panel → Item).
- §6 i18n → Task 4 ✓ (en + ru).
- Testing section → Tasks 2 & 3 add unit/route tests; manual steps noted in spec.
- Docs/types upkeep → Task 6 ✓.

**Placeholder scan:** No TBD/TODO; all code blocks complete; SQL, route handler, and component code given in full.

**Type consistency:** `guild_id`/`title` added in Task 2 are used identically in Tasks 3 & 5; config members `feedHref`/`switchesGuild` defined in Task 2 and consumed in Task 5; `setCurrentGuild`/`updateLastActiveGuild`/`useAppDispatch` import paths match existing usage in `useGuildSelection.ts`.
