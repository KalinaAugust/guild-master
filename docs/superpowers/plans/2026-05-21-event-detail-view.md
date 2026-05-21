# Event Detail View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full-screen event detail overlay that opens on EventCard click, showing event info and participants with confirmation status; invited participants can confirm or decline; creator manages participants via EventWizard.

**Architecture:** New `features/event-detail` FSD slice owns the detail overlay, Redux state (`isEventDetailOpen`, `viewingEvent`), and participant thunks. Participant read/write APIs split between `entities/event` (shared primitives) and `features/event-detail` (display). EventWizard right column "Invited" stub replaced with real guild-member picker.

**Tech Stack:** Next.js 15 App Router, Redux Toolkit, Radix UI Dialog, Supabase (server actions), Vitest + RTL, next-intl, CSS Modules.

---

## File Map

**Create:**
- `src/features/event-detail/api/getEventParticipants.ts`
- `src/features/event-detail/api/updateParticipantStatus.ts`
- `src/features/event-detail/model/slice.ts`
- `src/features/event-detail/ui/EventDetailView.tsx`
- `src/features/event-detail/ui/EventDetailView.module.css`
- `src/features/event-detail/ui/ParticipantItem.tsx`
- `src/features/event-detail/ui/ParticipantItem.module.css`
- `src/features/event-detail/index.ts`
- `src/features/event-detail/model/slice.test.ts`
- `src/features/event-detail/ui/ParticipantItem.test.tsx`
- `src/features/event-detail/ui/EventDetailView.test.tsx`
- `src/entities/guild/api/getGuildMembers.ts`
- `src/entities/event/api/getEventParticipantUserIds.ts`
- `src/entities/event/api/syncParticipants.ts`

**Modify:**
- `src/shared/types/index.ts` — add `ParticipantStatus`, `EventParticipant`; extend `UIState`
- `src/entities/calendar/model/slice.ts` — add `openEventDetail`, `closeEventDetail` actions
- `src/entities/calendar/index.ts` — export new actions
- `src/entities/calendar/model/slice.test.ts` — tests for new actions
- `src/entities/guild/model/types.ts` — add `GuildMember`
- `src/entities/guild/index.ts` — export `getGuildMembers`
- `src/entities/event/index.ts` — export `getEventParticipantUserIds`, `syncParticipants`
- `src/entities/event/ui/EventCard.tsx` — add `onClick` prop + `e.stopPropagation()` on edit/delete
- `src/app/providers/StoreProvider/config/store.ts` — add `eventDetailReducer`
- `src/widgets/day-events/ui/DayEventsList.tsx` — dispatch `openEventDetail` on card click
- `src/app/day/[date]/page.tsx` — render `<EventDetailView />`
- `src/features/create-event/ui/EventWizard.tsx` — replace Invited stub with picker + call `syncParticipants`
- `src/features/create-event/ui/EventWizard.module.css` — picker styles
- `messages/en.json` — add `EventDetail` namespace
- `messages/ru.json` — add `EventDetail` namespace

---

## Task 1: Database migration — event_participants table

**Files:**
- (no local files — apply via Supabase MCP)

- [ ] **Step 1: Apply migration**

Run the following SQL via Supabase MCP (`mcp__supabase__apply_migration`, project_id `uzmyvxpjsfobqkcepygh`):

```sql
create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_participants enable row level security;

create policy "guild_members_view_participants"
  on public.event_participants for select
  using (
    exists (
      select 1 from public.events e
      join public.guild_members gm on gm.guild_id = e.guild_id
      where e.id = event_participants.event_id
        and gm.user_id = auth.uid()
    )
  );

create policy "participants_update_own_status"
  on public.event_participants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "event_creator_insert_participants"
  on public.event_participants for insert
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_participants.event_id
        and e.created_by = auth.uid()
    )
  );

create policy "event_creator_delete_participants"
  on public.event_participants for delete
  using (
    exists (
      select 1 from public.events e
      where e.id = event_participants.event_id
        and e.created_by = auth.uid()
    )
  );
```

- [ ] **Step 2: Verify table exists**

Use `mcp__supabase__list_tables` to confirm `event_participants` appears with 5 columns.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat(db): add event_participants table with RLS policies"
```

---

## Task 2: Types

**Files:**
- Modify: `src/shared/types/index.ts`
- Modify: `src/entities/guild/model/types.ts`

- [ ] **Step 1: Add ParticipantStatus, EventParticipant, UIState fields to shared types**

In `src/shared/types/index.ts`, add after the existing exports:

```ts
export type ParticipantStatus = 'pending' | 'confirmed' | 'declined';

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: ParticipantStatus;
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  };
}
```

Also extend `UIState`:

```ts
export interface UIState {
  isEventModalOpen: boolean;
  selectedDate: string | null;
  viewDate: string;
  editingEvent?: ActivityEvent;
  isEventDetailOpen: boolean;
  viewingEvent: ActivityEvent | null;
}
```

- [ ] **Step 2: Add GuildMember type**

In `src/entities/guild/model/types.ts`:

```ts
export interface Guild {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
}

