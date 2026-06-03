# Participant Count on Event Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a participant counter (confirmed / total) on each EventCard in the day view.

**Architecture:** `EventCard` gains an optional `participantCount` prop and renders it below the time. In `DayEventsList` a local wrapper component `EventCardWithCounts` calls `useGetParticipantsQuery` per event and forwards the counts — this keeps hooks out of a loop while staying in the widget layer.

**Tech Stack:** React 19, RTK Query (`useGetParticipantsQuery`), CSS Modules, lucide-react (`Users` icon), Vitest + Testing Library.

---

### Task 1: Add participantCount prop to EventCard

**Files:**
- Modify: `src/entities/event/ui/EventCard.tsx`
- Modify: `src/entities/event/ui/EventCard.module.css`
- Modify: `src/entities/event/ui/EventCard.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `src/entities/event/ui/EventCard.test.tsx` (after the last existing test):

```tsx
it('renders participant count when provided', () => {
  render(<EventCard event={event} participantCount={{ total: 5, confirmed: 3 }} />);
  expect(screen.getByText('3 / 5')).toBeInTheDocument();
});

it('renders 0 / 0 when participantCount is zero', () => {
  render(<EventCard event={event} participantCount={{ total: 0, confirmed: 0 }} />);
  expect(screen.getByText('0 / 0')).toBeInTheDocument();
});

it('does not render participant count when prop is absent', () => {
  render(<EventCard event={event} />);
  expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/entities/event/ui/EventCard.test.tsx
```

Expected: 3 new tests FAIL.

- [ ] **Step 3: Update EventCard.tsx**

Replace the full file content:

```tsx
'use client';

import React from 'react';
import { Sword, Gamepad2, Users, Calendar, Clock, Trash2, Edit2, Skull, PartyPopper, Dumbbell } from 'lucide-react';
import { ActivityEvent, ActivityType } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import styles from './EventCard.module.css';

interface ParticipantCount {
  total: number;
  confirmed: number;
}

interface EventCardProps {
  event: ActivityEvent;
  participantCount?: ParticipantCount;
  onClick?: (event: ActivityEvent) => void;
  onEdit?: (event: ActivityEvent) => void;
  onDelete?: (id: string) => void;
}

const typeIcons: Record<ActivityType, React.ReactNode> = {
  raid: <Sword size={20} />,
  game: <Gamepad2 size={20} />,
  meeting: <Users size={20} />,
  other: <Calendar size={20} />,
  dungeon: <Skull size={20} />,
  party: <PartyPopper size={20} />,
  sport: <Dumbbell size={20} />,
};

export const EventCard: React.FC<EventCardProps> = ({ event, participantCount, onClick, onEdit, onDelete }) => {
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
          <div className={styles.meta}>
            <div className={styles.timeWrapper}>
              <Clock size={14} />
              <span>{event.time}</span>
            </div>
            {participantCount !== undefined && (
              <div className={styles.participantWrapper}>
                <Users size={14} />
                <span>{participantCount.confirmed} / {participantCount.total}</span>
              </div>
            )}
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

- [ ] **Step 4: Add CSS for meta, participantWrapper**

Add to the end of `src/entities/event/ui/EventCard.module.css`:

```css
.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.participantWrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
}
```

- [ ] **Step 5: Run tests — all must pass**

```bash
npm run test:run -- src/entities/event/ui/EventCard.test.tsx
```

Expected: all tests PASS.

---

### Task 2: Wire participant counts in DayEventsList

**Files:**
- Modify: `src/widgets/day-events/ui/DayEventsList.tsx`

- [ ] **Step 1: Add EventCardWithCounts wrapper and use it**

In `src/widgets/day-events/ui/DayEventsList.tsx`:

1. Add `useGetParticipantsQuery` to the import from `@/entities/event`:

```tsx
import { EventCard, useDeleteEventMutation, useGetEventsQuery, useGetParticipantsQuery } from '@/entities/event';
```

2. Add the wrapper component before `DayEventsList` (after the imports):

```tsx
const EventCardWithCounts: React.FC<{
  event: ActivityEvent;
  onClick?: (event: ActivityEvent) => void;
  onEdit?: (event: ActivityEvent) => void;
  onDelete?: (id: string) => void;
}> = ({ event, onClick, onEdit, onDelete }) => {
  const { data } = useGetParticipantsQuery(event.id);
  const participants = data?.participants ?? [];
  const total = participants.length;
  const confirmed = participants.filter((p) => p.status === 'confirmed').length;

  return (
    <EventCard
      event={event}
      onClick={onClick}
      onEdit={onEdit}
      onDelete={onDelete}
      participantCount={{ total, confirmed }}
    />
  );
};
```

3. In the `dayEvents.map(...)` block, replace `<EventCard ...>` with `<EventCardWithCounts ...>`:

```tsx
{dayEvents.map(event => (
  <EventCardWithCounts
    key={event.id}
    event={event}
    onClick={handleViewEvent}
    onEdit={!isPastDate && canManageEvents ? handleEditEvent : undefined}
    onDelete={canManageEvents ? handleDeleteClick : undefined}
  />
))}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests PASS, no TypeScript errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.
