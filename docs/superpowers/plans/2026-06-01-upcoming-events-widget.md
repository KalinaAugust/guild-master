# Upcoming Events Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static "Guild Master" h1 on the home page with a glass-panel strip that shows the next upcoming event (left) and the current user's events this week grouped by type (right).

**Architecture:** New FSD widget `src/widgets/upcoming-events/` with two lib hooks and four UI components. No new API endpoint for events — `useGetEventsQuery` reused — but one new endpoint `GET /api/my-event-ids?guildId=` is added to find which events the user participates in. All tooltips use the existing Radix-based `Tooltip` from `src/shared/ui/Tooltip`.

**Tech Stack:** Next.js App Router, React 19, RTK Query, Supabase SSR client, CSS Modules, lucide-react, dayjs, Radix UI Tooltip.

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/widgets/upcoming-events/lib/useNextEvent.ts` |
| Create | `src/widgets/upcoming-events/lib/useNextEvent.test.ts` |
| Create | `src/entities/event/api/getMyEventIds.ts` |
| Create | `src/app/api/my-event-ids/route.ts` |
| Modify | `src/entities/event/api/eventApi.ts` |
| Create | `src/widgets/upcoming-events/lib/useWeekEventsByType.ts` |
| Create | `src/widgets/upcoming-events/lib/useWeekEventsByType.test.ts` |
| Create | `src/widgets/upcoming-events/ui/ParticipantsTooltip.tsx` |
| Create | `src/widgets/upcoming-events/ui/EventTypeTooltip.tsx` |
| Create | `src/widgets/upcoming-events/ui/NextEventBlock.tsx` |
| Create | `src/widgets/upcoming-events/ui/WeekByTypeBlock.tsx` |
| Create | `src/widgets/upcoming-events/ui/UpcomingEventsStrip.tsx` |
| Create | `src/widgets/upcoming-events/ui/UpcomingEventsStrip.module.css` |
| Create | `src/widgets/upcoming-events/index.ts` |
| Modify | `src/app/page.tsx` |
| Modify | `src/app/HomePage.module.css` |

---

## Task 1: `useNextEvent` hook

**Files:**
- Create: `src/widgets/upcoming-events/lib/useNextEvent.ts`
- Create: `src/widgets/upcoming-events/lib/useNextEvent.test.ts`

- [ ] **Step 1: Write the failing test**

`src/widgets/upcoming-events/lib/useNextEvent.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNextEvent } from './useNextEvent';
import type { ActivityEvent } from '@/shared/types';

const make = (date: string, time: string, id = '1'): ActivityEvent => ({
  id, title: 'Test', date, time, type: 'raid',
});

