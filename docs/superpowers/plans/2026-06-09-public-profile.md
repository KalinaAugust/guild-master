# Public Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shareable public profile page at `/users/[id]` — avatar, name, joined date for everyone; guild/event counts for logged-in visitors only; email never shown.

**Architecture:** Server component reads `profiles` (RLS already allows public SELECT) and calls a new SECURITY DEFINER RPC `get_profile_stats` that returns only aggregates (counts are `null` for anonymous callers). Data access lives in `entities/user`, the page composes it. `src/proxy.ts` whitelists `/users/*` for unauthenticated visitors.

**Tech Stack:** Next.js 16 App Router (server components), Supabase (RPC via supabase-js), next-intl, CSS Modules, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-09-public-profile-design.md`

---

### Task 1: Database migration + Supabase types

**Files:**
- Modify: `src/shared/api/supabase/types.ts` (Functions section, ~line 625)

Migrations are applied via the Supabase MCP (`mcp__supabase__apply_migration`, project_id `uzmyvxpjsfobqkcepygh`) — this project does NOT use the Supabase CLI. Types are then hand-edited.

- [ ] **Step 1: Apply migration** with name `add_get_profile_stats_function`:

```sql
create or replace function public.get_profile_stats(profile_id uuid)
returns table (joined_at timestamptz, guilds_count bigint, events_count bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.created_at as joined_at,
    case when auth.uid() is null then null
         else (select count(*) from public.guild_members gm where gm.user_id = profile_id) end,
    case when auth.uid() is null then null
         else (select count(*) from public.events e
               where e.guild_id in (select gm.guild_id from public.guild_members gm where gm.user_id = profile_id)) end
  from auth.users u
  where u.id = profile_id
$$;

revoke all on function public.get_profile_stats(uuid) from public;
grant execute on function public.get_profile_stats(uuid) to anon, authenticated;
```

- [ ] **Step 2: Verify** via `mcp__supabase__execute_sql`:

```sql
select * from public.get_profile_stats((select id from public.profiles limit 1));
```

Expected: one row, `joined_at` is a timestamp, `guilds_count`/`events_count` are `null` (no `auth.uid()` in SQL editor context).

- [ ] **Step 3: Hand-add the RPC signature** to the `Functions` object in `src/shared/api/supabase/types.ts`, alphabetically before `has_guild_role`:

```ts
      get_profile_stats: {
        Args: { profile_id: string }
        Returns: {
          joined_at: string
          guilds_count: number | null
          events_count: number | null
        }[]
      }
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat(db): add get_profile_stats security definer function"
```

---

### Task 2: `getPublicProfile` data helper in `entities/user`

**Files:**
- Modify: `src/entities/user/model/types.ts`
- Create: `src/entities/user/api/getPublicProfile.ts`
- Test: `src/entities/user/api/getPublicProfile.test.ts`
- Modify: `src/entities/user/index.ts`

- [ ] **Step 1: Add the `PublicProfile` type** to `src/entities/user/model/types.ts` (append):

```ts
export interface PublicProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
  guildsCount: number | null;
  eventsCount: number | null;
}
```

- [ ] **Step 2: Write the failing test** `src/entities/user/api/getPublicProfile.test.ts` (mirrors `getUser.test.ts` mocking style):

```ts
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { getPublicProfile } from './getPublicProfile';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

function mockSupabase({ profile, profileError, stats, statsError }: {
  profile?: unknown;
  profileError?: unknown;
  stats?: unknown;
  statsError?: unknown;
}) {
  const supabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile ?? null, error: profileError ?? null }),
    rpc: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: stats ?? null, error: statsError ?? null }),
    }),
  };
  (createClient as MockedFunction<typeof createClient>).mockResolvedValue(
    supabase as unknown as Awaited<ReturnType<typeof createClient>>
  );
  return supabase;
}

