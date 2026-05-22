# RTK Query Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `createAsyncThunk`-based data-fetching with RTK Query using a single `createApi` instance extended via `injectEndpoints` per FSD slice, with Next.js route handlers as the transport layer.

**Architecture:** Single `baseApi` in `shared/api/baseApi.ts`. API utility functions lose `'use server'` and become plain server utilities called by route handlers in `app/api/`. Each FSD slice injects its own endpoints via `baseApi.injectEndpoints()`. Old slices (`eventsSlice`, `eventDetailSlice`) are deleted after all consumers are migrated.

**FSD rule enforced:** `features/create-event` must not import from `features/event-detail`. Therefore `getParticipants` and `syncParticipants` endpoints live in `entities/event/api/eventApi.ts`. Only `updateParticipantStatus` stays in `features/event-detail/api/detailApi.ts` (it's a user action scoped to the detail view).

**Tech Stack:** `@reduxjs/toolkit` 2.11.2 (includes RTK Query), Next.js route handlers, Vitest, Supabase server client.

**Note on scope vs. spec:** `/api/guilds` GET all guilds and `/api/user` are omitted — `getMyGuilds` and `getUser` are server-only calls (page components). No client consumer exists.

---

## File Map

**Create:**
- `src/shared/api/baseApi.ts` — single `createApi` instance, tag registry
- `src/app/api/events/route.ts` — `GET ?guildId=`, `POST`
- `src/app/api/events/[id]/route.ts` — `PATCH`, `DELETE`
- `src/app/api/events/route.test.ts` — route handler unit tests
- `src/app/api/participants/[eventId]/route.ts` — `GET`, `PATCH` (status)
- `src/app/api/participants/[eventId]/sync/route.ts` — `POST` (sync)
- `src/entities/event/api/eventApi.ts` — `getEvents`, `createEvent`, `updateEvent`, `deleteEvent`, `getParticipants`, `syncParticipants`
- `src/features/event-detail/api/detailApi.ts` — `updateParticipantStatus` only
- `src/app/api/guilds/[id]/members/route.ts` — `GET`
- `src/entities/guild/api/guildApi.ts` — `getGuildMembers`

**Modify:**
- `src/app/providers/StoreProvider/config/store.ts` — add baseApi (Task 1), remove old reducers (Task 11)
- `src/entities/event/api/{getEvents,createEvent,updateEvent,deleteEvent,getEventParticipantUserIds,syncParticipants}.ts` — strip `'use server'`
- `src/features/event-detail/api/{getEventParticipants,updateParticipantStatus}.ts` — strip `'use server'`
- `src/entities/guild/api/getGuildMembers.ts` — strip `'use server'`
- `src/entities/event/index.ts` — swap thunk exports for RTK Query hook exports
- `src/features/event-detail/index.ts` — swap slice exports for hook exports
- `src/entities/guild/index.ts` — add `useGetGuildMembersQuery`
- `src/widgets/calendar/ui/CalendarGrid.tsx` — use `useGetEventsQuery`
- `src/widgets/day-events/ui/DayEventsList.tsx` — use RTK Query hooks
- `src/features/event-detail/ui/EventDetailView.tsx` — use RTK Query hooks
- `src/features/create-event/ui/EventWizard.tsx` — use RTK Query hooks
- `src/features/create-event/ui/EventWizard.test.tsx` — update mocks
- `src/shared/types/index.ts` — remove `EventsState`

**Delete:**
- `src/entities/event/model/slice.ts`
- `src/entities/event/model/slice.test.ts`
- `src/features/event-detail/model/slice.ts`
- `src/features/event-detail/model/slice.test.ts`

---

## Task 1: Create baseApi and wire into store

**Files:**
- Create: `src/shared/api/baseApi.ts`
- Modify: `src/app/providers/StoreProvider/config/store.ts`

- [ ] **Step 1: Create baseApi**

```ts
// src/shared/api/baseApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Event', 'Participant', 'GuildMember'],
  endpoints: () => ({}),
});
```

- [ ] **Step 2: Add baseApi to store (keep old reducers — they're still used by unmigrated components)**

```ts
// src/app/providers/StoreProvider/config/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { calendarReducer } from '@/entities/calendar';
import { eventsReducer } from '@/entities/event';
import { guildReducer } from '@/entities/guild/model/slice';
import eventDetailReducer from '@/features/event-detail/model/slice';
import { baseApi } from '@/shared/api/baseApi';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ui: calendarReducer,
    events: eventsReducer,
    guild: guildReducer,
    eventDetail: eventDetailReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/baseApi.ts src/app/providers/StoreProvider/config/store.ts
git commit -m "feat(rtk-query): add baseApi and wire into store"
```

---

## Task 2: Events route handlers

**Files:**
- Modify: `src/entities/event/api/{getEvents,createEvent,updateEvent,deleteEvent}.ts` — strip `'use server'`
- Create: `src/app/api/events/route.ts`
- Create: `src/app/api/events/[id]/route.ts`
- Create: `src/app/api/events/route.test.ts`

- [ ] **Step 1: Write failing tests for events route handlers**

```ts
// src/app/api/events/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { fetchEvents } from '@/entities/event/api/getEvents';
import { createEvent } from '@/entities/event/api/createEvent';

vi.mock('@/entities/event/api/getEvents');
vi.mock('@/entities/event/api/createEvent');

const RAW_EVENT = {
  id: 'e1',
  title: 'Raid',
  description: null,
  type: 'raid',
  event_date: '2026-05-22T10:00:00',
  guild_id: 'g1',
  created_by: 'u1',
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/events', () => {
  it('returns 400 when guildId is missing', async () => {
    const req = { nextUrl: { searchParams: { get: () => null } } } as never;
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns event list for valid guildId', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([RAW_EVENT] as never);
    const req = { nextUrl: { searchParams: { get: () => 'g1' } } } as never;
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe('e1');
  });

  it('returns 500 on fetchEvents error', async () => {
    vi.mocked(fetchEvents).mockRejectedValue(new Error('db error'));
    const req = { nextUrl: { searchParams: { get: () => 'g1' } } } as never;
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe('POST /api/events', () => {
  it('returns 201 with created event', async () => {
    vi.mocked(createEvent).mockResolvedValue(RAW_EVENT as never);
    const req = { json: () => Promise.resolve({ title: 'Raid', guild_id: 'g1' }) } as never;
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe('e1');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run -- src/app/api/events/route.test.ts
```

Expected: `Cannot find module './route'`

- [ ] **Step 3: Strip `'use server'` from event api utilities**

Remove the `'use server';` first line from each of:
- `src/entities/event/api/getEvents.ts`
- `src/entities/event/api/createEvent.ts`
- `src/entities/event/api/updateEvent.ts`
- `src/entities/event/api/deleteEvent.ts`

- [ ] **Step 4: Create GET+POST route handler**

```ts
// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchEvents } from '@/entities/event/api/getEvents';
import { createEvent } from '@/entities/event/api/createEvent';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });
  try {
    const data = await fetchEvents(guildId);
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await createEvent(body);
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create PATCH+DELETE route handler**

```ts
// src/app/api/events/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateEvent } from '@/entities/event/api/updateEvent';
import { deleteEvent } from '@/entities/event/api/deleteEvent';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await updateEvent(id, body);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteEvent(id);
    return NextResponse.json({ deleted: id });
  } catch {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
npm run test:run -- src/app/api/events/route.test.ts
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add src/app/api/events/ src/entities/event/api/getEvents.ts src/entities/event/api/createEvent.ts src/entities/event/api/updateEvent.ts src/entities/event/api/deleteEvent.ts
git commit -m "feat(rtk-query): add events route handlers, strip 'use server'"
```

---

## Task 3: eventApi.ts — inject all event + participant-query endpoints

**Files:**
- Create: `src/entities/event/api/eventApi.ts`

`getParticipants` and `syncParticipants` live here (not in `detailApi`) so that `features/create-event` can import from `entities/event` without a cross-feature dependency.

- [ ] **Step 1: Create eventApi**

```ts
// src/entities/event/api/eventApi.ts
import { baseApi } from '@/shared/api/baseApi';
import { ActivityEvent, ActivityType, EventParticipant, ParticipantStatus } from '@/shared/types';
import dayjs from '@/shared/lib/dayjs';

type RawEvent = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  event_date: string;
};

interface ParticipantsResponse {
  participants: EventParticipant[];
  currentUserId: string;
}

function transformEvent(raw: RawEvent): ActivityEvent {
  const d = dayjs.utc(raw.event_date);
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description || undefined,
    type: raw.type as ActivityType,
    date: d.format('YYYY-MM-DD'),
    time: d.format('HH:mm'),
  };
}

