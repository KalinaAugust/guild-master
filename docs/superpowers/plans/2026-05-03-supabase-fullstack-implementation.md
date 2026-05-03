# Supabase Fullstack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Guild Master into a fullstack application with Supabase Auth, PostgreSQL storage, and multi-guild support.

**Architecture:** Implement a robust data layer using Supabase client in the Shared layer, and update Entities (User, Guild, Event) to interact with the database. Use Row Level Security (RLS) for data isolation.

**Tech Stack:** Next.js 16, Supabase, PostgreSQL, TypeScript, FSD.

---

### Task 1: Supabase Infrastructure & Client

**Files:**
- Create: `.env.local`
- Create: `src/shared/api/supabase/client.ts`
- Create: `src/shared/api/supabase/server.ts`
- Create: `src/shared/api/supabase/types.ts`

- [ ] **Step 1: Install Supabase dependencies**
Run: `npm install @supabase/supabase-js @supabase/ssr`

- [ ] **Step 2: Create Supabase client for browser**
```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

- [ ] **Step 3: Create Supabase client for server**
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

export const createClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle middleware setting cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle middleware removing cookies
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Commit**
```bash
git add src/shared/api/supabase package.json
git commit -m "infra: setup supabase clients"
```

---

### Task 2: User Profiles Entity

**Files:**
- Create: `src/entities/user/index.ts`
- Create: `src/entities/user/model/types.ts`
- Create: `src/entities/user/api/getUser.ts`

- [ ] **Step 1: Define User Profile types**
```typescript
export interface UserProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}
```

- [ ] **Step 2: Implement server-side user fetcher**
```typescript
import { createClient } from '@/shared/api/supabase/server';

export const getUser = async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return { ...user, profile };
}
```

- [ ] **Step 3: Commit**
```bash
git add src/entities/user
git commit -m "entity: add user profile logic"
```

---

### Task 3: Guild Entity & Management

**Files:**
- Create: `src/entities/guild/model/types.ts`
- Create: `src/entities/guild/api/getGuilds.ts`
- Create: `src/features/create-guild/ui/CreateGuildModal.tsx`

- [ ] **Step 1: Define Guild types**
```typescript
export interface Guild {
  id: string;
  name: string;
  ownerId: string;
}
```

- [ ] **Step 2: Create server action to fetch guilds**
```typescript
'use server';
import { createClient } from '@/shared/api/supabase/server';

export const getMyGuilds = async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('guild_members')
    .select('guilds (*)')
    .eq('user_id', user.id);
    
  return data?.map(m => m.guilds) || [];
}
```

- [ ] **Step 3: Commit**
```bash
git add src/entities/guild src/features/create-guild
git commit -m "entity: add guild management logic"
```

---

### Task 4: Migrate Events to Supabase

**Files:**
- Modify: `src/entities/event/model/slice.ts` (remove hardcoded items)
- Create: `src/entities/event/api/getEvents.ts`
- Create: `src/entities/event/api/createEvent.ts`

- [ ] **Step 1: Implement fetchEvents from Supabase**
```typescript
import { createClient } from '@/shared/api/supabase/server';

export const fetchEvents = async (guildId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('guild_id', guildId);
    
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Update Redux Slice to handle async data**
Modify `src/entities/event/model/slice.ts` to clear initialState and add extraReducers for async thunks.

- [ ] **Step 3: Commit**
```bash
git add src/entities/event
git commit -m "feat: migrate events to supabase"
```

---

### Task 5: Auth UI & Protected Routes

**Files:**
- Create: `src/features/auth/ui/LoginForm.tsx`
- Create: `src/app/login/page.tsx`
- Modify: `src/app/layout.tsx` (add navbar with user profile)

- [ ] **Step 1: Create simple login form using Supabase Auth UI**
```typescript
'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/shared/api/supabase/client';

export const LoginForm = () => {
  const supabase = createClient();
  return <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={['google']} />;
}
```

- [ ] **Step 2: Add Auth protection in Layout or Middleware**
Create `src/middleware.ts` to redirect unauthenticated users to `/login`.

- [ ] **Step 3: Commit**
```bash
git add src/features/auth src/app/login src/middleware.ts
git commit -m "ui: add auth flow and protected routes"
```
