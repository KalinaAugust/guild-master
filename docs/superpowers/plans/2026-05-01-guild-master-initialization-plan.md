# Guild Master Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a Next.js application with App Router, TypeScript, Redux Toolkit, and CSS Modules for the Guild Master project.

**Architecture:** We will set up the base Next.js application, configure the Redux store with basic slices for events and UI state, and wrap the root layout with a Client Component Redux Provider. We will also set up the initial directory structure.

**Tech Stack:** Next.js (App Router), React, TypeScript, Redux Toolkit, React-Redux, CSS Modules.

---

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [x] **Step 1: Run `create-next-app`**

Run: `npx create-next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*" --use-npm`
(Note: When prompted, answer NO to Tailwind CSS as we are using CSS Modules, and NO to Turbo as it's not strictly necessary for initialization).

- [x] **Step 2: Clean up generated files**

Remove boilerplate content from `src/app/page.tsx` and `src/app/globals.css` to start fresh.

```tsx
// src/app/page.tsx
export default function Home() {
  return (
    <main>
      <h1>Guild Master</h1>
    </main>
  );
}
```

```css
/* src/app/globals.css */
body {
  margin: 0;
  font-family: sans-serif;
}
```

- [x] **Step 3: Run the application to verify**

Run: `npm run dev`
Expected: Application starts on localhost:3000 and displays "Guild Master" without errors. Stop the server after verification.

- [x] **Step 4: Commit**

```bash
git add .
git commit -m "chore: initialize Next.js application"
```

### Task 2: Install Redux and Define Types

**Files:**
- Modify: `package.json`
- Create: `src/types/index.ts`

- [x] **Step 1: Install Redux dependencies**

Run: `npm install @reduxjs/toolkit react-redux`

- [x] **Step 2: Define basic types**

Create `src/types/index.ts` with the following interfaces:

```typescript
// src/types/index.ts
export type ActivityType = 'raid' | 'game' | 'meeting' | 'other';

export interface ActivityEvent {
  id: string;
  title: string;
  date: string; // ISO string format
  time: string; // HH:mm format
  type: ActivityType;
  description?: string;
}

export interface EventsState {
  items: ActivityEvent[];
  loading: boolean;
  error: string | null;
}

export interface UIState {
  isEventModalOpen: boolean;
  selectedDate: string | null; // ISO string for the currently viewed date
}
```

- [x] **Step 3: Commit**

```bash
git add package.json package-lock.json src/types/index.ts
git commit -m "feat: install Redux and define base TypeScript interfaces"
```

### Task 3: Configure Redux Store and Slices

**Files:**
- Create: `src/store/slices/eventsSlice.ts`
- Create: `src/store/slices/uiSlice.ts`
- Create: `src/store/store.ts`
- Create: `src/store/hooks.ts`

- [x] **Step 1: Create UI Slice**

```typescript
// src/store/slices/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from '@/types';

const initialState: UIState = {
  isEventModalOpen: false,
  selectedDate: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openEventModal: (state) => {
      state.isEventModalOpen = true;
    },
    closeEventModal: (state) => {
      state.isEventModalOpen = false;
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
  },
});

export const { openEventModal, closeEventModal, setSelectedDate } = uiSlice.actions;
export default uiSlice.reducer;
```

- [x] **Step 2: Create Events Slice**

```typescript
// src/store/slices/eventsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EventsState, ActivityEvent } from '@/types';

const initialState: EventsState = {
  items: [],
  loading: false,
  error: null,
};

export const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    addEvent: (state, action: PayloadAction<ActivityEvent>) => {
      state.items.push(action.payload);
    },
    // Future actions: updateEvent, deleteEvent
  },
});

export const { addEvent } = eventsSlice.actions;
export default eventsSlice.reducer;
```

- [x] **Step 3: Configure Store**

```typescript
// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import eventsReducer from './slices/eventsSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    events: eventsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [x] **Step 4: Create Typed Hooks**

```typescript
// src/store/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

- [x] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: Exits with 0 (no type errors).

- [x] **Step 6: Commit**

```bash
git add src/store/
git commit -m "feat: configure Redux store and create initial slices"
```

### Task 4: Integrate Redux Provider

**Files:**
- Create: `src/app/StoreProvider.tsx`
- Modify: `src/app/layout.tsx`

- [x] **Step 1: Create Client Provider Component**

Because the root layout is a Server Component, we need a Client Component to provide the Redux store.

```tsx
// src/app/StoreProvider.tsx
'use client';

import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { ReactNode } from 'react';

export default function StoreProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

- [x] **Step 2: Update Root Layout**

Wrap the children in `src/app/layout.tsx` with the new `StoreProvider`.

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StoreProvider from "./StoreProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Guild Master",
  description: "Activity planning calendar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
```

- [x] **Step 3: Verify Integration**

Run: `npm run build`
Expected: Successful build, confirming the Client Component provider works within the Server Component layout.

- [x] **Step 4: Commit**

```bash
git add src/app/StoreProvider.tsx src/app/layout.tsx
git commit -m "feat: integrate Redux StoreProvider into root layout"
```