export interface GuildMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new types.

- [ ] **Step 4: Commit**

```bash
git add src/shared/types/index.ts src/entities/guild/model/types.ts
git commit -m "feat(types): add EventParticipant, GuildMember, UIState detail fields"
```

---

## Task 3: UIState — openEventDetail / closeEventDetail

**Files:**
- Modify: `src/entities/calendar/model/slice.ts`
- Modify: `src/entities/calendar/index.ts`
- Modify: `src/entities/calendar/model/slice.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/entities/calendar/model/slice.test.ts`:

```ts
import { openEventDetail, closeEventDetail } from './slice';

// inside describe('uiSlice'):

it('should handle openEventDetail', () => {
  const event: ActivityEvent = {
    id: '1', title: 'Raid', date: '2026-05-28', time: '20:00', type: 'raid',
  };
  const actual = reducer(
    { ...initialState, isEventDetailOpen: false, viewingEvent: null },
    openEventDetail(event)
  );
  expect(actual.isEventDetailOpen).toBe(true);
  expect(actual.viewingEvent).toEqual(event);
});

it('should handle closeEventDetail', () => {
  const state = {
    ...initialState,
    isEventDetailOpen: true,
    viewingEvent: { id: '1', title: 'Raid', date: '2026-05-28', time: '20:00', type: 'raid' as const },
  };
  const actual = reducer(state, closeEventDetail());
  expect(actual.isEventDetailOpen).toBe(false);
  expect(actual.viewingEvent).toBeNull();
});
```

You will also need to add `import { ActivityEvent } from '@/shared/types';` if not already present.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- src/entities/calendar/model/slice.test.ts
```

Expected: FAIL — `openEventDetail` and `closeEventDetail` not exported.

- [ ] **Step 3: Implement new reducers**

In `src/entities/calendar/model/slice.ts`, update `initialState` and add reducers:

```ts
const initialState: UIState = {
  isEventModalOpen: false,
  selectedDate: null,
  viewDate: dayjs().toISOString(),
  isEventDetailOpen: false,
  viewingEvent: null,
};
```

Add to `reducers` object:

```ts
openEventDetail: (state, action: PayloadAction<ActivityEvent>) => {
  state.isEventDetailOpen = true;
  state.viewingEvent = action.payload;
},
closeEventDetail: (state) => {
  state.isEventDetailOpen = false;
  state.viewingEvent = null;
},
```

Add `ActivityEvent` to imports from `@/shared/types` if not present.

Export the new actions at the bottom of the file alongside existing ones:

```ts
export const {
  openEventModal,
  closeEventModal,
  setSelectedDate,
  nextMonth,
  prevMonth,
  setViewDate,
  openEventDetail,
  closeEventDetail,
} = uiSlice.actions;
```

- [ ] **Step 4: Export from public API**

In `src/entities/calendar/index.ts`:

```ts
export {
  default as calendarReducer,
  openEventModal,
  closeEventModal,
  setSelectedDate,
  nextMonth,
  prevMonth,
  setViewDate,
  openEventDetail,
  closeEventDetail,
} from './model/slice';
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm run test:run -- src/entities/calendar/model/slice.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/entities/calendar/model/slice.ts src/entities/calendar/index.ts src/entities/calendar/model/slice.test.ts
git commit -m "feat(calendar): add openEventDetail and closeEventDetail actions"
```

---

## Task 4: API — getGuildMembers

**Files:**
- Create: `src/entities/guild/api/getGuildMembers.ts`
- Modify: `src/entities/guild/index.ts`

- [ ] **Step 1: Create server action**

Create `src/entities/guild/api/getGuildMembers.ts`:

```ts
'use server';
import { createClient } from '@/shared/api/supabase/server';
import { GuildMember } from '../model/types';

export const getGuildMembers = async (guildId: string): Promise<GuildMember[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('guild_members')
    .select('user_id, role, profiles(full_name, avatar_url)')
    .eq('guild_id', guildId);

  if (error) throw error;

  return (data || []).map((row) => ({
    userId: row.user_id,
    role: row.role as 'OWNER' | 'ADMIN' | 'MEMBER',
    profile: {
      fullName: (row.profiles as { full_name: string | null; avatar_url: string | null } | null)?.full_name ?? null,
      avatarUrl: (row.profiles as { full_name: string | null; avatar_url: string | null } | null)?.avatar_url ?? null,
    },
  }));
};
```

- [ ] **Step 2: Export from public API**

In `src/entities/guild/index.ts`:

```ts
export * from './model/types';
export * from './model/slice';
export * from './api/getGuilds';
export * from './api/createGuild';
export * from './api/getGuildMembers';
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/entities/guild/api/getGuildMembers.ts src/entities/guild/index.ts
git commit -m "feat(guild): add getGuildMembers server action"
```

---

## Task 5: API — getEventParticipantUserIds + syncParticipants

**Files:**
- Create: `src/entities/event/api/getEventParticipantUserIds.ts`
- Create: `src/entities/event/api/syncParticipants.ts`
- Modify: `src/entities/event/index.ts`

- [ ] **Step 1: Create getEventParticipantUserIds**

Create `src/entities/event/api/getEventParticipantUserIds.ts`:

```ts
'use server';
import { createClient } from '@/shared/api/supabase/server';