export const eventApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEvents: builder.query<ActivityEvent[], string>({
      query: (guildId) => `events?guildId=${guildId}`,
      transformResponse: (raw: RawEvent[]) => raw.map(transformEvent),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Event' as const, id })),
              { type: 'Event' as const, id: 'LIST' },
            ]
          : [{ type: 'Event' as const, id: 'LIST' }],
    }),
    createEvent: builder.mutation<
      ActivityEvent,
      Omit<ActivityEvent, 'id'> & { guild_id: string }
    >({
      query: (body) => ({ url: 'events', method: 'POST', body }),
      transformResponse: (raw: RawEvent) => transformEvent(raw),
      invalidatesTags: [{ type: 'Event' as const, id: 'LIST' }],
    }),
    updateEvent: builder.mutation<
      ActivityEvent,
      { id: string; event: Partial<Omit<ActivityEvent, 'id'>> }
    >({
      query: ({ id, event }) => ({ url: `events/${id}`, method: 'PATCH', body: event }),
      transformResponse: (raw: RawEvent) => transformEvent(raw),
      invalidatesTags: (_, __, { id }) => [
        { type: 'Event' as const, id },
        { type: 'Event' as const, id: 'LIST' },
      ],
    }),
    deleteEvent: builder.mutation<{ deleted: string }, string>({
      query: (id) => ({ url: `events/${id}`, method: 'DELETE' }),
      invalidatesTags: (_, __, id) => [
        { type: 'Event' as const, id },
        { type: 'Event' as const, id: 'LIST' },
      ],
    }),
    getParticipants: builder.query<ParticipantsResponse, string>({
      query: (eventId) => `participants/${eventId}`,
      providesTags: (result, _, eventId) =>
        result
          ? [
              ...result.participants.map(({ id }) => ({ type: 'Participant' as const, id })),
              { type: 'Participant' as const, id: `LIST-${eventId}` },
            ]
          : [{ type: 'Participant' as const, id: `LIST-${eventId}` }],
    }),
    syncParticipants: builder.mutation<
      { synced: boolean },
      { eventId: string; userIds: string[] }
    >({
      query: ({ eventId, userIds }) => ({
        url: `participants/${eventId}/sync`,
        method: 'POST',
        body: { userIds },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Participant' as const, id: `LIST-${eventId}` },
      ],
    }),
  }),
});