describe('useNextEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns null for empty array', () => {
    const { result } = renderHook(() => useNextEvent([]));
    expect(result.current).toBeNull();
  });

  it('returns null when all events are in the past', () => {
    const { result } = renderHook(() => useNextEvent([make('2026-05-31', '10:00')]));
    expect(result.current).toBeNull();
  });

  it('returns the single future event', () => {
    const event = make('2026-06-02', '18:00');
    const { result } = renderHook(() => useNextEvent([event]));
    expect(result.current).toBe(event);
  });

  it('returns the earliest of multiple future events', () => {
    const later = make('2026-06-10', '20:00', '2');
    const sooner = make('2026-06-03', '09:00', '1');
    const { result } = renderHook(() => useNextEvent([later, sooner]));
    expect(result.current).toBe(sooner);
  });

  it('ignores past events when future ones exist', () => {
    const past = make('2026-05-30', '18:00', 'past');
    const future = make('2026-06-05', '18:00', 'future');
    const { result } = renderHook(() => useNextEvent([past, future]));
    expect(result.current).toBe(future);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test:run -- src/widgets/upcoming-events/lib/useNextEvent.test.ts
```
Expected: `Cannot find module './useNextEvent'`

- [ ] **Step 3: Implement `useNextEvent`**

`src/widgets/upcoming-events/lib/useNextEvent.ts`:
```typescript
import { useMemo } from 'react';
import dayjs from '@/shared/lib/dayjs';
import type { ActivityEvent } from '@/shared/types';

export const useNextEvent = (events: ActivityEvent[]): ActivityEvent | null =>
  useMemo(() => {
    const now = dayjs();
    const future = events.filter(e => dayjs(`${e.date}T${e.time}`).isAfter(now));
    if (future.length === 0) return null;
    return future.reduce((a, b) =>
      dayjs(`${a.date}T${a.time}`).isBefore(dayjs(`${b.date}T${b.time}`)) ? a : b
    );
  }, [events]);
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm run test:run -- src/widgets/upcoming-events/lib/useNextEvent.test.ts
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/upcoming-events/lib/useNextEvent.ts src/widgets/upcoming-events/lib/useNextEvent.test.ts
git commit -m "feat: add useNextEvent hook"
```

---

## Task 2: `getMyEventIds` — Supabase fn, API route, RTK Query endpoint

**Files:**
- Create: `src/entities/event/api/getMyEventIds.ts`
- Create: `src/app/api/my-event-ids/route.ts`
- Modify: `src/entities/event/api/eventApi.ts`

- [ ] **Step 1: Create Supabase data function**

`src/entities/event/api/getMyEventIds.ts`:
```typescript
import { createClient } from '@/shared/api/supabase/server';

export const getMyEventIds = async (guildId: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('event_participants')
    .select('event_id, events!inner(guild_id)')
    .eq('user_id', user.id)
    .eq('events.guild_id', guildId)
    .in('status', ['confirmed', 'pending']);

  if (error) throw error;
  return ((data as { event_id: string }[]) ?? []).map(row => row.event_id);
};
```

- [ ] **Step 2: Create API route**

`src/app/api/my-event-ids/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getMyEventIds } from '@/entities/event/api/getMyEventIds';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });
  try {
    const eventIds = await getMyEventIds(guildId);
    return NextResponse.json({ eventIds });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch event IDs' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Inject endpoint into `eventApi.ts`**

In `src/entities/event/api/eventApi.ts`, add inside the `endpoints` builder (after `getEventById`):

```typescript
    getMyEventIds: builder.query<{ eventIds: string[] }, string>({
      query: (guildId) => `my-event-ids?guildId=${guildId}`,
      providesTags: [{ type: 'Event' as const, id: 'MY-IDS' }],
    }),
```

And add to the export at the bottom:
```typescript
export const {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useGetParticipantsQuery,
  useSyncParticipantsMutation,
  useGetEventByIdQuery,
  useGetMyEventIdsQuery,
} = eventApi;
```

- [ ] **Step 4: Commit**

```bash
git add src/entities/event/api/getMyEventIds.ts src/app/api/my-event-ids/route.ts src/entities/event/api/eventApi.ts
git commit -m "feat: add getMyEventIds endpoint and RTK Query hook"
```

---

## Task 3: `useWeekEventsByType` hook

**Files:**
- Create: `src/widgets/upcoming-events/lib/useWeekEventsByType.ts`
- Create: `src/widgets/upcoming-events/lib/useWeekEventsByType.test.ts`

- [ ] **Step 1: Write the failing test**

`src/widgets/upcoming-events/lib/useWeekEventsByType.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWeekEventsByType } from './useWeekEventsByType';
import type { ActivityEvent } from '@/shared/types';

// Week of 2026-06-01 (Mon) → 2026-06-07 (Sun)
const make = (date: string, type: ActivityEvent['type'] = 'raid', id = '1'): ActivityEvent => ({
  id, title: 'Test', date, time: '18:00', type,
});

describe('useWeekEventsByType', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T12:00:00')); // Wednesday of that week
  });
  afterEach(() => vi.useRealTimers());

  it('returns empty object when no events', () => {
    const { result } = renderHook(() => useWeekEventsByType([], []));
    expect(result.current).toEqual({});
  });

  it('excludes events not in myEventIds', () => {
    const event = make('2026-06-04', 'raid', '1');
    const { result } = renderHook(() => useWeekEventsByType([event], []));
    expect(result.current).toEqual({});
  });

  it('excludes events outside current week', () => {
    const event = make('2026-06-15', 'raid', '1');
    const { result } = renderHook(() => useWeekEventsByType([event], ['1']));
    expect(result.current).toEqual({});
  });

  it('groups events by type for current week', () => {
    const raid1 = make('2026-06-02', 'raid', 'r1');
    const raid2 = make('2026-06-04', 'raid', 'r2');
    const meeting = make('2026-06-05', 'meeting', 'm1');
    const { result } = renderHook(() =>
      useWeekEventsByType([raid1, raid2, meeting], ['r1', 'r2', 'm1'])
    );
    expect(result.current.raid).toHaveLength(2);
    expect(result.current.meeting).toHaveLength(1);
    expect(result.current.party).toBeUndefined();
  });

  it('only includes events that are in myEventIds', () => {
    const mine = make('2026-06-03', 'dungeon', 'mine');
    const notMine = make('2026-06-03', 'dungeon', 'other');
    const { result } = renderHook(() =>
      useWeekEventsByType([mine, notMine], ['mine'])
    );
    expect(result.current.dungeon).toHaveLength(1);
    expect(result.current.dungeon?.[0].id).toBe('mine');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test:run -- src/widgets/upcoming-events/lib/useWeekEventsByType.test.ts
```
Expected: `Cannot find module './useWeekEventsByType'`

- [ ] **Step 3: Implement `useWeekEventsByType`**

`src/widgets/upcoming-events/lib/useWeekEventsByType.ts`:
```typescript
import { useMemo } from 'react';
import dayjs from '@/shared/lib/dayjs';
import type { ActivityEvent, ActivityType } from '@/shared/types';

export const useWeekEventsByType = (
  events: ActivityEvent[],
  myEventIds: string[]
): Partial<Record<ActivityType, ActivityEvent[]>> =>
  useMemo(() => {
    const startOfWeek = dayjs().startOf('isoWeek');
    const endOfWeek = dayjs().endOf('isoWeek');
    const myIdSet = new Set(myEventIds);

    return events
      .filter(e => {
        const d = dayjs(e.date);
        return myIdSet.has(e.id) && !d.isBefore(startOfWeek) && !d.isAfter(endOfWeek);
      })
      .reduce<Partial<Record<ActivityType, ActivityEvent[]>>>((acc, e) => {
        if (!acc[e.type]) acc[e.type] = [];
        acc[e.type]!.push(e);
        return acc;
      }, {});
  }, [events, myEventIds]);
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm run test:run -- src/widgets/upcoming-events/lib/useWeekEventsByType.test.ts
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/upcoming-events/lib/useWeekEventsByType.ts src/widgets/upcoming-events/lib/useWeekEventsByType.test.ts
git commit -m "feat: add useWeekEventsByType hook"
```

---

## Task 4: Tooltip content components

**Files:**
- Create: `src/widgets/upcoming-events/ui/UpcomingEventsStrip.module.css` ← created first so later tasks can import it
- Create: `src/widgets/upcoming-events/ui/ParticipantsTooltip.tsx`
- Create: `src/widgets/upcoming-events/ui/EventTypeTooltip.tsx`

These are pure presentational components — no RTK Query, no Redux.

- [ ] **Step 1: Create the CSS module** (must exist before any component imports it)

Create `src/widgets/upcoming-events/ui/UpcomingEventsStrip.module.css` with the full contents from **Task 7 Step 1** below. Create that file now — Task 7 will skip recreating it.

- [ ] **Step 3: Create `ParticipantsTooltip`**

`src/widgets/upcoming-events/ui/ParticipantsTooltip.tsx`:
```tsx
import React from 'react';
import type { EventParticipant } from '@/shared/types';
import styles from './UpcomingEventsStrip.module.css';

interface Props {
  participants: EventParticipant[];
}

export const ParticipantsTooltip: React.FC<Props> = ({ participants }) => {
  const confirmed = participants.filter(p => p.status === 'confirmed');
  if (confirmed.length === 0) {
    return <span className={styles.tooltipEmpty}>Нет подтверждений</span>;
  }
  return (
    <div className={styles.participantsList}>
      <div className={styles.tooltipLabel}>Подтвердили участие</div>
      {confirmed.map(p => (
        <div key={p.id} className={styles.participantRow}>
          <div className={styles.avatar}>
            {p.profile.avatarUrl
              ? <img src={p.profile.avatarUrl} alt="" className={styles.avatarImg} />
              : <span className={styles.avatarInitial}>{p.profile.fullName?.[0] ?? '?'}</span>
            }
          </div>
          <span className={styles.participantName}>{p.profile.fullName ?? 'Unknown'}</span>
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Create `EventTypeTooltip`**

`src/widgets/upcoming-events/ui/EventTypeTooltip.tsx`:
```tsx
import React from 'react';
import dayjs from '@/shared/lib/dayjs';
import type { ActivityEvent } from '@/shared/types';
import styles from './UpcomingEventsStrip.module.css';

interface Props {
  events: ActivityEvent[];
  typeName: string;
}

const relativeDay = (date: string): string => {
  const diff = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  return dayjs(date).format('D MMM');
};

export const EventTypeTooltip: React.FC<Props> = ({ events, typeName }) => (
  <div className={styles.typeTooltip}>
    <div className={styles.tooltipLabel}>{typeName}</div>
    {events.map(e => (
      <div key={e.id} className={styles.typeTooltipRow}>
        <span className={styles.typeTooltipTitle}>{e.title}</span>
        <span className={styles.typeTooltipTime}>{relativeDay(e.date)} · {e.time}</span>
      </div>
    ))}
  </div>
);
```

- [ ] **Step 5: Commit**

```bash
git add src/widgets/upcoming-events/ui/UpcomingEventsStrip.module.css src/widgets/upcoming-events/ui/ParticipantsTooltip.tsx src/widgets/upcoming-events/ui/EventTypeTooltip.tsx
git commit -m "feat: add tooltip components and CSS module"
```

---

## Task 5: `NextEventBlock` component

**Files:**
- Create: `src/widgets/upcoming-events/ui/NextEventBlock.tsx`

- [ ] **Step 1: Create `NextEventBlock`**

`src/widgets/upcoming-events/ui/NextEventBlock.tsx`:
```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import dayjs from '@/shared/lib/dayjs';
import { useGetParticipantsQuery } from '@/entities/event';
import { Tooltip } from '@/shared/ui/Tooltip';
import type { ActivityEvent } from '@/shared/types';
import { ParticipantsTooltip } from './ParticipantsTooltip';
import styles from './UpcomingEventsStrip.module.css';

const relativeDay = (date: string): string => {
  const diff = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  return dayjs(date).format('D MMM');
};

const ParticipantsBadge: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { data } = useGetParticipantsQuery(eventId);
  const confirmed = data?.participants.filter(p => p.status === 'confirmed') ?? [];
  return (
    <Tooltip
      content={<ParticipantsTooltip participants={data?.participants ?? []} />}
      side="top"
      delayDuration={200}
    >
      <span className={styles.participantsBadge}>
        <Users size={12} />
        {confirmed.length} участников
      </span>
    </Tooltip>
  );
};