export const getEventParticipantUserIds = async (eventId: string): Promise<string[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId);

  if (error) throw error;

  return (data || []).map((r) => r.user_id);
};
```

- [ ] **Step 2: Create syncParticipants**

Create `src/entities/event/api/syncParticipants.ts`:

```ts
'use server';
import { createClient } from '@/shared/api/supabase/server';

export const syncParticipants = async (eventId: string, userIds: string[]): Promise<void> => {
  const supabase = await createClient();

  const { data: current } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId);

  const currentIds = new Set((current || []).map((r) => r.user_id));
  const newIds = new Set(userIds);

  const toDelete = [...currentIds].filter((id) => !newIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .in('user_id', toDelete);
    if (error) throw error;
  }

  const toInsert = [...newIds].filter((id) => !currentIds.has(id));
  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('event_participants')
      .insert(toInsert.map((user_id) => ({ event_id: eventId, user_id, status: 'pending' })));
    if (error) throw error;
  }
};
```

- [ ] **Step 3: Export from public API**

In `src/entities/event/index.ts`:

```ts
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
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/entities/event/api/getEventParticipantUserIds.ts src/entities/event/api/syncParticipants.ts src/entities/event/index.ts
git commit -m "feat(event): add getEventParticipantUserIds and syncParticipants server actions"
```

---

## Task 6: API — getEventParticipants + updateParticipantStatus

**Files:**
- Create: `src/features/event-detail/api/getEventParticipants.ts`
- Create: `src/features/event-detail/api/updateParticipantStatus.ts`

- [ ] **Step 1: Create getEventParticipants**

Create `src/features/event-detail/api/getEventParticipants.ts`:

```ts
'use server';
import { createClient } from '@/shared/api/supabase/server';
import { EventParticipant, ParticipantStatus } from '@/shared/types';

export const getEventParticipants = async (
  eventId: string
): Promise<{ participants: EventParticipant[]; currentUserId: string }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('event_participants')
    .select('id, event_id, user_id, status, profiles(full_name, avatar_url)')
    .eq('event_id', eventId);

  if (error) throw error;

  const participants: EventParticipant[] = (data || []).map((row) => {
    const profile = row.profiles as { full_name: string | null; avatar_url: string | null } | null;
    return {
      id: row.id,
      event_id: row.event_id,
      user_id: row.user_id,
      status: row.status as ParticipantStatus,
      profile: {
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      },
    };
  });

  return { participants, currentUserId: user?.id ?? '' };
};
```

- [ ] **Step 2: Create updateParticipantStatus**

Create `src/features/event-detail/api/updateParticipantStatus.ts`:

```ts
'use server';
import { createClient } from '@/shared/api/supabase/server';

export const updateParticipantStatus = async (
  eventId: string,
  status: 'confirmed' | 'declined'
): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('event_participants')
    .update({ status })
    .eq('event_id', eventId)
    .eq('user_id', user.id);

  if (error) throw error;
};
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/features/event-detail/api/
git commit -m "feat(event-detail): add getEventParticipants and updateParticipantStatus server actions"
```

---

## Task 7: event-detail Redux slice

**Files:**
- Create: `src/features/event-detail/model/slice.ts`
- Create: `src/features/event-detail/model/slice.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/features/event-detail/model/slice.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import reducer, {
  clearParticipants,
  fetchParticipantsThunk,
  updateParticipantStatusThunk,
} from './slice';
import { EventParticipant } from '@/shared/types';

vi.mock('../api/getEventParticipants', () => ({
  getEventParticipants: vi.fn(),
}));
vi.mock('../api/updateParticipantStatus', () => ({
  updateParticipantStatus: vi.fn(),
}));

const initialState = {
  participants: [],
  currentUserId: '',
  loading: false,
  error: null,
};

const mockParticipant: EventParticipant = {
  id: 'p1',
  event_id: 'e1',
  user_id: 'u1',
  status: 'pending',
  profile: { fullName: 'Alice', avatarUrl: null },
};