export const {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useGetParticipantsQuery,
  useSyncParticipantsMutation,
} = eventApi;
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/entities/event/api/eventApi.ts
git commit -m "feat(rtk-query): add eventApi with event + participant query endpoints"
```

---

## Task 4: Migrate CalendarGrid

**Files:**
- Modify: `src/entities/event/index.ts`
- Modify: `src/widgets/calendar/ui/CalendarGrid.tsx`

- [ ] **Step 1: Add RTK Query hook exports to entities/event/index.ts (keep old exports)**

```ts
// src/entities/event/index.ts
export {
  default as eventsReducer,
  addEvent,
  fetchEventsThunk,
  createEventThunk,
  updateEventThunk,
  deleteEventThunk,
} from './model/slice';
export { EventCard } from './ui/EventCard';
export { getEventParticipantUserIds } from './api/getEventParticipantUserIds';
export { syncParticipants } from './api/syncParticipants';
export {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useGetParticipantsQuery,
  useSyncParticipantsMutation,
} from './api/eventApi';
```

- [ ] **Step 2: Update CalendarGrid**

In `src/widgets/calendar/ui/CalendarGrid.tsx`:

Remove import:
```ts
import { fetchEventsThunk } from '@/entities/event';
```

Add import:
```ts
import { useGetEventsQuery } from '@/entities/event';
```

Remove:
```ts
const events = useAppSelector((state) => state.events.items);
```

Add:
```ts
const { data: events = [] } = useGetEventsQuery(activeGuildId ?? '', {
  skip: !activeGuildId,
});
```

Remove the entire `useEffect` that dispatches `fetchEventsThunk`:
```ts
useEffect(() => {
  if (activeGuildId) {
    dispatch(fetchEventsThunk(activeGuildId));
  }
}, [dispatch, activeGuildId]);
```

- [ ] **Step 3: Run all tests**

```bash
npm run test:run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/entities/event/index.ts src/widgets/calendar/ui/CalendarGrid.tsx
git commit -m "feat(rtk-query): migrate CalendarGrid to useGetEventsQuery"
```

---

## Task 5: Migrate DayEventsList

**Files:**
- Modify: `src/widgets/day-events/ui/DayEventsList.tsx`

- [ ] **Step 1: Update DayEventsList**

In `src/widgets/day-events/ui/DayEventsList.tsx`:

Replace:
```ts
import { deleteEventThunk, EventCard, fetchEventsThunk } from '@/entities/event';
```

With:
```ts
import { EventCard, useDeleteEventMutation, useGetEventsQuery } from '@/entities/event';
```

Replace the three state reads:
```ts
const events = useAppSelector((state) => state.events.items);
const loading = useAppSelector((state) => state.events.loading);
const isInitialized = useAppSelector((state) => state.events.isInitialized);
```

With:
```ts
const { data: events = [], isLoading } = useGetEventsQuery(activeGuildId ?? '', {
  skip: !activeGuildId,
});
const [deleteEvent] = useDeleteEventMutation();
```

Remove the entire fetch `useEffect`:
```ts
useEffect(() => {
  if (activeGuildId && (!isInitialized || events.length === 0) && !loading) {
    dispatch(fetchEventsThunk(activeGuildId));
  }
}, [dispatch, activeGuildId, isInitialized, loading, events.length]);
```

Replace `handleConfirmDelete`:
```ts
const handleConfirmDelete = async () => {
  if (eventToDelete) {
    try {
      await deleteEvent(eventToDelete).unwrap();
      toast.success(t('successDeleted'));
    } catch {
      toast.error(t('error'));
    }
    setEventToDelete(null);
  }
};
```

Replace any remaining `loading` references with `isLoading`.

- [ ] **Step 2: Run all tests**

```bash
npm run test:run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/widgets/day-events/ui/DayEventsList.tsx
git commit -m "feat(rtk-query): migrate DayEventsList to RTK Query"
```

---

## Task 6: Participants route handlers

**Files:**
- Modify: `src/features/event-detail/api/{getEventParticipants,updateParticipantStatus}.ts` — strip `'use server'`
- Modify: `src/entities/event/api/syncParticipants.ts` — strip `'use server'`
- Modify: `src/entities/event/api/getEventParticipantUserIds.ts` — strip `'use server'`
- Create: `src/app/api/participants/[eventId]/route.ts`
- Create: `src/app/api/participants/[eventId]/sync/route.ts`

- [ ] **Step 1: Strip `'use server'` from participant utilities**

Remove the `'use server';` first line from:
- `src/features/event-detail/api/getEventParticipants.ts`
- `src/features/event-detail/api/updateParticipantStatus.ts`
- `src/entities/event/api/syncParticipants.ts`
- `src/entities/event/api/getEventParticipantUserIds.ts`

- [ ] **Step 2: Create participants GET+PATCH route handler**

```ts
// src/app/api/participants/[eventId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getEventParticipants } from '@/features/event-detail/api/getEventParticipants';
import { updateParticipantStatus } from '@/features/event-detail/api/updateParticipantStatus';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const data = await getEventParticipants(eventId);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch participants';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { status } = await request.json();
    await updateParticipantStatus(eventId, status);
    return NextResponse.json({ updated: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create sync route handler**

```ts
// src/app/api/participants/[eventId]/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncParticipants } from '@/entities/event/api/syncParticipants';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { userIds } = await request.json();
    await syncParticipants(eventId, userIds);
    return NextResponse.json({ synced: true });
  } catch {
    return NextResponse.json({ error: 'Failed to sync participants' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/app/api/participants/ src/features/event-detail/api/getEventParticipants.ts src/features/event-detail/api/updateParticipantStatus.ts src/entities/event/api/syncParticipants.ts src/entities/event/api/getEventParticipantUserIds.ts
git commit -m "feat(rtk-query): add participants route handlers, strip 'use server'"
```

---

## Task 7: detailApi.ts — updateParticipantStatus endpoint

**Files:**
- Create: `src/features/event-detail/api/detailApi.ts`

`updateParticipantStatus` is a user-triggered action scoped to the detail view, so it lives here. `getParticipants` and `syncParticipants` are in `eventApi.ts` (Task 3) to avoid cross-feature imports.

- [ ] **Step 1: Create detailApi**

```ts
// src/features/event-detail/api/detailApi.ts
import { baseApi } from '@/shared/api/baseApi';
import { ParticipantStatus } from '@/shared/types';

export const detailApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateParticipantStatus: builder.mutation<
      { updated: boolean },
      { eventId: string; status: ParticipantStatus }
    >({
      query: ({ eventId, status }) => ({
        url: `participants/${eventId}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Participant' as const, id: `LIST-${eventId}` },
      ],
    }),
  }),
});