describe('getPublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns null when the profile does not exist', async () => {
    mockSupabase({ profile: null });

    expect(await getPublicProfile('missing-id')).toBeNull();
  });

  it('returns null and logs when the profile query fails (e.g. invalid uuid)', async () => {
    mockSupabase({ profileError: { message: 'invalid input syntax for type uuid' } });

    expect(await getPublicProfile('not-a-uuid')).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('returns mapped profile with stats', async () => {
    const supabase = mockSupabase({
      profile: { id: 'user-1', full_name: 'John Doe', avatar_url: 'http://a/b.png' },
      stats: { joined_at: '2025-01-01T00:00:00Z', guilds_count: 3, events_count: 7 },
    });

    expect(await getPublicProfile('user-1')).toEqual({
      id: 'user-1',
      fullName: 'John Doe',
      avatarUrl: 'http://a/b.png',
      joinedAt: '2025-01-01T00:00:00Z',
      guildsCount: 3,
      eventsCount: 7,
    });
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase.rpc).toHaveBeenCalledWith('get_profile_stats', { profile_id: 'user-1' });
  });

  it('returns profile with null stats when the RPC fails', async () => {
    mockSupabase({
      profile: { id: 'user-1', full_name: 'John Doe', avatar_url: null },
      statsError: { message: 'boom' },
    });

    expect(await getPublicProfile('user-1')).toEqual({
      id: 'user-1',
      fullName: 'John Doe',
      avatarUrl: null,
      joinedAt: null,
      guildsCount: null,
      eventsCount: null,
    });
    expect(console.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `pnpm test:run src/entities/user/api/getPublicProfile.test.ts`
Expected: FAIL — `getPublicProfile` module not found.

- [ ] **Step 4: Implement** `src/entities/user/api/getPublicProfile.ts`:

```ts
import { cache } from 'react';
import { createClient } from '@/shared/api/supabase/server';
import { PublicProfile } from '../model/types';

export const getPublicProfile = cache(
  async (profileId: string): Promise<PublicProfile | null> => {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', profileId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching public profile:', error);
      return null;
    }
    if (!profile) return null;

    const { data: stats, error: statsError } = await supabase
      .rpc('get_profile_stats', { profile_id: profileId })
      .maybeSingle();

    if (statsError) {
      console.error('Error fetching profile stats:', statsError);
    }

    return {
      id: profile.id,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      joinedAt: stats?.joined_at ?? null,
      guildsCount: stats?.guilds_count ?? null,
      eventsCount: stats?.events_count ?? null,
    };
  }
);
```

`cache()` deduplicates the double call from `generateMetadata` + page render (same pattern as `getUser.ts`). An invalid (non-uuid) id surfaces as a Postgres error on the profile query → logged, `null` returned → page 404s.

- [ ] **Step 5: Run the test, verify it passes**

Run: `pnpm test:run src/entities/user/api/getPublicProfile.test.ts`
Expected: 4 passed.

- [ ] **Step 6: Export from the barrel** — in `src/entities/user/index.ts` add:

```ts
export { getPublicProfile } from './api/getPublicProfile';
```

- [ ] **Step 7: Commit**

```bash
git add src/entities/user
git commit -m "feat(user): add getPublicProfile data helper"
```

---

### Task 3: `xl` size for shared `UserAvatar`

**Files:**
- Modify: `src/shared/ui/UserAvatar/UserAvatar.tsx`
- Modify: `src/shared/ui/UserAvatar/UserAvatar.module.css`

The largest existing size is 40px — too small for a profile header. Add a 96px `xl`.

- [ ] **Step 1: In `UserAvatar.tsx`** extend the icon map and the size prop:

```ts
const iconSizes: Record<string, number> = { sm: 14, md: 18, lg: 22, xl: 40 };
```

```ts
  size?: 'sm' | 'md' | 'lg' | 'xl';
```

- [ ] **Step 2: In `UserAvatar.module.css`** append after `.size_lg`:

```css
.size_xl {
  width: 96px;
  height: 96px;
  font-size: 32px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/UserAvatar
git commit -m "feat(ui): add xl size to UserAvatar"
```

---

### Task 4: i18n messages

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add a `PublicProfile` namespace** (top-level key, keep alphabetical-ish placement near other page namespaces).

`messages/en.json`:

```json
  "PublicProfile": {
    "joined": "Joined",
    "statistics": "Statistics",
    "guilds": "Guilds",
    "events": "Events"
  }
```

`messages/ru.json`:

```json
  "PublicProfile": {
    "joined": "Дата регистрации",
    "statistics": "Статистика",
    "guilds": "Гильдии",
    "events": "События"
  }
```

- [ ] **Step 2: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat(i18n): add PublicProfile translations"
```

---

### Task 5: Public profile page `/users/[id]`

**Files:**
- Create: `src/app/users/[id]/page.tsx`
- Create: `src/app/users/[id]/PublicProfilePage.module.css`

- [ ] **Step 1: Create `src/app/users/[id]/page.tsx`** (server component; `params` is a Promise in Next 16 — same pattern as `src/app/events/[id]/page.tsx`):

```tsx
import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { Calendar } from 'lucide-react';
import { getPublicProfile } from '@/entities/user';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import styles from './PublicProfilePage.module.css';

interface PublicProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  const name = profile?.fullName;
  return { title: name ? `${name} — Guild Master` : 'Guild Master' };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) notFound();

  const t = await getTranslations('PublicProfile');
  const locale = await getLocale();
  const showStats = profile.guildsCount !== null && profile.eventsCount !== null;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <UserAvatar avatarUrl={profile.avatarUrl} name={profile.fullName} size="xl" />
          <h1 className={styles.name}>{profile.fullName || 'Guild Master user'}</h1>
        </div>

        {profile.joinedAt && (
          <div className={styles.infoItem}>
            <Calendar className={styles.icon} size={20} />
            <div>
              <label>{t('joined')}</label>
              <p>{new Date(profile.joinedAt).toLocaleDateString(locale)}</p>
            </div>
          </div>
        )}

        {showStats && (
          <div className={styles.statsSection}>
            <h2>{t('statistics')}</h2>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{profile.guildsCount}</span>
                <span className={styles.statLabel}>{t('guilds')}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{profile.eventsCount}</span>
                <span className={styles.statLabel}>{t('events')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/users/[id]/PublicProfilePage.module.css`** — same glassmorphism card language as `ProfilePage.module.css` (reuse its `--glass-*` / accent variables; consult `docs/design-system.md`):

```css
.container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem;
  min-height: calc(100vh - var(--header-height));
}

.card {
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 2.5rem;
  width: 100%;
  max-width: 600px;
  box-shadow: var(--shadow-glass);
}

.header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.name {
  margin: 0;
  font-size: 1.75rem;
  background: linear-gradient(to right, #fff, var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.infoItem {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 2rem;
}

.infoItem label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.infoItem p {
  margin: 0.15rem 0 0;
  color: var(--text-primary);
}

.icon {
  color: var(--accent-secondary);
  flex-shrink: 0;
}

.statsSection h2 {
  font-size: 1.1rem;
  margin: 0 0 1rem;
  color: var(--text-primary);
}

.statsRow {
  display: flex;
  gap: 1rem;
}

.statCard {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.statValue {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--accent-secondary);
}

.statLabel {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
```

Before finalizing, cross-check variable names (`--glass-bg`, `--shadow-glass`, `--text-secondary`, `--accent-secondary`, `--header-height`) against `src/app/globals.css` — they are used by `ProfilePage.module.css`, but verify all exist.

- [ ] **Step 3: Smoke-check it compiles**

Run: `pnpm build`
Expected: build succeeds; `/users/[id]` listed as dynamic route.

- [ ] **Step 4: Commit**

```bash
git add "src/app/users"
git commit -m "feat(profile): add public profile page at /users/[id]"
```

---

### Task 6: Allow anonymous access to `/users/*` in `src/proxy.ts`

**Files:**
- Modify: `src/proxy.ts:44-51`

- [ ] **Step 1: Add the route check** next to the existing guild-detail exemption:

```ts
  const isGuildDetailPage = request.nextUrl.pathname.match(/^\/guilds\/[^/]+/) !== null;
  const isPublicProfilePage = request.nextUrl.pathname.match(/^\/users\/[^/]+/) !== null;

  if (!user && !isLoginPage && !isAuthCallback && !isGuildDetailPage && !isPublicProfilePage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(proxy): allow anonymous access to public profile pages"
```

---

### Task 7: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `pnpm test:run`
Expected: all tests pass.

- [ ] **Step 2: Lint + FSD check**

Run: `pnpm lint && pnpm lint:fsd`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `pnpm build`
Expected: success.

Do NOT launch the browser to verify — the user checks UI changes himself.
