# Guild Selection and Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a guild selection dropdown in the calendar header with state persistence in `localStorage` and Redux.

**Architecture:** 
- New Redux slice for guild state with `localStorage` persistence.
- Updated `CalendarGrid` UI to include the guild switcher with avatars.
- Reactive event re-fetching when the selected guild changes.

**Tech Stack:** React, Redux Toolkit, Next.js, Lucide React, CSS Modules.

---

### Task 1: Create Guild Redux Slice

**Files:**
- Create: `src/entities/guild/model/slice.ts`
- Modify: `src/app/providers/StoreProvider/config/store.ts`

- [ ] **Step 1: Define the guild slice with persistence**

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const GUILD_STORAGE_KEY = 'guild-master-current-guild-id';

interface GuildState {
  currentGuildId: string | null;
}

const initialState: GuildState = {
  currentGuildId: typeof window !== 'undefined' ? localStorage.getItem(GUILD_STORAGE_KEY) : null,
};

export const guildSlice = createSlice({
  name: 'guild',
  initialState,
  reducers: {
    setCurrentGuild: (state, action: PayloadAction<string>) => {
      state.currentGuildId = action.payload;
      localStorage.setItem(GUILD_STORAGE_KEY, action.payload);
    },
  },
});

export const { setCurrentGuild } = guildSlice.actions;
export const guildReducer = guildSlice.reducer;
```

- [ ] **Step 2: Register the slice in the store**

```typescript
// src/app/providers/StoreProvider/config/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { calendarReducer } from '@/entities/calendar';
import { eventsReducer } from '@/entities/event';
import { guildReducer } from '@/entities/guild/model/slice'; // New import

export const store = configureStore({
  reducer: {
    ui: calendarReducer,
    events: eventsReducer,
    guild: guildReducer, // Add this
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/entities/guild/model/slice.ts src/app/providers/StoreProvider/config/store.ts
git commit -m "feat: add guild redux slice with persistence"
```

---

### Task 2: Update Select Component Styling

**Files:**
- Modify: `src/shared/ui/Select/Select.module.css`

- [ ] **Step 4: Update styles to support avatars in items**

```css
/* src/shared/ui/Select/Select.module.css */
.item {
  /* ... existing styles ... */
  display: flex;
  align-items: center;
  gap: 8px;
}

.itemContent {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/Select/Select.module.css
git commit -m "style: update select component for avatar support"
```

---

### Task 3: Update CalendarGrid Header Layout

**Files:**
- Modify: `src/widgets/calendar/ui/CalendarGrid.module.css`
- Modify: `src/widgets/calendar/ui/CalendarGrid.tsx`

- [ ] **Step 6: Add separator and guild selector styles**

```css
/* src/widgets/calendar/ui/CalendarGrid.module.css */
.controlsLeft {
  display: flex;
  align-items: center;
  gap: 12px;
}

.separator {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.guildOption {
  display: flex;
  align-items: center;
  gap: 8px;
}

.guildAvatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}
```

- [ ] **Step 7: Implement Guild Selection logic in CalendarGrid**

```tsx
// src/widgets/calendar/ui/CalendarGrid.tsx
// ... imports ...
import { setCurrentGuild } from '@/entities/guild/model/slice';
import Image from 'next/image';

export const CalendarGrid: React.FC<{ guilds: any[] }> = ({ guilds }) => {
  const dispatch = useAppDispatch();
  const currentGuildId = useAppSelector((state) => state.guild.currentGuildId);
  
  // Use currentGuildId from Redux or fallback to first from props
  const activeGuildId = currentGuildId || guilds[0]?.id;

  useEffect(() => {
    if (activeGuildId) {
      dispatch(fetchEventsThunk(activeGuildId));
    }
  }, [dispatch, activeGuildId]);

  const handleGuildChange = (id: string) => {
    dispatch(setCurrentGuild(id));
  };

  const guildOptions = useMemo(() => guilds.map(g => ({
    value: g.id,
    label: (
      <div className={styles.guildOption}>
        <img 
          src="/assets/guild-placeholder.svg" 
          alt={g.name} 
          className={styles.guildAvatar}
        />
        <span>{g.name}</span>
      </div>
    )
  })), [guilds]);

  // ... update return JSX ...
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.controlsLeft}>
          <Select value={now.month().toString()} onValueChange={handleMonthChange} options={months} />
          <Select value={now.year().toString()} onValueChange={handleYearChange} options={years} />
          <div className={styles.separator} />
          <Select 
            value={activeGuildId} 
            onValueChange={handleGuildChange} 
            options={guildOptions} 
            placeholder="Выберите гильдию"
          />
        </div>
        {/* ... controlsRight ... */}
      </div>
      {/* ... grid ... */}
    </div>
  );
};
```

- [ ] **Step 8: Commit**

```bash
git add src/widgets/calendar/ui/CalendarGrid.tsx src/widgets/calendar/ui/CalendarGrid.module.css
git commit -m "feat: implement guild selection in CalendarGrid header"
```

---

### Task 4: Integration in Home Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 9: Pass guild list to CalendarGrid**

```tsx
// src/app/page.tsx
export default async function Home() {
  const guilds = await getMyGuilds();
  
  if (guilds.length === 0) {
    return <div>No guilds found</div>;
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{t('title')}</h1>
      <CalendarGrid guilds={guilds} /> {/* Pass full list instead of single ID */}
      <EventModal />
    </main>
  );
}
```

- [ ] **Step 10: Final verification and Commit**

Run: `npm run lint && npm run test:run`
Expected: PASS

```bash
git add src/app/page.tsx
git commit -m "feat: integrate guild list into Home page"
```