export const { useUpdateParticipantStatusMutation } = detailApi;
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/event-detail/api/detailApi.ts
git commit -m "feat(rtk-query): add detailApi with updateParticipantStatus endpoint"
```

---

## Task 8: Migrate EventDetailView

**Files:**
- Modify: `src/features/event-detail/index.ts`
- Modify: `src/features/event-detail/ui/EventDetailView.tsx`

- [ ] **Step 1: Add hook exports to features/event-detail/index.ts (keep old slice exports)**

```ts
// src/features/event-detail/index.ts
export { EventDetailView } from './ui/EventDetailView';
export {
  default as eventDetailReducer,
  clearParticipants,
  fetchParticipantsThunk,
  updateParticipantStatusThunk,
} from './model/slice';
export { useUpdateParticipantStatusMutation } from './api/detailApi';
```

- [ ] **Step 2: Rewrite EventDetailView**

Replace the contents of `src/features/event-detail/ui/EventDetailView.tsx`:

```tsx
'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventDetail, openEventModal } from '@/entities/calendar';
import { useGetParticipantsQuery } from '@/entities/event';
import { Button } from '@/shared/ui/Button';
import { useUpdateParticipantStatusMutation } from '../api/detailApi';
import { ParticipantItem } from './ParticipantItem';
import styles from './EventDetailView.module.css';