describe('eventDetailSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('clearParticipants resets state', () => {
    const state = { ...initialState, participants: [mockParticipant], currentUserId: 'u99' };
    const actual = reducer(state, clearParticipants());
    expect(actual.participants).toEqual([]);
    expect(actual.currentUserId).toBe('');
  });

  it('fetchParticipantsThunk.fulfilled sets participants and currentUserId', () => {
    const action = fetchParticipantsThunk.fulfilled(
      { participants: [mockParticipant], currentUserId: 'u1' },
      '',
      'e1'
    );
    const actual = reducer(initialState, action);
    expect(actual.participants).toEqual([mockParticipant]);
    expect(actual.currentUserId).toBe('u1');
    expect(actual.loading).toBe(false);
  });

  it('fetchParticipantsThunk.pending sets loading', () => {
    const action = fetchParticipantsThunk.pending('', 'e1');
    const actual = reducer(initialState, action);
    expect(actual.loading).toBe(true);
  });

  it('fetchParticipantsThunk.rejected sets error', () => {
    const action = fetchParticipantsThunk.rejected(new Error('fail'), '', 'e1');
    const actual = reducer(initialState, action);
    expect(actual.loading).toBe(false);
    expect(actual.error).toBe('fail');
  });

  it('updateParticipantStatusThunk.fulfilled updates status of current user participant', () => {
    const state = {
      ...initialState,
      participants: [mockParticipant],
      currentUserId: 'u1',
    };
    const action = updateParticipantStatusThunk.fulfilled('confirmed', '', { eventId: 'e1', status: 'confirmed' });
    const actual = reducer(state, action);
    expect(actual.participants[0].status).toBe('confirmed');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- src/features/event-detail/model/slice.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement slice**

Create `src/features/event-detail/model/slice.ts`:

```ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { EventParticipant } from '@/shared/types';
import { getEventParticipants } from '../api/getEventParticipants';
import { updateParticipantStatus } from '../api/updateParticipantStatus';

interface EventDetailState {
  participants: EventParticipant[];
  currentUserId: string;
  loading: boolean;
  error: string | null;
}

const initialState: EventDetailState = {
  participants: [],
  currentUserId: '',
  loading: false,
  error: null,
};

export const fetchParticipantsThunk = createAsyncThunk(
  'eventDetail/fetchParticipants',
  async (eventId: string) => getEventParticipants(eventId)
);

export const updateParticipantStatusThunk = createAsyncThunk(
  'eventDetail/updateStatus',
  async ({ eventId, status }: { eventId: string; status: 'confirmed' | 'declined' }) => {
    await updateParticipantStatus(eventId, status);
    return status;
  }
);

export const eventDetailSlice = createSlice({
  name: 'eventDetail',
  initialState,
  reducers: {
    clearParticipants: (state) => {
      state.participants = [];
      state.currentUserId = '';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchParticipantsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchParticipantsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.participants = action.payload.participants;
        state.currentUserId = action.payload.currentUserId;
      })
      .addCase(fetchParticipantsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch participants';
      })
      .addCase(updateParticipantStatusThunk.fulfilled, (state, action) => {
        const p = state.participants.find((x) => x.user_id === state.currentUserId);
        if (p) p.status = action.payload;
      })
      .addCase(updateParticipantStatusThunk.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update status';
      });
  },
});

export const { clearParticipants } = eventDetailSlice.actions;
export default eventDetailSlice.reducer;
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:run -- src/features/event-detail/model/slice.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/event-detail/model/
git commit -m "feat(event-detail): add Redux slice with fetchParticipants and updateParticipantStatus thunks"
```

---

## Task 8: Register eventDetailReducer in store

**Files:**
- Modify: `src/app/providers/StoreProvider/config/store.ts`

- [ ] **Step 1: Add reducer to store**

In `src/app/providers/StoreProvider/config/store.ts`:

```ts
import { configureStore } from '@reduxjs/toolkit';
import { calendarReducer } from '@/entities/calendar';
import { eventsReducer } from '@/entities/event';
import { guildReducer } from '@/entities/guild/model/slice';
import eventDetailReducer from '@/features/event-detail/model/slice';

export const store = configureStore({
  reducer: {
    ui: calendarReducer,
    events: eventsReducer,
    guild: guildReducer,
    eventDetail: eventDetailReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/providers/StoreProvider/config/store.ts
git commit -m "feat(store): register eventDetail reducer"
```

---

## Task 9: Translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add EventDetail namespace to en.json**

Add inside the root object of `messages/en.json`:

```json
"EventDetail": {
  "type": "Type",
  "dateTime": "Date & Time",
  "description": "Description",
  "creator": "Creator",
  "participants": "Participants",
  "noParticipants": "No participants yet. Add them when editing the event.",
  "edit": "Edit",
  "status": {
    "pending": "Awaiting response",
    "confirmed": "Coming",
    "declined": "Not coming"
  },
  "confirmBtn": "Coming",
  "declineBtn": "Not coming"
},
```

Also add to `"Event"."wizard"` section:
```json
"memberSearch": "Search members…",
"noMembers": "No guild members found"
```

- [ ] **Step 2: Add EventDetail namespace to ru.json**

Add inside the root object of `messages/ru.json`:

```json
"EventDetail": {
  "type": "Тип",
  "dateTime": "Дата и время",
  "description": "Описание",
  "creator": "Создатель",
  "participants": "Участники",
  "noParticipants": "Участников пока нет. Добавьте их при редактировании события.",
  "edit": "Редактировать",
  "status": {
    "pending": "Ожидает ответа",
    "confirmed": "Придёт",
    "declined": "Не придёт"
  },
  "confirmBtn": "Приду",
  "declineBtn": "Не приду"
},
```

Also add to `"Event"."wizard"` section:
```json
"memberSearch": "Поиск участников…",
"noMembers": "Участников гильдии не найдено"
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat(i18n): add EventDetail translations"
```

---

## Task 10: ParticipantItem component

**Files:**
- Create: `src/features/event-detail/ui/ParticipantItem.tsx`
- Create: `src/features/event-detail/ui/ParticipantItem.module.css`
- Create: `src/features/event-detail/ui/ParticipantItem.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/event-detail/ui/ParticipantItem.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ParticipantItem } from './ParticipantItem';
import { EventParticipant } from '@/shared/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const base: EventParticipant = {
  id: 'p1',
  event_id: 'e1',
  user_id: 'u1',
  status: 'pending',
  profile: { fullName: 'Alice Smith', avatarUrl: null },
};

describe('ParticipantItem', () => {
  it('renders participant name', () => {
    render(<ParticipantItem participant={base} isCurrentUser={false} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('shows status label', () => {
    render(<ParticipantItem participant={{ ...base, status: 'confirmed' }} isCurrentUser={false} />);
    expect(screen.getByText('status.confirmed')).toBeInTheDocument();
  });

  it('does NOT show confirm/decline buttons for other users', () => {
    render(<ParticipantItem participant={base} isCurrentUser={false} />);
    expect(screen.queryByText('confirmBtn')).not.toBeInTheDocument();
    expect(screen.queryByText('declineBtn')).not.toBeInTheDocument();
  });

  it('shows confirm/decline buttons for current user with pending status', () => {
    render(
      <ParticipantItem
        participant={base}
        isCurrentUser={true}
        onConfirm={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText('confirmBtn')).toBeInTheDocument();
    expect(screen.getByText('declineBtn')).toBeInTheDocument();
  });

  it('does NOT show confirm/decline for current user who already confirmed', () => {
    render(
      <ParticipantItem
        participant={{ ...base, status: 'confirmed' }}
        isCurrentUser={true}
      />
    );
    expect(screen.queryByText('confirmBtn')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ParticipantItem
        participant={base}
        isCurrentUser={true}
        onConfirm={onConfirm}
        onDecline={vi.fn()}
      />
    );
    await user.click(screen.getByText('confirmBtn'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- src/features/event-detail/ui/ParticipantItem.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ParticipantItem**

Create `src/features/event-detail/ui/ParticipantItem.tsx`:

```tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { EventParticipant } from '@/shared/types';
import styles from './ParticipantItem.module.css';

interface ParticipantItemProps {
  participant: EventParticipant;
  isCurrentUser: boolean;
  onConfirm?: () => void;
  onDecline?: () => void;
}

export const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  isCurrentUser,
  onConfirm,
  onDecline,
}) => {
  const t = useTranslations('EventDetail');

  const initials = (participant.profile.fullName || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const showActions = isCurrentUser && participant.status === 'pending';

  return (
    <div
      className={`${styles.item} ${isCurrentUser ? styles.currentUser : ''} ${styles[`status_${participant.status}`]}`}
    >
      <div className={styles.avatar}>{initials}</div>
      <div className={styles.info}>
        <span className={styles.name}>{participant.profile.fullName || '—'}</span>
        <span className={`${styles.statusLabel} ${styles[`statusLabel_${participant.status}`]}`}>
          {t(`status.${participant.status}`)}
        </span>
      </div>
      {showActions && (
        <div className={styles.actions}>
          <button className={styles.confirmBtn} onClick={onConfirm}>
            {t('confirmBtn')}
          </button>
          <button className={styles.declineBtn} onClick={onDecline}>
            {t('declineBtn')}
          </button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Create CSS module**

Create `src/features/event-detail/ui/ParticipantItem.module.css`:

```css
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: background 0.15s ease;
}

.currentUser {
  background: rgba(248, 150, 30, 0.08);
  border: 1px solid rgba(248, 150, 30, 0.25);
}

.status_declined {
  opacity: 0.45;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(108, 99, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  color: var(--text-primary);
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 13px;
  color: var(--text-primary);
}

.statusLabel {
  font-size: 11px;
  color: var(--text-secondary);
}

.statusLabel_confirmed { color: #43aa8b; }
.statusLabel_pending   { color: #f8961e; }
.statusLabel_declined  { color: #ff8080; }

.actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.confirmBtn,
.declineBtn {
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  border: none;
  font-weight: 600;
}

.confirmBtn {
  background: #43aa8b;
  color: #fff;
}

.declineBtn {
  background: rgba(255, 80, 80, 0.15);
  color: #ff8080;
  border: 1px solid rgba(255, 80, 80, 0.3);
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm run test:run -- src/features/event-detail/ui/ParticipantItem.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/event-detail/ui/ParticipantItem.tsx src/features/event-detail/ui/ParticipantItem.module.css src/features/event-detail/ui/ParticipantItem.test.tsx
git commit -m "feat(event-detail): add ParticipantItem component"
```

---

## Task 11: EventDetailView component

**Files:**
- Create: `src/features/event-detail/ui/EventDetailView.tsx`
- Create: `src/features/event-detail/ui/EventDetailView.module.css`
- Create: `src/features/event-detail/ui/EventDetailView.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/event-detail/ui/EventDetailView.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventDetailView } from './EventDetailView';
import { calendarReducer } from '@/entities/calendar';
import eventDetailReducer from '../model/slice';
import { ActivityEvent } from '@/shared/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockEvent: ActivityEvent = {
  id: 'e1',
  title: 'Morning Raid',
  date: '2026-05-28',
  time: '20:00',
  type: 'raid',
  description: 'Bring potions',
};

function makeStore(uiOverrides = {}) {
  return configureStore({
    reducer: { ui: calendarReducer, eventDetail: eventDetailReducer },
    preloadedState: {
      ui: {
        isEventModalOpen: false,
        selectedDate: null,
        viewDate: '2026-05-01T00:00:00.000Z',
        isEventDetailOpen: false,
        viewingEvent: null,
        ...uiOverrides,
      },
      eventDetail: {
        participants: [],
        currentUserId: '',
        loading: false,
        error: null,
      },
    },
  });
}

describe('EventDetailView', () => {
  it('is not rendered when isEventDetailOpen is false', () => {
    const store = makeStore({ isEventDetailOpen: false });
    render(<Provider store={store}><EventDetailView /></Provider>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders event title when open', () => {
    const store = makeStore({ isEventDetailOpen: true, viewingEvent: mockEvent });
    render(<Provider store={store}><EventDetailView /></Provider>);
    expect(screen.getByText('Morning Raid')).toBeInTheDocument();
  });

  it('renders event description when open', () => {
    const store = makeStore({ isEventDetailOpen: true, viewingEvent: mockEvent });
    render(<Provider store={store}><EventDetailView /></Provider>);
    expect(screen.getByText('Bring potions')).toBeInTheDocument();
  });

  it('renders event time', () => {
    const store = makeStore({ isEventDetailOpen: true, viewingEvent: mockEvent });
    render(<Provider store={store}><EventDetailView /></Provider>);
    expect(screen.getByText('20:00')).toBeInTheDocument();
  });

  it('shows empty participants message when list is empty', () => {
    const store = makeStore({ isEventDetailOpen: true, viewingEvent: mockEvent });
    render(<Provider store={store}><EventDetailView /></Provider>);
    expect(screen.getByText('noParticipants')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- src/features/event-detail/ui/EventDetailView.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement EventDetailView**

Create `src/features/event-detail/ui/EventDetailView.tsx`:

```tsx
'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventDetail, openEventModal } from '@/entities/calendar';
import { Button } from '@/shared/ui/Button';
import {
  fetchParticipantsThunk,
  updateParticipantStatusThunk,
  clearParticipants,
} from '../model/slice';
import { ParticipantItem } from './ParticipantItem';
import styles from './EventDetailView.module.css';

export const EventDetailView: React.FC = () => {
  const dispatch = useAppDispatch();
  const t = useTranslations('EventDetail');
  const commonT = useTranslations('Common');
  const eventT = useTranslations('Event');

  const isOpen = useAppSelector((state) => state.ui.isEventDetailOpen);
  const event = useAppSelector((state) => state.ui.viewingEvent);
  const { participants, currentUserId, loading } = useAppSelector(
    (state) => state.eventDetail
  );

  useEffect(() => {
    if (isOpen && event) {
      dispatch(fetchParticipantsThunk(event.id));
    }
    if (!isOpen) {
      dispatch(clearParticipants());
    }
  }, [isOpen, event, dispatch]);

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

  const handleConfirm = () => {
    if (!event) return;
    dispatch(updateParticipantStatusThunk({ eventId: event.id, status: 'confirmed' })).then(
      (result) => {
        if (result.meta.requestStatus === 'rejected') toast.error(eventT('error'));
      }
    );
  };

  const handleDecline = () => {
    if (!event) return;
    dispatch(updateParticipantStatusThunk({ eventId: event.id, status: 'declined' })).then(
      (result) => {
        if (result.meta.requestStatus === 'rejected') toast.error(eventT('error'));
      }
    );
  };

  const typeLabel = event ? eventT(`types.${event.type}` as never) : '';

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
                <span className={`${styles.typeBadge} ${styles[`type_${event?.type}`]}`}>
                  {typeLabel}
                </span>
              </div>

              <div className={styles.infoGroup}>
                <span className={styles.label}>{t('dateTime')}</span>
                <span className={styles.dateTime}>
                  {event?.date} &nbsp; {event?.time}
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
                {t('participants')} {!loading && `(${participants.length})`}
              </span>

              {loading && <div className={styles.skeleton} />}

              {!loading && participants.length === 0 && (
                <p className={styles.empty}>{t('noParticipants')}</p>
              )}

              {!loading &&
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

- [ ] **Step 4: Create CSS module**

Create `src/features/event-detail/ui/EventDetailView.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: linear-gradient(135deg, rgba(15, 12, 41, 0.97) 0%, rgba(48, 43, 99, 0.97) 50%, rgba(36, 36, 62, 0.97) 100%);
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  animation: detailShow 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.header {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
  position: relative;
}

.closeButton {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.closeButton:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow-y: auto;
}

.column {
  padding: 32px;
}

.column:first-child {
  border-right: 1px solid var(--glass-border);
}

.infoGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 4px;
  display: block;
}

.typeBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  background: rgba(108, 99, 255, 0.2);
  color: #a89fff;
  border: 1px solid rgba(108, 99, 255, 0.3);
  width: fit-content;
}

.type_raid    { background: rgba(255, 101, 132, 0.2); color: #ff9ab0; border-color: rgba(255, 101, 132, 0.3); }
.type_game    { background: rgba(108, 99, 255, 0.2);  color: #a89fff; border-color: rgba(108, 99, 255, 0.3); }
.type_meeting { background: rgba(67, 170, 139, 0.2);  color: #6fd4b2; border-color: rgba(67, 170, 139, 0.3); }
.type_other   { background: rgba(87, 117, 144, 0.2);  color: #8fb5d0; border-color: rgba(87, 117, 144, 0.3); }

.dateTime {
  font-size: 1rem;
  color: var(--text-primary);
}

.description {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 12px;
}

.skeleton {
  height: 44px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
}

@keyframes detailShow {
  from { opacity: 0; transform: scale(0.98); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.8; }
}

@media (max-width: 768px) {
  .body {
    grid-template-columns: 1fr;
  }
  .column:first-child {
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm run test:run -- src/features/event-detail/ui/EventDetailView.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/event-detail/ui/
git commit -m "feat(event-detail): add EventDetailView component"
```

---

## Task 12: Public API for event-detail feature

**Files:**
- Create: `src/features/event-detail/index.ts`

- [ ] **Step 1: Create index.ts**

Create `src/features/event-detail/index.ts`:

```ts
export { EventDetailView } from './ui/EventDetailView';
export {
  default as eventDetailReducer,
  clearParticipants,
  fetchParticipantsThunk,
  updateParticipantStatusThunk,
} from './model/slice';
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/event-detail/index.ts
git commit -m "feat(event-detail): add public API index"
```

---

## Task 13: Wire up EventCard click + DayPage

**Files:**
- Modify: `src/entities/event/ui/EventCard.tsx`
- Modify: `src/widgets/day-events/ui/DayEventsList.tsx`
- Modify: `src/app/day/[date]/page.tsx`

- [ ] **Step 1: Add onClick to EventCard**

In `src/entities/event/ui/EventCard.tsx`, update `EventCardProps` and the component:

```tsx
interface EventCardProps {
  event: ActivityEvent;
  onClick?: (event: ActivityEvent) => void;
  onEdit?: (event: ActivityEvent) => void;
  onDelete?: (id: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick, onEdit, onDelete }) => {
  return (
    <div
      className={`${styles.card} ${styles[`type_${event.type}`]} ${onClick ? styles.clickable : ''}`}
      onClick={() => onClick?.(event)}
    >
      <div className={styles.iconWrapper}>
        {typeIcons[event.type]}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{event.title}</h3>
          <div className={styles.timeWrapper}>
            <Clock size={14} />
            <span>{event.time}</span>
          </div>
        </div>

        {event.description && (
          <p className={styles.description}>{event.description}</p>
        )}
      </div>

      <div className={styles.actions}>
        {onEdit && (
          <Button
            variant="ghost"
            size="icon_sm"
            onClick={(e) => { e.stopPropagation(); onEdit(event); }}
            className={styles.actionBtn}
          >
            <Edit2 size={16} />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon_sm"
            onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
            className={styles.deleteBtn}
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};
```

Add `.clickable` to `src/entities/event/ui/EventCard.module.css`:

```css
.clickable {
  cursor: pointer;
}

.clickable:hover {
  background: rgba(255, 255, 255, 0.04);
}
```

- [ ] **Step 2: Dispatch openEventDetail in DayEventsList**

In `src/widgets/day-events/ui/DayEventsList.tsx`, add the import and handler:

```ts
import { openEventModal, setSelectedDate, openEventDetail } from '@/entities/calendar';
```

Add handler (after existing handlers):

```ts
const handleViewEvent = (event: ActivityEvent) => {
  dispatch(openEventDetail(event));
};
```

Pass `onClick` prop to `EventCard`:

```tsx
<EventCard
  key={event.id}
  event={event}
  onClick={handleViewEvent}
  onEdit={!isPastDate ? handleEditEvent : undefined}
  onDelete={handleDeleteClick}
/>
```

- [ ] **Step 3: Render EventDetailView in DayPage**

In `src/app/day/[date]/page.tsx`:

```tsx
import { EventDetailView } from '@/features/event-detail';

// inside return:
<EventWizard isDayView />
<EventDetailView />
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Run all tests**

```bash
npm run test:run
```

Expected: all tests PASS (no regressions).

- [ ] **Step 6: Commit**

```bash
git add src/entities/event/ui/EventCard.tsx src/entities/event/ui/EventCard.module.css src/widgets/day-events/ui/DayEventsList.tsx src/app/day/[date]/page.tsx
git commit -m "feat: wire up EventCard click to open EventDetailView"
```

---

## Task 14: Wizard participant picker

**Files:**
- Modify: `src/features/create-event/ui/EventWizard.tsx`
- Modify: `src/features/create-event/ui/EventWizard.module.css`

- [ ] **Step 1: Replace Invited stub with real picker**

In `src/features/create-event/ui/EventWizard.tsx`, add imports and state:

```tsx
import { getGuildMembers } from '@/entities/guild';
import { getEventParticipantUserIds } from '@/entities/event';
import { GuildMember } from '@/entities/guild';

// Inside EventWizard component, add state:
const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
const tDetail = useTranslations('EventDetail');

// Add useEffect after existing ones:
useEffect(() => {
  if (!isOpen || !activeGuildId) return;
  getGuildMembers(activeGuildId).then(setGuildMembers);
  if (editingEvent) {
    getEventParticipantUserIds(editingEvent.id).then(setSelectedParticipants);
  } else {
    setSelectedParticipants([]);
  }
}, [isOpen, activeGuildId, editingEvent]);

const toggleParticipant = (userId: string) => {
  setSelectedParticipants((prev) =>
    prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
  );
};
```

Replace the "Invited" stub group (the `<div className={styles.stubGroup}>` with `invitedLabel`) with:

```tsx
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
```

- [ ] **Step 2: Add picker styles**

Add to `src/features/create-event/ui/EventWizard.module.css`:

```css
.memberList {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.memberItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  background: rgba(255, 255, 255, 0.03);
}

.memberItem:hover {
  background: rgba(255, 255, 255, 0.06);
}

.memberSelected {
  background: rgba(108, 99, 255, 0.12);
  border-color: rgba(108, 99, 255, 0.3);
}

.memberAvatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(108, 99, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  color: var(--text-primary);
}

.memberName {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
}

.memberCheck {
  font-size: 12px;
  color: #43aa8b;
  font-weight: 700;
}

.noMembers {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 8px 0;
}
```

- [ ] **Step 3: Run existing wizard tests**

```bash
npm run test:run -- src/features/create-event/ui/EventWizard.test.tsx
```

Expected: all tests PASS (picker uses `guildMembers` state which starts empty).

- [ ] **Step 4: Commit**

```bash
git add src/features/create-event/ui/EventWizard.tsx src/features/create-event/ui/EventWizard.module.css
git commit -m "feat(wizard): replace Invited stub with real guild member picker"
```

---

## Task 15: Sync participants on save

**Files:**
- Modify: `src/features/create-event/ui/EventWizard.tsx`

- [ ] **Step 1: Import syncParticipants and call after save**

In `src/features/create-event/ui/EventWizard.tsx`, add import:

```ts
import { syncParticipants } from '@/entities/event';
```

Update `handleSubmit` — after each successful save, call `syncParticipants`:

```ts
const handleSubmit = (data: EventFormData) => {
  if (!activeGuildId) {
    toast.error(t('error'));
    return;
  }

  if (editingEvent) {
    dispatch(updateEventThunk({ id: editingEvent.id, event: data })).then(async (result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        await syncParticipants(editingEvent.id, selectedParticipants).catch(() => {
          toast.error(t('error'));
        });
        toast.success(t('successUpdated'));
        handleClose();
      } else {
        toast.error(t('error'));
      }
    });
  } else {
    dispatch(createEventThunk({ ...data, guild_id: activeGuildId })).then(async (result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        const newEventId = (result.payload as { id: string }).id;
        await syncParticipants(newEventId, selectedParticipants).catch(() => {
          toast.error(t('error'));
        });
        toast.success(t('successCreated'));
        handleClose();
      } else {
        toast.error(t('error'));
      }
    });
  }
};
```

- [ ] **Step 2: Run wizard tests**

```bash
npm run test:run -- src/features/create-event/ui/EventWizard.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 3: Run full test suite**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/create-event/ui/EventWizard.tsx
git commit -m "feat(wizard): sync participants with event on save"
```

---

## Task 16: Final verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Full test run**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: event detail view — final verification pass"
```
