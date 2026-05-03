# Complete Event Migration to Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the migration of event management to Supabase by implementing `createEventThunk` and integrating fetch/create thunks into the UI.

**Architecture:** Use Redux Toolkit's `createAsyncThunk` for asynchronous operations and integrate them into FSD-compliant components (widgets and features).

**Tech Stack:** Next.js, Redux Toolkit, Supabase, Vitest.

---

### Task 1: Add createEventThunk to Event Slice

**Files:**
- Modify: `src/entities/event/model/slice.ts`
- Test: `src/entities/event/model/slice.test.ts`

- [ ] **Step 1: Write the failing test for createEventThunk in slice.test.ts**

```typescript
// Add imports if necessary
import { fetchEventsThunk, createEventThunk } from './slice';

// Inside describe('eventsSlice', () => {
  it('should handle createEventThunk.fulfilled', () => {
    const initialState: EventsState = {
      items: [],
      loading: false,
      error: null,
    };
    const newEvent: ActivityEvent = {
      id: 'new-id',
      title: 'New Event',
      date: '2026-05-04',
      time: '18:00',
      type: 'raid',
      description: 'New description',
    };
    
    const action = { type: createEventThunk.fulfilled.type, payload: newEvent };
    const actual = eventsReducer(initialState, action);
    expect(actual.items).toHaveLength(1);
    expect(actual.items[0]).toEqual(newEvent);
  });
// });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test src/entities/event/model/slice.test.ts`
Expected: FAIL (createEventThunk is not defined)

- [ ] **Step 3: Implement createEventThunk in slice.ts**

```typescript
import { createEvent } from '../api/createEvent';

export const createEventThunk = createAsyncThunk(
  'events/createEvent',
  async (event: Omit<ActivityEvent, 'id'> & { guild_id: string }) => {
    const data = await createEvent(event);
    return {
      id: data.id,
      title: data.title,
      description: data.description || undefined,
      type: data.type as ActivityType,
      date: data.event_date.split('T')[0],
      time: data.event_date.split('T')[1].substring(0, 5),
    };
  }
);

// In extraReducers:
      .addCase(createEventThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(createEventThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(createEventThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create event';
      });
```

- [ ] **Step 4: Run tests to verify success**

Run: `npm test src/entities/event/model/slice.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/entities/event/model/slice.ts src/entities/event/model/slice.test.ts
git commit -m "feat: add createEventThunk to events slice"
```

### Task 2: Integrate fetchEventsThunk into CalendarGrid

**Files:**
- Modify: `src/widgets/calendar/ui/CalendarGrid.tsx`

- [ ] **Step 1: Update CalendarGrid to fetch events on mount**

```typescript
import { useEffect } from 'react';
import { fetchEventsThunk } from '@/entities/event';

// Inside CalendarGrid component:
  useEffect(() => {
    // Using a hardcoded guild ID for now as requested
    dispatch(fetchEventsThunk('00000000-0000-0000-0000-000000000000'));
  }, [dispatch]);
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/calendar/ui/CalendarGrid.tsx
git commit -m "feat: fetch events in CalendarGrid on mount"
```

### Task 3: Integrate createEventThunk into CreateEventModal

**Files:**
- Modify: `src/features/create-event/ui/CreateEventModal.tsx`

- [ ] **Step 1: Update CreateEventModal to use createEventThunk**

```typescript
import { createEventThunk } from '@/entities/event';

// Update handleSubmit:
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !date || !time) return;

    dispatch(createEventThunk({
      title,
      date,
      time,
      type,
      description,
      guild_id: '00000000-0000-0000-0000-000000000000', // Hardcoded for now
    }));

    handleClose();
  };
```

- [ ] **Step 2: Commit**

```bash
git add src/features/create-event/ui/CreateEventModal.tsx
git commit -m "feat: use createEventThunk in CreateEventModal"
```

### Task 4: Final Verification and Cleanup

- [ ] **Step 1: Run all tests**

Run: `npm run test:run`
Expected: ALL PASS

- [ ] **Step 2: Final Commit**

```bash
git commit --allow-empty -m "fix: complete event migration and integrate with UI"
```