export const EventDetailView: React.FC = () => {
  const dispatch = useAppDispatch();
  const t = useTranslations('EventDetail');
  const commonT = useTranslations('Common');
  const eventT = useTranslations('Event');

  const isOpen = useAppSelector((state) => state.ui.isEventDetailOpen);
  const event = useAppSelector((state) => state.ui.viewingEvent);

  const { data, isLoading } = useGetParticipantsQuery(event?.id ?? '', {
    skip: !isOpen || !event,
  });
  const participants = data?.participants ?? [];
  const currentUserId = data?.currentUserId ?? '';

  const [updateStatus] = useUpdateParticipantStatusMutation();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => dispatch(closeEventDetail());

  const handleEdit = () => {
    if (!event) return;
    dispatch(closeEventDetail());
    dispatch(openEventModal(event));
  };

  const handleConfirm = async () => {
    if (!event) return;
    try {
      await updateStatus({ eventId: event.id, status: 'confirmed' }).unwrap();
    } catch {
      toast.error(eventT('error'));
    }
  };

  const handleDecline = async () => {
    if (!event) return;
    try {
      await updateStatus({ eventId: event.id, status: 'declined' }).unwrap();
    } catch {
      toast.error(eventT('error'));
    }
  };

  const typeLabel = event ? eventT(`types.${event.type}` as Parameters<typeof eventT>[0]) : '';

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className={styles.overlay} aria-describedby={undefined}>
          <div className={styles.header}>
            <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
              <X size={20} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className={styles.title}>
              {event?.title}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <div className={styles.column}>
              <div className={styles.infoGroup}>
                <span className={styles.label}>{t('type')}</span>
                <span className={`${styles.typeBadge} ${event?.type ? styles[`type_${event.type}`] : ''}`}>
                  {typeLabel}
                </span>
              </div>

              <div className={styles.infoGroup}>
                <span className={styles.label}>{t('dateTime')}</span>
                <span className={styles.dateTime}>
                  <span>{event?.date}</span>
                  {' '}
                  <span>{event?.time}</span>
                </span>
              </div>

              {event?.description && (
                <div className={styles.infoGroup}>
                  <span className={styles.label}>{t('description')}</span>
                  <p className={styles.description}>{event.description}</p>
                </div>
              )}
            </div>

            <div className={styles.column}>
              <span className={styles.label}>
                {t('participants')} {!isLoading && `(${participants.length})`}
              </span>

              {isLoading && <div className={styles.skeleton} />}

              {!isLoading && participants.length === 0 && (
                <p className={styles.empty}>{t('noParticipants')}</p>
              )}

              {!isLoading &&
                participants.map((p) => (
                  <ParticipantItem
                    key={p.id}
                    participant={p}
                    isCurrentUser={p.user_id === currentUserId}
                    onConfirm={handleConfirm}
                    onDecline={handleDecline}
                  />
                ))}
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={handleEdit}>
              {t('edit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
```

- [ ] **Step 3: Run all tests**

```bash
npm run test:run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/features/event-detail/index.ts src/features/event-detail/ui/EventDetailView.tsx
git commit -m "feat(rtk-query): migrate EventDetailView to RTK Query"
```

---

## Task 9: Guild members route handler + guildApi.ts

**Files:**
- Modify: `src/entities/guild/api/getGuildMembers.ts` — strip `'use server'`
- Create: `src/app/api/guilds/[id]/members/route.ts`
- Create: `src/entities/guild/api/guildApi.ts`
- Modify: `src/entities/guild/index.ts`

- [ ] **Step 1: Strip `'use server'` from getGuildMembers.ts**

Remove the `'use server';` first line from `src/entities/guild/api/getGuildMembers.ts`.

- [ ] **Step 2: Create guild members route handler**

```ts
// src/app/api/guilds/[id]/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getGuildMembers(id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch guild members' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create guildApi**

```ts
// src/entities/guild/api/guildApi.ts
import { baseApi } from '@/shared/api/baseApi';
import { GuildMember } from '../model/types';

export const guildApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGuildMembers: builder.query<GuildMember[], string>({
      query: (guildId) => `guilds/${guildId}/members`,
      providesTags: (result, _, guildId) =>
        result
          ? [
              ...result.map(({ userId }) => ({ type: 'GuildMember' as const, id: userId })),
              { type: 'GuildMember' as const, id: `LIST-${guildId}` },
            ]
          : [{ type: 'GuildMember' as const, id: `LIST-${guildId}` }],
    }),
  }),
});

export const { useGetGuildMembersQuery } = guildApi;
```

- [ ] **Step 4: Add useGetGuildMembersQuery to guild index**

Append to the end of `src/entities/guild/index.ts`:

```ts
export { useGetGuildMembersQuery } from './api/guildApi';
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/entities/guild/api/getGuildMembers.ts src/app/api/guilds/ src/entities/guild/api/guildApi.ts src/entities/guild/index.ts
git commit -m "feat(rtk-query): add guild members route handler and guildApi"
```

---

## Task 10: Migrate EventWizard

**Files:**
- Modify: `src/features/create-event/ui/EventWizard.tsx`
- Modify: `src/features/create-event/ui/EventWizard.test.tsx`

- [ ] **Step 1: Rewrite EventWizard test**

Replace the entire contents of `src/features/create-event/ui/EventWizard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventWizard } from './EventWizard';
import { calendarReducer } from '@/entities/calendar';
import { guildReducer } from '@/entities/guild/model/slice';
import { baseApi } from '@/shared/api/baseApi';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockUnwrap = vi.fn().mockResolvedValue({ id: 'new-id' });
const mockCreateEvent = vi.fn().mockReturnValue({ unwrap: mockUnwrap });
const mockUpdateEvent = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
const mockSyncParticipants = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

vi.mock('@/entities/event', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/event')>();
  return {
    ...actual,
    useCreateEventMutation: () => [mockCreateEvent, { isLoading: false }],
    useUpdateEventMutation: () => [mockUpdateEvent, { isLoading: false }],
    useGetEventsQuery: () => ({ data: [] }),
    useGetParticipantsQuery: () => ({ data: undefined }),
    useSyncParticipantsMutation: () => [mockSyncParticipants, { isLoading: false }],
  };
});

vi.mock('@/entities/guild', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/guild')>();
  return {
    ...actual,
    useGetGuildMembersQuery: () => ({ data: [] }),
  };
});

function makeStore(uiOverrides = {}) {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      ui: calendarReducer,
      guild: guildReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState: {
      ui: {
        isEventModalOpen: false,
        selectedDate: null,
        viewDate: '2026-05-20T00:00:00.000Z',
        isEventDetailOpen: false,
        viewingEvent: null,
        ...uiOverrides,
      },
      guild: { currentGuildId: null },
    },
  });
}

function renderWizard(uiOverrides = {}) {
  const store = makeStore(uiOverrides);
  return render(
    <Provider store={store}>
      <EventWizard />
    </Provider>
  );
}

describe('EventWizard', () => {
  it('is not visible when isEventModalOpen is false', () => {
    renderWizard({ isEventModalOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the form when isEventModalOpen is true', () => {
    renderWizard({ isEventModalOpen: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test:run -- src/features/create-event/ui/EventWizard.test.tsx
```

Expected: fails because EventWizard still imports old thunks

- [ ] **Step 3: Rewrite EventWizard component**

Replace the entire contents of `src/features/create-event/ui/EventWizard.tsx`:

```tsx
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventModal } from '@/entities/calendar';
import {
  useCreateEventMutation,
  useUpdateEventMutation,
  useGetParticipantsQuery,
  useSyncParticipantsMutation,
} from '@/entities/event';
import { useGetGuildMembersQuery } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import dayjs from '@/shared/lib/dayjs';
import { EventForm } from './EventForm';
import { EventFormData } from '../model/types';
import styles from './EventWizard.module.css';

const COLOR_DOTS = [
  { cls: styles.colorDotPurple, label: 'Purple' },
  { cls: styles.colorDotPink,   label: 'Pink' },
  { cls: styles.colorDotGreen,  label: 'Green' },
  { cls: styles.colorDotOrange, label: 'Orange' },
  { cls: styles.colorDotBlue,   label: 'Blue' },
];

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const FORM_ID = 'event-wizard-form';

export const EventWizard: React.FC<{ guildId?: string; isDayView?: boolean }> = ({
  guildId: propGuildId,
  isDayView,
}) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isEventModalOpen);
  const selectedDate = useAppSelector((state) => state.ui.selectedDate);
  const editingEvent = useAppSelector((state) => state.ui.editingEvent);
  const currentGuildId = useAppSelector((state) => state.guild.currentGuildId);

  const activeGuildId = currentGuildId || propGuildId;

  const t = useTranslations('Event');
  const commonT = useTranslations('Common');

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const { data: guildMembers = [] } = useGetGuildMembersQuery(activeGuildId ?? '', {
    skip: !isOpen || !activeGuildId,
  });

  const { data: participantsData } = useGetParticipantsQuery(editingEvent?.id ?? '', {
    skip: !isOpen || !editingEvent,
  });

  const [createEvent] = useCreateEventMutation();
  const [updateEvent] = useUpdateEventMutation();
  const [syncParticipants] = useSyncParticipantsMutation();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (participantsData) {
      setSelectedParticipants(participantsData.participants.map((p) => p.user_id));
    } else if (!editingEvent) {
      setSelectedParticipants([]);
    }
  }, [participantsData, editingEvent]);

  const handleClose = () => dispatch(closeEventModal());

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (data: EventFormData) => {
    if (!activeGuildId) {
      toast.error(t('error'));
      return;
    }
    try {
      if (editingEvent) {
        await updateEvent({ id: editingEvent.id, event: data }).unwrap();
        await syncParticipants({ eventId: editingEvent.id, userIds: selectedParticipants }).unwrap();
        toast.success(t('successUpdated'));
      } else {
        const newEvent = await createEvent({ ...data, guild_id: activeGuildId }).unwrap();
        await syncParticipants({ eventId: newEvent.id, userIds: selectedParticipants }).unwrap();
        toast.success(t('successCreated'));
      }
      handleClose();
    } catch {
      toast.error(t('error'));
    }
  };

  const initialData = useMemo(() => {
    if (editingEvent) return editingEvent;
    if (selectedDate) return { date: dayjs(selectedDate).format('YYYY-MM-DD') };
    return undefined;
  }, [editingEvent, selectedDate]);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className={styles.overlay} aria-describedby={undefined}>
          <div className={styles.header}>
            <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
              <X size={20} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className={styles.title}>
              {editingEvent ? t('editTitle') : t('createTitle')}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <div className={styles.column}>
              {isOpen && (
                <EventForm
                  key={editingEvent?.id || selectedDate || 'new'}
                  initialData={initialData}
                  onSubmit={handleSubmit}
                  onCancel={handleClose}
                  submitLabel={editingEvent ? commonT('save') : t('submit')}
                  isDayView={isDayView}
                  isEdit={!!editingEvent}
                  hideActions
                  formId={FORM_ID}
                />
              )}
            </div>

            <div className={styles.column}>
              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>{t('wizard.iconLabel')}</span>
                <div className={styles.stubField}>{t('wizard.iconPlaceholder')}</div>
              </div>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>{t('wizard.colorLabel')}</span>
                <div className={styles.colorDots}>
                  {COLOR_DOTS.map(({ cls, label }) => (
                    <div key={label} className={`${styles.colorDot} ${cls}`} />
                  ))}
                </div>
              </div>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>{t('wizard.repeatLabel')}</span>
                <div className={styles.dayToggles}>
                  {DAY_LABELS.map((d) => (
                    <div key={d} className={styles.dayToggle}>{d}</div>
                  ))}
                </div>
              </div>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>{t('wizard.invitedLabel')}</span>
                {guildMembers.length === 0 ? (
                  <p className={styles.noMembers}>{t('wizard.noMembers')}</p>
                ) : (
                  <div className={styles.memberList}>
                    {guildMembers.map((member) => {
                      const initials = (member.profile.fullName || '?')
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);
                      const selected = selectedParticipants.includes(member.userId);
                      return (
                        <div
                          key={member.userId}
                          className={`${styles.memberItem} ${selected ? styles.memberSelected : ''}`}
                          onClick={() => toggleParticipant(member.userId)}
                        >
                          <div className={styles.memberAvatar}>{initials}</div>
                          <span className={styles.memberName}>{member.profile.fullName || member.userId}</span>
                          {selected && <span className={styles.memberCheck}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button type="submit" variant="primary" form={FORM_ID}>
              {editingEvent ? commonT('save') : t('submit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test:run -- src/features/create-event/ui/EventWizard.test.tsx
```

Expected: all tests pass

- [ ] **Step 5: Run all tests**

```bash
npm run test:run
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/features/create-event/ui/EventWizard.tsx src/features/create-event/ui/EventWizard.test.tsx
git commit -m "feat(rtk-query): migrate EventWizard to RTK Query hooks"
```

---

## Task 11: Delete old slices, clean up store and types

**Files:**
- Delete: `src/entities/event/model/slice.ts`
- Delete: `src/entities/event/model/slice.test.ts`
- Delete: `src/features/event-detail/model/slice.ts`
- Delete: `src/features/event-detail/model/slice.test.ts`
- Modify: `src/app/providers/StoreProvider/config/store.ts`
- Modify: `src/entities/event/index.ts`
- Modify: `src/features/event-detail/index.ts`
- Modify: `src/shared/types/index.ts`

- [ ] **Step 1: Remove old slices from store**

```ts
// src/app/providers/StoreProvider/config/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { calendarReducer } from '@/entities/calendar';
import { guildReducer } from '@/entities/guild/model/slice';
import { baseApi } from '@/shared/api/baseApi';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ui: calendarReducer,
    guild: guildReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 2: Update entities/event/index.ts — remove thunk exports**

```ts
// src/entities/event/index.ts
export { EventCard } from './ui/EventCard';
export {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useGetParticipantsQuery,
  useSyncParticipantsMutation,
} from './api/eventApi';
```

- [ ] **Step 3: Update features/event-detail/index.ts — remove slice exports**

```ts
// src/features/event-detail/index.ts
export { EventDetailView } from './ui/EventDetailView';
export { useUpdateParticipantStatusMutation } from './api/detailApi';
```

- [ ] **Step 4: Remove EventsState from shared types**

In `src/shared/types/index.ts`, delete these lines:

```ts
export interface EventsState {
  items: ActivityEvent[];
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}
```

- [ ] **Step 5: Delete old slice files**

```bash
rm src/entities/event/model/slice.ts
rm src/entities/event/model/slice.test.ts
rm src/features/event-detail/model/slice.ts
rm src/features/event-detail/model/slice.test.ts
```

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Run all tests**

```bash
npm run test:run
```

Expected: all tests pass

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(rtk-query): delete old slices, finalize store and type cleanup"
```

---

## Done

After Task 11:
- All data fetching goes through RTK Query endpoints
- Tag invalidation: CRUD events → refetch event list; update/sync participants → refetch participant list
- FSD cross-layer imports respected: no cross-feature dependencies
- `eventsSlice` and `eventDetailSlice` deleted
- `baseApi` is the single RTK Query instance
