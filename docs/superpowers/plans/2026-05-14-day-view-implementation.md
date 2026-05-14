# Day View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the event creation action from day viewing by adding a hoverable "+" button to calendar cells and creating a dedicated page for viewing a specific day's events.

**Architecture:** Update the `CalendarGrid` widget to use a relative positioning for the day cell and absolute positioning for the "+" button. The button's click opens the existing event modal (using `e.stopPropagation()`), while clicking the cell itself navigates to the new `/day/[date]` Next.js App Router page.

**Tech Stack:** Next.js (App Router), React, Redux Toolkit, CSS Modules, lucide-react.

---

### Task 1: Update CalendarGrid Styles

**Files:**
- Modify: `src/widgets/calendar/ui/CalendarGrid.module.css`

- [ ] **Step 1: Update day cell positioning and add button styles**

Update `.day` to have relative positioning and add styles for the new `.addEventBtn`.

Modify `src/widgets/calendar/ui/CalendarGrid.module.css`:
```css
.day {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  min-height: 110px;
  height: 100%;
  padding: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative; /* Add relative positioning */
}

.day:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Add these new styles */
.addEventBtn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease;
  z-index: 10;
}

.day:hover .addEventBtn {
  opacity: 1;
}

.addEventBtn:hover {
  background: var(--accent-primary);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/calendar/ui/CalendarGrid.module.css
git commit -m "style: add addEventBtn styles and make day cell relative"
```

---

### Task 2: Update CalendarGrid Component Logic

**Files:**
- Modify: `src/widgets/calendar/ui/CalendarGrid.tsx`

- [ ] **Step 1: Import useRouter and Plus icon, and update handlers**

Modify `src/widgets/calendar/ui/CalendarGrid.tsx` to include the routing and new click handler.

```tsx
'use client';

import React, { useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'; // Import Plus
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation'; // Import useRouter
import dayjs from '@/shared/lib/dayjs';
import styles from './CalendarGrid.module.css';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { openEventModal, setSelectedDate, nextMonth, prevMonth, setViewDate } from '@/entities/calendar';
import { fetchEventsThunk } from '@/entities/event';
import { Select } from '@/shared/ui/Select';

export const CalendarGrid: React.FC<{ guildId: string }> = ({ guildId }) => {
  const dispatch = useAppDispatch();
  const router = useRouter(); // Initialize router
  const viewDateStr = useAppSelector((state) => state.ui.viewDate);
  const events = useAppSelector((state) => state.events.items);
  const locale = useLocale();

// ... existing useEffect and useMemo for now, handlePrevMonth, handleNextMonth, months, years, handleMonthChange, handleYearChange, DAYS_OF_WEEK, days ...

  const handleDayClick = (dateStr: string) => {
    router.push(`/day/${dateStr}`); // Route to day view
  };

  const handleAddEventClick = (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation(); // Prevent routing
    dispatch(setSelectedDate(dateStr));
    dispatch(openEventModal());
  };

  return (
    <div className={styles.container}>
// ... existing header ...
      <div className={styles.grid}>
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.key}
            className={`${styles.dayHeader} ${day.key === 'sat' || day.key === 'sun' ? styles.weekendHeader : ''}`}
          >
            {day.label}
          </div>
        ))}
        {days.map((day, index) => {
          const dayEvents = events
            .filter(event => event.date === day.fullDate)
            .sort((a, b) => a.time.localeCompare(b.time));

          return (
            <div
              key={index}
              className={`${styles.day} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${
                day.isToday ? styles.today : ''
              }`}
              onClick={() => handleDayClick(day.fullDate)}
            >
              <span className={styles.dateNumber}>{day.date}</span>
              <button 
                className={styles.addEventBtn} 
                onClick={(e) => handleAddEventClick(e, day.fullDate)}
                title="Добавить событие"
              >
                <Plus size={16} />
              </button>
              <div className={styles.eventsList}>
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    className={`${styles.eventItem} ${styles[`event_${event.type}`]}`}
                    title={`${event.time} - ${event.title}`}
                  >
                    {event.time} {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/calendar/ui/CalendarGrid.tsx
git commit -m "feat: add plus icon to calendar cells and route to day view on cell click"
```

---

### Task 3: Create Day View Page

**Files:**
- Create: `src/app/day/[date]/page.tsx`

- [ ] **Step 1: Create the day view page component**

Create `src/app/day/[date]/page.tsx`:
```tsx
import Link from 'next/link';
import { getMyGuilds } from '@/entities/guild';
import { redirect } from 'next/navigation';

interface DayPageProps {
  params: {
    date: string;
  };
}

export default async function DayPage({ params }: DayPageProps) {
  const guilds = await getMyGuilds();

  if (guilds.length === 0) {
    redirect('/guilds/create');
  }

  // We could fetch events specific to this day here, but for now we'll rely on the existing Redux state or render a basic layout.
  // Since Redux is client-side state, a fully SSR page would need to fetch events directly from Supabase.
  // For the MVP of this task, we will scaffold the page structure.

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
      <Link href="/" style={{ 
        display: 'inline-block', 
        marginBottom: '20px', 
        color: 'var(--accent-primary)', 
        textDecoration: 'none',
        fontWeight: 'bold'
      }}>
        &larr; Назад в календарь
      </Link>
      
      <div style={{ 
        padding: '30px', 
        borderRadius: '24px', 
        background: 'var(--glass-bg)', 
        border: '1px solid var(--glass-border)',
        backdropFilter: 'var(--glass-blur)'
      }}>
        <h1 style={{ marginBottom: '20px', fontSize: '2rem' }}>Расписание на {params.date}</h1>
        
        <p style={{ opacity: 0.7 }}>
          Здесь будет отображаться детальный список событий на выбранный день.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Check page renders successfully**

Run: `curl http://localhost:3000/day/2026-05-14` (assuming server is running, or test manually in browser)
Expected: HTML response containing "Расписание на 2026-05-14" and "Назад в календарь".

- [ ] **Step 3: Commit**

```bash
git add src/app/day/
git commit -m "feat: add dedicated day view page"
```