interface Props {
  event: ActivityEvent | null;
}

export const NextEventBlock: React.FC<Props> = ({ event }) => (
  <div className={styles.nextEventBlock}>
    <div className={styles.blockLabel}>Следующее событие</div>
    {event ? (
      <div className={styles.eventRow}>
        <Link href={`/events/${event.id}`} className={styles.eventLink}>
          {event.title}
        </Link>
        <span className={styles.eventMeta}>
          <Clock size={12} />
          {relativeDay(event.date)} · {event.time}
        </span>
        <span className={styles.dot}>·</span>
        <ParticipantsBadge eventId={event.id} />
      </div>
    ) : (
      <span className={styles.emptyText}>Событий не запланировано</span>
    )}
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/upcoming-events/ui/NextEventBlock.tsx
git commit -m "feat: add NextEventBlock component"
```

---

## Task 6: `WeekByTypeBlock` component

**Files:**
- Create: `src/widgets/upcoming-events/ui/WeekByTypeBlock.tsx`

- [ ] **Step 1: Create `WeekByTypeBlock`**

`src/widgets/upcoming-events/ui/WeekByTypeBlock.tsx`:
```tsx
'use client';

import React from 'react';
import { Sword, Layers, Music, Users, Gamepad2, Activity, CalendarDays } from 'lucide-react';
import { Tooltip } from '@/shared/ui/Tooltip';
import type { ActivityEvent, ActivityType } from '@/shared/types';
import { EventTypeTooltip } from './EventTypeTooltip';
import styles from './UpcomingEventsStrip.module.css';

const TYPE_CONFIG: Record<ActivityType, { label: string; icon: React.ReactNode }> = {
  raid:    { label: 'Рейды',      icon: <Sword size={13} /> },
  dungeon: { label: 'Подземелья', icon: <Layers size={13} /> },
  party:   { label: 'Вечеринки',  icon: <Music size={13} /> },
  meeting: { label: 'Встречи',    icon: <Users size={13} /> },
  game:    { label: 'Игры',       icon: <Gamepad2 size={13} /> },
  sport:   { label: 'Спорт',      icon: <Activity size={13} /> },
  other:   { label: 'Прочее',     icon: <CalendarDays size={13} /> },
};

interface Props {
  eventsByType: Partial<Record<ActivityType, ActivityEvent[]>>;
}

export const WeekByTypeBlock: React.FC<Props> = ({ eventsByType }) => {
  const entries = Object.entries(eventsByType) as [ActivityType, ActivityEvent[]][];
  if (entries.length === 0) return null;

  return (
    <div className={styles.weekBlock}>
      <div className={styles.blockLabel}>На этой неделе</div>
      <div className={styles.typeChips}>
        {entries.map(([type, events]) => (
          <Tooltip
            key={type}
            content={<EventTypeTooltip events={events} typeName={TYPE_CONFIG[type].label} />}
            side="top"
            delayDuration={200}
          >
            <div className={`${styles.typeChip} ${styles[`chip_${type}`]}`}>
              {TYPE_CONFIG[type].icon}
              <span>{events.length}</span>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/upcoming-events/ui/WeekByTypeBlock.tsx
git commit -m "feat: add WeekByTypeBlock component"
```

---

## Task 7: `UpcomingEventsStrip` — composition and `index.ts`

**Files:**
- Create: `src/widgets/upcoming-events/ui/UpcomingEventsStrip.tsx`
- Create: `src/widgets/upcoming-events/index.ts`

> CSS module was already created in Task 4 Step 1. Skip recreating it.

- [ ] **Step 1: (reference only) CSS module contents**

The CSS module at `src/widgets/upcoming-events/ui/UpcomingEventsStrip.module.css` should already exist from Task 4. Its full contents are:
```css
.strip {
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--shadow-glass);
  padding: 18px 28px;
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
}

.blockLabel {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 8px;
  opacity: 0.7;
}

/* NextEventBlock */
.nextEventBlock {
  flex: 1;
  min-width: 0;
}

.eventRow {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.eventLink {
  font-size: 15px;
  color: var(--accent-primary);
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid rgba(56, 189, 248, 0.3);
  transition: border-color 0.2s;
}

.eventLink:hover {
  border-color: var(--accent-primary);
}

.eventMeta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-muted);
}

.dot {
  color: var(--glass-border);
}

.participantsBadge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-muted);
  border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
  cursor: default;
  padding-bottom: 1px;
}

.emptyText {
  font-size: 13px;
  color: var(--text-muted);
  opacity: 0.6;
}

/* Divider */
.divider {
  width: 1px;
  height: 44px;
  background: var(--glass-border);
  flex-shrink: 0;
}

/* WeekByTypeBlock */
.weekBlock {
  flex-shrink: 0;
}

.typeChips {
  display: flex;
  align-items: center;
  gap: 8px;
}

.typeChip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
  border: 1px solid transparent;
  transition: border-color 0.15s;
}

.typeChip:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.chip_raid    { background: rgba(176, 96, 96, 0.15);   color: var(--event-raid-border); }
.chip_dungeon { background: rgba(168, 85, 247, 0.15);  color: var(--event-dungeon-border); }
.chip_party   { background: rgba(244, 114, 182, 0.15); color: var(--event-party-border); }
.chip_meeting { background: rgba(90, 144, 184, 0.15);  color: var(--event-meeting-border); }
.chip_game    { background: rgba(74, 144, 104, 0.15);  color: var(--event-game-border); }
.chip_sport   { background: rgba(52, 211, 153, 0.15);  color: var(--event-sport-border); }
.chip_other   { background: rgba(74, 133, 168, 0.15);  color: var(--event-other-border); }

/* ParticipantsTooltip */
.participantsList {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 170px;
}

.tooltipLabel {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
  opacity: 0.6;
}

.participantRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatarImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarInitial {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-primary);
}

