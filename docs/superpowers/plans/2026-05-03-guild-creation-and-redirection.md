# Guild Creation and Redirection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a redirection to a guild creation page if the user has no guilds, and fix the calendar to use a real guild ID.

**Architecture:** 
- Use Server Components to check for guild existence and redirect.
- Implement a server action or API for guild creation that handles both guild and membership creation.
- Pass the actual guild ID to the calendar widget.

**Tech Stack:** Next.js 16 (App Router), Supabase (SSR), Redux Toolkit.

---

### Task 1: Implement Guild Creation API

**Files:**
- Create: `src/entities/guild/api/createGuild.ts`
- Modify: `src/entities/guild/index.ts`

- [ ] **Step 1: Create `createGuild` API function**
Create a function that inserts a new guild into the `guilds` table and then inserts the creator into `guild_members` as an 'owner'.

```typescript
'use server';
import { createClient } from '@/shared/api/supabase/server';
import { Guild } from '../model/types';

export const createGuild = async (name: string, description?: string): Promise<Guild> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');

  // Insert guild
  const { data: guild, error: guildError } = await supabase
    .from('guilds')
    .insert({ name, description, ownerId: user.id })
    .select()
    .single();

  if (guildError) throw guildError;

  // Insert owner as member
  const { error: memberError } = await supabase
    .from('guild_members')
    .insert({ 
      guild_id: guild.id, 
      user_id: user.id, 
      role: 'owner' 
    });

  if (memberError) throw memberError;

  return guild as Guild;
}
```

- [ ] **Step 2: Export from index**
Update `src/entities/guild/index.ts`:
```typescript
export * from './model/types';
export * from './api/getGuilds';
export * from './api/createGuild';
```

- [ ] **Step 3: Commit**
```bash
git add src/entities/guild/api/createGuild.ts src/entities/guild/index.ts
git commit -m "feat(guild): add createGuild API"
```

### Task 2: Implement Create Guild Form Feature

**Files:**
- Create: `src/features/create-guild/ui/CreateGuildForm.tsx`
- Modify: `src/features/create-guild/index.ts`

- [ ] **Step 1: Create the form component**
Implement a simple form to collect guild name and description. Use `createGuild` action.

```tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGuild } from '@/entities/guild';

export const CreateGuildForm = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createGuild(name, description);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Failed to create guild:', error);
      alert('Ошибка при создании гильдии');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
      <div>
        <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Название гильдии</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', background: 'rgba(255,255,255,0.1)', color: 'inherit' }}
        />
      </div>
      <div>
        <label htmlFor="description" style={{ display: 'block', marginBottom: '5px' }}>Описание (необязательно)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', background: 'rgba(255,255,255,0.1)', color: 'inherit' }}
        />
      </div>
      <button 
        type="submit" 
        disabled={loading || !name}
        style={{ padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}
      >
        {loading ? 'Создание...' : 'Создать гильдию'}
      </button>
    </form>
  );
};
```

- [ ] **Step 2: Export from index**
Update `src/features/create-guild/index.ts`:
```typescript
export * from './ui/CreateGuildModal';
export * from './ui/CreateGuildForm';
```

- [ ] **Step 3: Commit**
```bash
git add src/features/create-guild/ui/CreateGuildForm.tsx src/features/create-guild/index.ts
git commit -m "feat(create-guild): add CreateGuildForm component"
```

### Task 3: Create Guild Creation Page

**Files:**
- Create: `src/app/guilds/create/page.tsx`

- [ ] **Step 1: Create the page**
```tsx
import { CreateGuildForm } from '@/features/create-guild';

export default function CreateGuildPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
      <h1 style={{ marginBottom: '20px' }}>Создание новой гильдии</h1>
      <p style={{ marginBottom: '30px', opacity: 0.8 }}>
        Похоже, вы еще не состоите ни в одной гильдии. Создайте свою, чтобы начать работу с календарем!
      </p>
      <CreateGuildForm />
    </main>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/guilds/create/page.tsx
git commit -m "feat(app): add guild creation page"
```

### Task 4: Implement Redirection Logic and Fix Calendar

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/widgets/calendar/ui/CalendarGrid.tsx`

- [ ] **Step 1: Update `src/app/page.tsx`**
Fetch guilds and redirect if none. Pass the first guild ID to `CalendarGrid`.

```tsx
import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { CalendarGrid } from '@/widgets/calendar';
import { CreateEventModal } from '@/features/create-event';

export default async function Home() {
  const guilds = await getMyGuilds();

  if (guilds.length === 0) {
    redirect('/guilds/create');
  }

  const currentGuildId = guilds[0].id;

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
      <h1 style={{ marginBottom: '20px' }}>Guild Master</h1>
      <CalendarGrid guildId={currentGuildId} />
      <CreateEventModal guildId={currentGuildId} />
    </main>
  );
}
```

- [ ] **Step 2: Update `src/widgets/calendar/ui/CalendarGrid.tsx`**
Accept `guildId` as a prop and use it in `useEffect`.

```tsx
// ... existing imports
export const CalendarGrid: React.FC<{ guildId: string }> = ({ guildId }) => {
  const dispatch = useAppDispatch();
  // ...
  
  useEffect(() => {
    dispatch(fetchEventsThunk(guildId));
  }, [dispatch, guildId]);

  // ... rest of the component
}
```

- [ ] **Step 3: Update `src/features/create-event/ui/CreateEventModal.tsx`**
Check if it needs `guildId` too.

- [ ] **Step 4: Commit**
```bash
git add src/app/page.tsx src/widgets/calendar/ui/CalendarGrid.tsx
git commit -m "feat: implement guild redirection and use real guildId"
```

### Task 5: Verification

- [ ] **Step 1: Verify redirection**
Logout and login with a user without a guild. Ensure they are redirected to `/guilds/create`.
- [ ] **Step 2: Verify guild creation**
Create a guild and ensure you are redirected to the home page with the calendar visible.
- [ ] **Step 3: Verify event fetching**
Ensure the calendar tries to fetch events for the new guild (even if empty).
