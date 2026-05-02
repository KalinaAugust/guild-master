# Calendar Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add month and year navigation to the calendar using Radix UI Select and Lucide icons.

**Architecture:** Extend the Redux `uiSlice` with a `viewDate` state. Create reusable Select components and integrate them into the `CalendarGrid` widget's header.

**Tech Stack:** Next.js, Redux Toolkit, Radix UI Select, Lucide React, CSS Modules.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install required packages**

Run: `npm install @radix-ui/react-select lucide-react clsx tailwind-merge class-variance-authority`

- [ ] **Step 2: Commit changes**

```bash
git add package.json package-lock.json
git commit -m "chore: install radix-ui select and lucide-react"
```

---

### Task 2: Update Redux State for Calendar Navigation

**Files:**
- Modify: `src/entities/calendar/model/slice.ts`

- [ ] **Step 1: Update `UIState` and `initialState`**

Add `viewDate` to `UIState`. Initialize it with the current date in ISO string format.

```typescript
export interface UIState {
  isEventModalOpen: boolean;
  selectedDate: string | null;
  viewDate: string; // NEW: currently viewed month/year
}

const initialState: UIState = {
  isEventModalOpen: false,
  selectedDate: null,
  viewDate: new Date().toISOString(),
};
```

- [ ] **Step 2: Add reducers for navigation**

Add `nextMonth`, `prevMonth`, and `setViewDate` reducers.

```typescript
    nextMonth: (state) => {
      const date = new Date(state.viewDate);
      date.setMonth(date.getMonth() + 1);
      state.viewDate = date.toISOString();
    },
    prevMonth: (state) => {
      const date = new Date(state.viewDate);
      date.setMonth(date.getMonth() - 1);
      state.viewDate = date.toISOString();
    },
    setViewDate: (state, action: PayloadAction<string>) => {
      state.viewDate = action.payload;
    },
```

- [ ] **Step 3: Export actions**

- [ ] **Step 4: Commit changes**

```bash
git add src/entities/calendar/model/slice.ts
git commit -m "feat(calendar): add navigation state to uiSlice"
```

---

### Task 3: Create Base Select Component

**Files:**
- Create: `src/shared/ui/Select/Select.tsx`
- Create: `src/shared/ui/Select/Select.module.css`

- [ ] **Step 1: Implement Select component using Radix UI**

Create a simplified Select component based on Radix UI primitives.

```tsx
// src/shared/ui/Select/Select.tsx
'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, options, placeholder }) => (
  <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
    <SelectPrimitive.Trigger className={styles.trigger}>
      <SelectPrimitive.Value placeholder={placeholder} />
      <SelectPrimitive.Icon>
        <ChevronDown size={16} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className={styles.content}>
        <SelectPrimitive.Viewport className={styles.viewport}>
          {options.map((opt) => (
            <SelectPrimitive.Item key={opt.value} value={opt.value} className={styles.item}>
              <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>
);
```

- [ ] **Step 2: Add basic styling**

```css
/* src/shared/ui/Select/Select.module.css */
.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  min-width: 100px;
  cursor: pointer;
  font-size: 14px;
}

.content {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  overflow: hidden;
  z-index: 1000;
}

.item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  outline: none;
}

.item:hover, .item[data-highlighted] {
  background: #f0f0f0;
}
```

- [ ] **Step 3: Commit changes**

```bash
git add src/shared/ui/Select/
git commit -m "feat(shared): add Select component based on Radix UI"
```

---

### Task 4: Integrate Navigation into CalendarGrid

**Files:**
- Modify: `src/widgets/calendar/ui/CalendarGrid.tsx`
- Modify: `src/widgets/calendar/ui/CalendarGrid.module.css`

- [x] **Step 1: Update `CalendarGrid` to use `viewDate`**

Change `now` to use `viewDate` from the store instead of `selectedDate` or `new Date()`.

```typescript
  const viewDateStr = useAppSelector((state) => state.ui.viewDate);
  const now = new Date(viewDateStr);
```

- [x] **Step 2: Add navigation handlers and helper data**

```typescript
  const handlePrevMonth = () => dispatch(prevMonth());
  const handleNextMonth = () => dispatch(nextMonth());

  const months = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2000, i, 1).toLocaleString('ru-RU', { month: 'long' }),
    value: i.toString(),
  }));

  const years = Array.from({ length: 21 }, (_, i) => {
    const year = new Date().getFullYear() - 10 + i;
    return { label: year.toString(), value: year.toString() };
  });

  const handleMonthChange = (month: string) => {
    const newDate = new Date(now);
    newDate.setMonth(parseInt(month));
    dispatch(setViewDate(newDate.toISOString()));
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(now);
    newDate.setFullYear(parseInt(year));
    dispatch(setViewDate(newDate.toISOString()));
  };
```

- [x] **Step 3: Update JSX with navigation panel**

```tsx
      <div className={styles.header}>
        <div className={styles.controlsLeft}>
          <Select 
            value={now.getMonth().toString()} 
            onValueChange={handleMonthChange} 
            options={months} 
          />
          <Select 
            value={now.getFullYear().toString()} 
            onValueChange={handleYearChange} 
            options={years} 
          />
        </div>
        <div className={styles.controlsRight}>
          <button className={styles.navButton} onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </button>
          <button className={styles.navButton} onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
```

- [x] **Step 4: Update CSS for the new layout**

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.controlsLeft {
  display: flex;
  gap: 12px;
}

.controlsRight {
  display: flex;
  gap: 8px;
}

.navButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #eee;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: background 0.2s;
}

.navButton:hover {
  background: #f9f9f9;
}
```

- [x] **Step 5: Verify implementation and commit**

Run: `npm run dev` and check navigation in browser.

```bash
git add src/widgets/calendar/ui/
git commit -m "feat(calendar): implement month and year navigation in CalendarGrid"
```