.participantName {
  font-size: 12px;
  color: var(--text-secondary);
}

.tooltipEmpty {
  font-size: 12px;
  color: var(--text-muted);
  opacity: 0.6;
}

/* EventTypeTooltip */
.typeTooltip {
  min-width: 190px;
}

.typeTooltipRow {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: 7px;
}

.typeTooltipRow:last-child {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}

.typeTooltipTitle {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.typeTooltipTime {
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.7;
}
```

- [ ] **Step 2: Create `UpcomingEventsStrip`**


`src/widgets/upcoming-events/ui/UpcomingEventsStrip.tsx`:
```tsx
'use client';

import React, { useMemo } from 'react';
import { useGetEventsQuery, useGetMyEventIdsQuery } from '@/entities/event';
import { useAppSelector } from '@/shared/lib/hooks';
import type { Guild } from '@/entities/guild';
import { useNextEvent } from '../lib/useNextEvent';
import { useWeekEventsByType } from '../lib/useWeekEventsByType';
import { NextEventBlock } from './NextEventBlock';
import { WeekByTypeBlock } from './WeekByTypeBlock';
import styles from './UpcomingEventsStrip.module.css';

interface Props {
  guilds: Guild[];
  userId?: string;
}

export const UpcomingEventsStrip: React.FC<Props> = ({ guilds, userId }) => {
  const currentGuildId = useAppSelector(state => state.guild.currentGuildId);
  const activeGuildId = useMemo(
    () => currentGuildId || guilds[0]?.id,
    [currentGuildId, guilds]
  );

  const { data: events = [] } = useGetEventsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });
  const { data: myIdsData } = useGetMyEventIdsQuery(activeGuildId ?? '', {
    skip: !activeGuildId || !userId,
  });

  const nextEvent = useNextEvent(events);
  const eventsByType = useWeekEventsByType(events, myIdsData?.eventIds ?? []);
  const hasWeekEvents = Object.keys(eventsByType).length > 0;

  if (!activeGuildId) {
    return (
      <div className={styles.strip}>
        <span className={styles.emptyText}>Выберите гильдию</span>
      </div>
    );
  }

  return (
    <div className={styles.strip}>
      <NextEventBlock event={nextEvent} />
      {hasWeekEvents && (
        <>
          <div className={styles.divider} />
          <WeekByTypeBlock eventsByType={eventsByType} />
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Create `index.ts`**

`src/widgets/upcoming-events/index.ts`:
```typescript
export { UpcomingEventsStrip } from './ui/UpcomingEventsStrip';
```

- [ ] **Step 4: Commit**

```bash
git add src/widgets/upcoming-events/ui/UpcomingEventsStrip.tsx src/widgets/upcoming-events/index.ts
git commit -m "feat: add UpcomingEventsStrip widget"
```

---

## Task 8: Integrate into `page.tsx`

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/HomePage.module.css`

- [ ] **Step 1: Replace `<h1>` with `<UpcomingEventsStrip>` in `page.tsx`**

In `src/app/page.tsx`, replace:
```tsx
import styles from './HomePage.module.css';
```
with:
```tsx
import { UpcomingEventsStrip } from '@/widgets/upcoming-events';
import styles from './HomePage.module.css';
```

Replace:
```tsx
      <h1 className={styles.title}>{t('title')}</h1>
```
with:
```tsx
      <UpcomingEventsStrip guilds={guilds} userId={user?.id} />
```

Remove the `getTranslations('Common')` call and `t` variable if `t('title')` was the only usage. The import `getTranslations` can also be removed if unused after this change.

- [ ] **Step 2: Remove `.title` from `HomePage.module.css`**

In `src/app/HomePage.module.css`, remove:
```css
.title {
  margin-bottom: 20px;
}
```

- [ ] **Step 3: Run linter**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/HomePage.module.css
git commit -m "feat: replace Guild Master heading with UpcomingEventsStrip"
```
