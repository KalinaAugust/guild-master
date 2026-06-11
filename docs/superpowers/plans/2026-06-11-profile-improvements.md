# Profile Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the user profile with alias, icon, about, interests, socials, per-field privacy, and a common-guilds block, plus an owner settings panel — in the dark glassmorphism theme.

**Architecture:** All new data lives on the `profiles` table (Variant 1), privacy stored as a JSONB map. Field visibility is computed server-side from the viewer's relationship to the profile (self / guildmate / public). A new `update-profile-settings` feature provides the settings dialog (RTK Query mutation → `PATCH /api/profile`). A shared `resolveDisplayName` helper drives the alias toggle app-wide.

**Tech Stack:** Next.js 16 (App Router), React 19, Redux Toolkit + RTK Query, Supabase (RLS), CSS Modules, Radix UI, lucide-react, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-11-profile-improvements-design.md`

**Conventions:** `pnpm test:run <path>` runs a single test file once. Commit after each task. All new strings are user-facing English; CSS Modules only, no inline styles.

---

## File Structure

**Database**
- Migration (Supabase MCP): add columns to `profiles`.
- Modify: `src/shared/api/supabase/types.ts` — extend `profiles` Row/Insert/Update.

**entities/user**
- Create: `src/entities/user/config/socials.ts` — platform list + metadata.
- Create: `src/entities/user/config/icons.ts` — curated lucide icon allow-list.
- Modify: `src/entities/user/model/types.ts` — privacy/social/display types.
- Create: `src/entities/user/lib/visibility.ts` (+ `.test.ts`) — relationship/`canSee`/privacy defaults.
- Create: `src/entities/user/lib/resolveDisplayName.ts` (+ `.test.ts`).
- Modify: `src/entities/user/api/getPublicProfile.ts` (+ `.test.ts`) — fetch new columns, apply visibility.
- Modify: `src/entities/user/index.ts` — barrel exports.

**entities/guild**
- Create: `src/entities/guild/api/getCommonGuilds.ts` (+ `.test.ts`).
- Modify: `src/entities/guild/index.ts` — export `getCommonGuilds`.

**features/update-profile-settings** (new)
- Create: `src/features/update-profile-settings/api/profileSettingsApi.ts`.
- Create: `src/features/update-profile-settings/model/types.ts` — settings payload + validation helpers (+ `.test.ts`).
- Create: `src/features/update-profile-settings/ui/ProfileSettingsDialog/ProfileSettingsDialog.tsx` (+ `.module.css`, `index.ts`).
- Create: `src/features/update-profile-settings/ui/PrivacySelector/PrivacySelector.tsx` (+ `.module.css`, `index.ts`).
- Create: `src/features/update-profile-settings/ui/IconPicker/IconPicker.tsx` (+ `.module.css`, `index.ts`).
- Create: `src/features/update-profile-settings/index.ts`.

**Transport**
- Create: `src/app/api/profile/route.ts` — `PATCH` own profile.

**App / pages**
- Modify: `src/app/profile/[publicId]/page.tsx` — compose public view, pass viewer id.
- Modify: `src/app/profile/[publicId]/OwnProfile.tsx` — own view + settings entry point.
- Create: `src/app/profile/[publicId]/ProfileBlocks.tsx` (+ `.module.css`) — shared block components (About/Interests/Socials/CommonGuilds/Stats/Header).
- Modify: `src/app/profile/[publicId]/PublicProfilePage.module.css`, `OwnProfile.module.css`.

**App-wide alias**
- Modify: `src/entities/guild/api/getGuildMembers.ts` + `model/types.ts` — carry alias fields; apply `resolveDisplayName`.
- Modify: `src/widgets/header` display name source.

**i18n**
- Modify: `messages/en.json` + `messages/ru.json` — `PublicProfile` / `ProfileSettings` keys.

---

## Task 1: Database migration + generated types

**Files:**
- Migration via Supabase MCP `apply_migration`
- Modify: `src/shared/api/supabase/types.ts:589` (profiles block)

- [ ] **Step 1: Apply migration**

Use the Supabase MCP `apply_migration` tool, name `add_profile_fields`, with SQL:

```sql
alter table public.profiles
  add column if not exists alias text,
  add column if not exists display_as_alias boolean not null default false,
  add column if not exists icon text,
  add column if not exists about text,
  add column if not exists interests text[] not null default '{}',
  add column if not exists socials jsonb not null default '[]'::jsonb,
  add column if not exists privacy jsonb not null default '{}'::jsonb;
```

- [ ] **Step 2: Verify columns exist**

Use Supabase MCP `list_tables` (schema `public`) and confirm `profiles` now lists `alias, display_as_alias, icon, about, interests, socials, privacy`.

- [ ] **Step 3: Hand-edit generated types**

In `src/shared/api/supabase/types.ts`, add to the `profiles` `Row`, `Insert`, and `Update` objects (Row shown; Insert/Update mirror it with `?` optional and the same types — `display_as_alias` stays required-with-default so use `boolean` in Row, `boolean?` in Insert/Update; arrays default so optional in Insert/Update):

```ts
// Row additions:
alias: string | null
display_as_alias: boolean
icon: string | null
about: string | null
interests: string[]
socials: Json
privacy: Json
```

```ts
// Insert & Update additions (all optional):
alias?: string | null
display_as_alias?: boolean
icon?: string | null
about?: string | null
interests?: string[]
socials?: Json
privacy?: Json
```

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: PASS (no new errors from the types file).

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat(profile): add profile fields columns + generated types"
```

---

## Task 2: Config — socials + icon allow-lists

**Files:**
- Create: `src/entities/user/config/socials.ts`
- Create: `src/entities/user/config/icons.ts`

- [ ] **Step 1: Create socials config**

`src/entities/user/config/socials.ts`:

```ts
export const SOCIAL_PLATFORMS = [
  'discord',
  'steam',
  'twitch',
  'telegram',
  'twitter',
  'youtube',
  'battlenet',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_META: Record<SocialPlatform, { label: string }> = {
  discord: { label: 'Discord' },
  steam: { label: 'Steam' },
  twitch: { label: 'Twitch' },
  telegram: { label: 'Telegram' },
  twitter: { label: 'Twitter / X' },
  youtube: { label: 'YouTube' },
  battlenet: { label: 'Battle.net' },
};

export const isSocialPlatform = (v: unknown): v is SocialPlatform =>
  typeof v === 'string' && (SOCIAL_PLATFORMS as readonly string[]).includes(v);
```

- [ ] **Step 2: Create icons config**

`src/entities/user/config/icons.ts` (names must be valid `lucide-react` exports):

```ts
export const PROFILE_ICONS = [
  'Sword',
  'Shield',
  'Crown',
  'Gamepad2',
  'Skull',
  'Heart',
  'Star',
  'Zap',
  'Flame',
  'Sparkles',
  'Ghost',
  'Rocket',
] as const;

export type ProfileIcon = (typeof PROFILE_ICONS)[number];

export const isProfileIcon = (v: unknown): v is ProfileIcon =>
  typeof v === 'string' && (PROFILE_ICONS as readonly string[]).includes(v);
```

- [ ] **Step 3: Commit**

```bash
git add src/entities/user/config
git commit -m "feat(profile): add socials + profile-icon config"
```

---

## Task 3: Profile types

**Files:**
- Modify: `src/entities/user/model/types.ts`

- [ ] **Step 1: Add types**

Append to `src/entities/user/model/types.ts`:

```ts
import type { SocialPlatform } from '../config/socials';

export type PrivacyLevel = 'private' | 'guildmates' | 'public';

export type PrivacyField =
  | 'name'
  | 'alias'
  | 'about'
  | 'interests'
  | 'socials'
  | 'joined'
  | 'stats'
  | 'common_guilds';

export type ProfilePrivacy = Partial<Record<PrivacyField, PrivacyLevel>>;

export type ViewerRelationship = 'self' | 'guildmate' | 'public';

export interface SocialLink {
  platform: SocialPlatform;
  value: string;
}

export interface CommonGuild {
  id: string;
  name: string;
  avatarUrl: string | null;
}
```

- [ ] **Step 2: Replace the `PublicProfile` interface**

Replace the existing `PublicProfile` interface (lines 15-22) with:

```ts
export interface PublicProfile {
  id: string;
  publicId: string;
  relationship: ViewerRelationship;
  /** Resolved display name (alias when toggle on, else full_name). Always present. */
  displayName: string | null;
  /** lucide icon name shown after the name. No privacy. */
  icon: string | null;
  avatarUrl: string | null;
  // Fields below are present only when visible to the viewer:
  realName?: string | null;
  alias?: string | null;
  about?: string | null;
  interests?: string[];
  socials?: SocialLink[];
  joinedAt?: string | null;
  guildsCount?: number | null;
  eventsCount?: number | null;
  commonGuilds?: CommonGuild[];
}
```

- [ ] **Step 3: Extend `UserProfile`**

Replace the `UserProfile` interface (lines 1-7) with:

```ts
export interface UserProfile {
  id: string;
  publicId: string;
  fullName: string | null;
  avatarUrl: string | null;
  lastActiveGuildId?: string | null;
  alias?: string | null;
  displayAsAlias?: boolean;
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: errors only in `getPublicProfile.ts` / `page.tsx` (they consume the old shape) — those are fixed in later tasks. No errors in `types.ts` itself.

- [ ] **Step 5: Commit**

```bash
git add src/entities/user/model/types.ts
git commit -m "feat(profile): extend user profile types with privacy + socials"
```

---

## Task 4: Visibility helpers (TDD)

**Files:**
- Create: `src/entities/user/lib/visibility.ts`
- Test: `src/entities/user/lib/visibility.test.ts`

- [ ] **Step 1: Write the failing test**

`src/entities/user/lib/visibility.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canSee, resolvePrivacy, DEFAULT_PRIVACY } from './visibility';

describe('canSee', () => {
  it('self sees everything regardless of level', () => {
    expect(canSee('private', 'self')).toBe(true);
    expect(canSee('guildmates', 'self')).toBe(true);
    expect(canSee('public', 'self')).toBe(true);
  });

  it('public level is visible to everyone', () => {
    expect(canSee('public', 'guildmate')).toBe(true);
    expect(canSee('public', 'public')).toBe(true);
  });

  it('guildmates level is visible only to self and guildmates', () => {
    expect(canSee('guildmates', 'guildmate')).toBe(true);
    expect(canSee('guildmates', 'public')).toBe(false);
  });

  it('private level is visible only to self', () => {
    expect(canSee('private', 'guildmate')).toBe(false);
    expect(canSee('private', 'public')).toBe(false);
  });
});

describe('resolvePrivacy', () => {
  it('fills missing fields with defaults', () => {
    expect(resolvePrivacy({ about: 'private' })).toEqual({
      ...DEFAULT_PRIVACY,
      about: 'private',
    });
  });

  it('ignores unknown values and falls back to default for that field', () => {
    expect(resolvePrivacy({ name: 'nonsense' as never }).name).toBe(DEFAULT_PRIVACY.name);
  });

  it('returns defaults for null/undefined input', () => {
    expect(resolvePrivacy(null)).toEqual(DEFAULT_PRIVACY);
    expect(resolvePrivacy(undefined)).toEqual(DEFAULT_PRIVACY);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/entities/user/lib/visibility.test.ts`
Expected: FAIL — cannot resolve `./visibility`.

- [ ] **Step 3: Implement**

`src/entities/user/lib/visibility.ts`:

```ts
import type {
  PrivacyField,
  PrivacyLevel,
  ProfilePrivacy,
  ViewerRelationship,
} from '../model/types';

export const DEFAULT_PRIVACY: Required<ProfilePrivacy> = {
  name: 'guildmates',
  alias: 'public',
  about: 'public',
  interests: 'public',
  socials: 'guildmates',
  joined: 'public',
  stats: 'public',
  common_guilds: 'guildmates',
};

const LEVELS: readonly PrivacyLevel[] = ['private', 'guildmates', 'public'];

export function canSee(level: PrivacyLevel, relationship: ViewerRelationship): boolean {
  if (relationship === 'self') return true;
  if (level === 'public') return true;
  if (level === 'guildmates') return relationship === 'guildmate';
  return false;
}

export function resolvePrivacy(raw: ProfilePrivacy | null | undefined): Required<ProfilePrivacy> {
  const result = { ...DEFAULT_PRIVACY };
  if (!raw || typeof raw !== 'object') return result;
  for (const key of Object.keys(DEFAULT_PRIVACY) as PrivacyField[]) {
    const value = raw[key];
    if (value && LEVELS.includes(value)) result[key] = value;
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/entities/user/lib/visibility.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/user/lib/visibility.ts src/entities/user/lib/visibility.test.ts
git commit -m "feat(profile): add field visibility helpers"
```

---

## Task 5: resolveDisplayName (TDD)

**Files:**
- Create: `src/entities/user/lib/resolveDisplayName.ts`
- Test: `src/entities/user/lib/resolveDisplayName.test.ts`

- [ ] **Step 1: Write the failing test**

`src/entities/user/lib/resolveDisplayName.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveDisplayName } from './resolveDisplayName';

describe('resolveDisplayName', () => {
  it('returns alias when toggle on and alias present', () => {
    expect(resolveDisplayName({ fullName: 'Denis K', alias: 'Elias', displayAsAlias: true }))
      .toBe('Elias');
  });

  it('returns fullName when toggle off', () => {
    expect(resolveDisplayName({ fullName: 'Denis K', alias: 'Elias', displayAsAlias: false }))
      .toBe('Denis K');
  });

  it('falls back to fullName when toggle on but alias empty', () => {
    expect(resolveDisplayName({ fullName: 'Denis K', alias: null, displayAsAlias: true }))
      .toBe('Denis K');
  });

  it('returns null when nothing usable', () => {
    expect(resolveDisplayName({ fullName: null, alias: null, displayAsAlias: false })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/entities/user/lib/resolveDisplayName.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement**

`src/entities/user/lib/resolveDisplayName.ts`:

```ts
export interface DisplayNameInput {
  fullName: string | null;
  alias: string | null;
  displayAsAlias: boolean | null | undefined;
}

export function resolveDisplayName({ fullName, alias, displayAsAlias }: DisplayNameInput): string | null {
  if (displayAsAlias && alias && alias.trim()) return alias;
  return fullName;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/entities/user/lib/resolveDisplayName.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/user/lib/resolveDisplayName.ts src/entities/user/lib/resolveDisplayName.test.ts
git commit -m "feat(profile): add resolveDisplayName helper"
```

---

## Task 6: getCommonGuilds (TDD)

**Files:**
- Create: `src/entities/guild/api/getCommonGuilds.ts`
- Test: `src/entities/guild/api/getCommonGuilds.test.ts`

- [ ] **Step 1: Write the failing test**

`src/entities/guild/api/getCommonGuilds.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { getCommonGuilds } from './getCommonGuilds';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({ createClient: vi.fn() }));

function mockSupabase(rows: unknown, error: unknown = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: rows, error }),
  };
  const supabase = { from: vi.fn().mockReturnValue(builder) };
  (createClient as MockedFunction<typeof createClient>).mockResolvedValue(
    supabase as unknown as Awaited<ReturnType<typeof createClient>>,
  );
  return { supabase, builder };
}

describe('getCommonGuilds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns empty array when there is no viewer', async () => {
    expect(await getCommonGuilds(undefined, 'owner-1')).toEqual([]);
  });

  it('returns empty array when viewer is the owner', async () => {
    expect(await getCommonGuilds('owner-1', 'owner-1')).toEqual([]);
  });

  it('returns guilds shared by both users', async () => {
    // First call: viewer guild ids. Second call: owner membership filtered to those ids.
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn(),
    };
    builder.eq
      .mockReturnValueOnce(Promise.resolve({ data: [{ guild_id: 'g1' }, { guild_id: 'g2' }], error: null }))
      .mockReturnThis();
    builder.in.mockResolvedValue({
      data: [{ guilds: { id: 'g2', name: 'Night Owls', avatar_url: null } }],
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(builder) };
    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    expect(await getCommonGuilds('viewer-1', 'owner-1')).toEqual([
      { id: 'g2', name: 'Night Owls', avatarUrl: null },
    ]);
  });

  it('returns empty array when viewer has no guilds', async () => {
    const { builder } = mockSupabase(null);
    builder.eq.mockResolvedValueOnce({ data: [], error: null });
    expect(await getCommonGuilds('viewer-1', 'owner-1')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/entities/guild/api/getCommonGuilds.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/entities/guild/api/getCommonGuilds.ts`:

```ts
'use server';
import { createClient } from '@/shared/api/supabase/server';
import type { CommonGuild } from '@/entities/user/model/types';

export const getCommonGuilds = async (
  viewerId: string | undefined,
  ownerId: string,
): Promise<CommonGuild[]> => {
  if (!viewerId || viewerId === ownerId) return [];

  const supabase = await createClient();

  const { data: viewerRows, error: viewerError } = await supabase
    .from('guild_members')
    .select('guild_id')
    .eq('user_id', viewerId);

  if (viewerError || !viewerRows || viewerRows.length === 0) {
    if (viewerError) console.error('Error fetching viewer guilds:', viewerError);
    return [];
  }

  const viewerGuildIds = viewerRows.map((r) => r.guild_id);

  const { data, error } = await supabase
    .from('guild_members')
    .select('guilds (id, name, avatar_url)')
    .eq('user_id', ownerId)
    .in('guild_id', viewerGuildIds);

  if (error || !data) {
    console.error('Error fetching common guilds:', error);
    return [];
  }

  return data.reduce<CommonGuild[]>((acc, row) => {
    const g = row.guilds as unknown as { id: string; name: string; avatar_url: string | null } | null;
    if (g) acc.push({ id: g.id, name: g.name, avatarUrl: g.avatar_url });
    return acc;
  }, []);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/entities/guild/api/getCommonGuilds.test.ts`
Expected: PASS.

- [ ] **Step 5: Export + commit**

Add to `src/entities/guild/index.ts`:

```ts
export { getCommonGuilds } from './api/getCommonGuilds';
```

```bash
git add src/entities/guild/api/getCommonGuilds.ts src/entities/guild/api/getCommonGuilds.test.ts src/entities/guild/index.ts
git commit -m "feat(profile): add getCommonGuilds query"
```

---

## Task 7: getPublicProfile — fetch new fields + apply visibility (TDD)

> **REVISED (FSD correction):** `entities/user` must NOT import `entities/guild`
> (same-layer cross-import → `fsd/forbidden-imports`). Cross-entity composition
> moves to the **app layer** (Task 15). `CommonGuild` now lives in `shared/types`
> and a `RawProfile` type was added to `entities/user/model/types.ts`.
>
> This task is split:
> - **Task 7** — `getPublicProfile(publicId)` returns `RawProfile | null` (profile
>   row + stats + resolved `displayName`). No viewer/guild logic, no privacy filtering.
> - **Task 7B** — pure `buildVisibleProfile(raw, relationship, commonGuilds)` →
>   `PublicProfile` in `entities/user/lib/` (applies `resolvePrivacy` + `canSee`).
> - **Task 15** — the page calls `getPublicProfile` → `getCommonGuilds` (guild) →
>   derives relationship → `buildVisibleProfile`.
>
> The original code blocks below are superseded; follow the controller's dispatch
> prompts for Tasks 7, 7B, 15.

**Files:**
- Modify: `src/entities/user/api/getPublicProfile.ts`
- Modify: `src/entities/user/api/getPublicProfile.test.ts`

- [ ] **Step 1: Rewrite the test**

Replace `src/entities/user/api/getPublicProfile.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { getPublicProfile } from './getPublicProfile';
import { createClient } from '@/shared/api/supabase/server';
import { getCommonGuilds } from '@/entities/guild/api/getCommonGuilds';

vi.mock('@/shared/api/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/entities/guild/api/getCommonGuilds', () => ({ getCommonGuilds: vi.fn() }));

const FULL_PROFILE = {
  id: 'user-1',
  public_id: 'a1B2c3D4',
  full_name: 'John Doe',
  avatar_url: 'http://a/b.png',
  alias: 'Johnny',
  display_as_alias: false,
  icon: 'Sword',
  about: 'Hello',
  interests: ['raids'],
  socials: [{ platform: 'discord', value: 'john#1' }],
  privacy: {},
};

function mockSupabase({ profile, stats }: { profile?: unknown; stats?: unknown }) {
  const supabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile ?? null, error: null }),
    rpc: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: stats ?? null, error: null }),
    }),
  };
  (createClient as MockedFunction<typeof createClient>).mockResolvedValue(
    supabase as unknown as Awaited<ReturnType<typeof createClient>>,
  );
  return supabase;
}

describe('getPublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (getCommonGuilds as MockedFunction<typeof getCommonGuilds>).mockResolvedValue([]);
  });

  it('returns null when the profile does not exist', async () => {
    mockSupabase({ profile: null });
    expect(await getPublicProfile('missing')).toBeNull();
  });

  it('anonymous viewer sees only public fields (defaults)', async () => {
    mockSupabase({ profile: FULL_PROFILE, stats: { joined_at: '2025-01-01', guilds_count: 3, events_count: 7 } });
    const result = await getPublicProfile('a1B2c3D4');
    expect(result).toMatchObject({
      id: 'user-1',
      relationship: 'public',
      displayName: 'John Doe',
      icon: 'Sword',
      about: 'Hello',
      interests: ['raids'],
      joinedAt: '2025-01-01',
      guildsCount: 3,
      eventsCount: 7,
    });
    // name(guildmates), socials(guildmates), common_guilds(guildmates) hidden:
    expect(result).not.toHaveProperty('realName');
    expect(result).not.toHaveProperty('socials');
    expect(result).not.toHaveProperty('commonGuilds');
  });

  it('self sees every field', async () => {
    mockSupabase({ profile: FULL_PROFILE, stats: { joined_at: '2025-01-01', guilds_count: 3, events_count: 7 } });
    const result = await getPublicProfile('a1B2c3D4', 'user-1');
    expect(result).toMatchObject({
      relationship: 'self',
      realName: 'John Doe',
      socials: [{ platform: 'discord', value: 'john#1' }],
    });
  });

  it('guildmate sees guildmates-level fields and common guilds', async () => {
    mockSupabase({ profile: FULL_PROFILE, stats: { joined_at: '2025-01-01', guilds_count: 3, events_count: 7 } });
    (getCommonGuilds as MockedFunction<typeof getCommonGuilds>).mockResolvedValue([
      { id: 'g1', name: 'Night Owls', avatarUrl: null },
    ]);
    const result = await getPublicProfile('a1B2c3D4', 'viewer-2');
    expect(result).toMatchObject({
      relationship: 'guildmate',
      realName: 'John Doe',
      socials: [{ platform: 'discord', value: 'john#1' }],
      commonGuilds: [{ id: 'g1', name: 'Night Owls', avatarUrl: null }],
    });
  });

  it('uses alias as displayName when display_as_alias is true', async () => {
    mockSupabase({ profile: { ...FULL_PROFILE, display_as_alias: true }, stats: null });
    const result = await getPublicProfile('a1B2c3D4');
    expect(result?.displayName).toBe('Johnny');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/entities/user/api/getPublicProfile.test.ts`
Expected: FAIL (shape mismatch / missing relationship).

- [ ] **Step 3: Rewrite the implementation**

Replace `src/entities/user/api/getPublicProfile.ts` with:

```ts
import { cache } from 'react';
import { createClient } from '@/shared/api/supabase/server';
import { getCommonGuilds } from '@/entities/guild/api/getCommonGuilds';
import { PublicProfile, ViewerRelationship } from '../model/types';
import { canSee, resolvePrivacy } from '../lib/visibility';
import { resolveDisplayName } from '../lib/resolveDisplayName';

export const getPublicProfile = cache(
  async (publicId: string, viewerId?: string): Promise<PublicProfile | null> => {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        'id, public_id, full_name, avatar_url, alias, display_as_alias, icon, about, interests, socials, privacy',
      )
      .eq('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching public profile:', error);
      return null;
    }
    if (!profile) return null;

    const commonGuilds =
      viewerId && viewerId !== profile.id ? await getCommonGuilds(viewerId, profile.id) : [];

    const relationship: ViewerRelationship =
      viewerId === profile.id ? 'self' : commonGuilds.length > 0 ? 'guildmate' : 'public';

    const privacy = resolvePrivacy(profile.privacy as Parameters<typeof resolvePrivacy>[0]);

    const { data: stats, error: statsError } = await supabase
      .rpc('get_profile_stats', { profile_id: profile.id })
      .maybeSingle();
    if (statsError) console.error('Error fetching profile stats:', statsError);

    const result: PublicProfile = {
      id: profile.id,
      publicId: profile.public_id,
      relationship,
      displayName: resolveDisplayName({
        fullName: profile.full_name,
        alias: profile.alias,
        displayAsAlias: profile.display_as_alias,
      }),
      icon: profile.icon,
      avatarUrl: profile.avatar_url,
    };

    if (canSee(privacy.name, relationship)) result.realName = profile.full_name;
    if (canSee(privacy.alias, relationship)) result.alias = profile.alias;
    if (canSee(privacy.about, relationship)) result.about = profile.about;
    if (canSee(privacy.interests, relationship)) result.interests = profile.interests ?? [];
    if (canSee(privacy.socials, relationship)) {
      result.socials = (profile.socials as PublicProfile['socials']) ?? [];
    }
    if (canSee(privacy.joined, relationship)) result.joinedAt = stats?.joined_at ?? null;
    if (canSee(privacy.stats, relationship)) {
      result.guildsCount = stats?.guilds_count ?? null;
      result.eventsCount = stats?.events_count ?? null;
    }
    if (relationship !== 'self' && canSee(privacy.common_guilds, relationship)) {
      result.commonGuilds = commonGuilds;
    }

    return result;
  },
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/entities/user/api/getPublicProfile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/user/api/getPublicProfile.ts src/entities/user/api/getPublicProfile.test.ts
git commit -m "feat(profile): fetch new fields and apply per-field visibility"
```

---

## Task 8: Settings payload types + validation (TDD)

**Files:**
- Create: `src/features/update-profile-settings/model/types.ts`
- Test: `src/features/update-profile-settings/model/types.test.ts`

- [ ] **Step 1: Write the failing test**

`src/features/update-profile-settings/model/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sanitizeSettings, ABOUT_MAX, INTERESTS_MAX } from './types';

describe('sanitizeSettings', () => {
  it('trims and caps about length', () => {
    const out = sanitizeSettings({ about: '  ' + 'x'.repeat(ABOUT_MAX + 50) + '  ' });
    expect(out.about?.length).toBe(ABOUT_MAX);
  });

  it('caps interests count and drops empties', () => {
    const out = sanitizeSettings({
      interests: ['a', '', '  ', ...Array(INTERESTS_MAX + 5).fill('tag')],
    });
    expect(out.interests?.length).toBe(INTERESTS_MAX);
  });

  it('drops socials with unknown platform or empty value', () => {
    const out = sanitizeSettings({
      socials: [
        { platform: 'discord', value: 'john' },
        { platform: 'myspace', value: 'x' },
        { platform: 'steam', value: '' },
      ] as never,
    });
    expect(out.socials).toEqual([{ platform: 'discord', value: 'john' }]);
  });

  it('drops unknown icon and keeps valid one', () => {
    expect(sanitizeSettings({ icon: 'NotAnIcon' }).icon).toBeNull();
    expect(sanitizeSettings({ icon: 'Sword' }).icon).toBe('Sword');
  });

  it('keeps only known privacy fields and valid levels', () => {
    const out = sanitizeSettings({
      privacy: { about: 'private', bogus: 'public', name: 'wrong' } as never,
    });
    expect(out.privacy).toEqual({ about: 'private' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/features/update-profile-settings/model/types.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/features/update-profile-settings/model/types.ts`:

```ts
import type {
  PrivacyField,
  PrivacyLevel,
  ProfilePrivacy,
  SocialLink,
} from '@/entities/user';
import { isSocialPlatform } from '@/entities/user/config/socials';
import { isProfileIcon } from '@/entities/user/config/icons';

export const ABOUT_MAX = 500;
export const INTERESTS_MAX = 10;
export const INTEREST_MAX_LEN = 30;
export const ALIAS_MAX = 30;
export const SOCIAL_VALUE_MAX = 200;

const LEVELS: readonly PrivacyLevel[] = ['private', 'guildmates', 'public'];
const PRIVACY_FIELDS: readonly PrivacyField[] = [
  'name', 'alias', 'about', 'interests', 'socials', 'joined', 'stats', 'common_guilds',
];

export interface ProfileSettingsInput {
  alias?: string | null;
  displayAsAlias?: boolean;
  icon?: string | null;
  about?: string | null;
  interests?: string[];
  socials?: SocialLink[];
  privacy?: ProfilePrivacy;
}

export function sanitizeSettings(input: ProfileSettingsInput): ProfileSettingsInput {
  const out: ProfileSettingsInput = {};

  if ('alias' in input) {
    const a = (input.alias ?? '').trim().slice(0, ALIAS_MAX);
    out.alias = a || null;
  }
  if ('displayAsAlias' in input) out.displayAsAlias = Boolean(input.displayAsAlias);
  if ('icon' in input) out.icon = isProfileIcon(input.icon) ? input.icon : null;
  if ('about' in input) {
    const t = (input.about ?? '').trim().slice(0, ABOUT_MAX);
    out.about = t || null;
  }
  if ('interests' in input) {
    out.interests = (input.interests ?? [])
      .map((i) => i.trim().slice(0, INTEREST_MAX_LEN))
      .filter(Boolean)
      .slice(0, INTERESTS_MAX);
  }
  if ('socials' in input) {
    out.socials = (input.socials ?? [])
      .filter((s) => s && isSocialPlatform(s.platform) && s.value.trim())
      .map((s) => ({ platform: s.platform, value: s.value.trim().slice(0, SOCIAL_VALUE_MAX) }));
  }
  if ('privacy' in input) {
    const p: ProfilePrivacy = {};
    const raw = input.privacy ?? {};
    for (const key of PRIVACY_FIELDS) {
      const v = raw[key];
      if (v && LEVELS.includes(v)) p[key] = v;
    }
    out.privacy = p;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/features/update-profile-settings/model/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/update-profile-settings/model
git commit -m "feat(profile): add settings payload sanitizer"
```

---

## Task 9: PATCH /api/profile route handler

**Files:**
- Create: `src/app/api/profile/route.ts`

- [ ] **Step 1: Implement route**

`src/app/api/profile/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';
import { sanitizeSettings, type ProfileSettingsInput } from '@/features/update-profile-settings/model/types';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: ProfileSettingsInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const clean = sanitizeSettings(body);
  const update: Record<string, unknown> = {};
  if ('alias' in clean) update.alias = clean.alias;
  if ('displayAsAlias' in clean) update.display_as_alias = clean.displayAsAlias;
  if ('icon' in clean) update.icon = clean.icon;
  if ('about' in clean) update.about = clean.about;
  if ('interests' in clean) update.interests = clean.interests;
  if ('socials' in clean) update.socials = clean.socials;
  if ('privacy' in clean) update.privacy = clean.privacy;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  // RLS restricts updates to the caller's own row.
  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/profile/route.ts
git commit -m "feat(profile): add PATCH /api/profile route"
```

---

## Task 10: RTK Query profileSettingsApi

**Files:**
- Create: `src/features/update-profile-settings/api/profileSettingsApi.ts`

- [ ] **Step 1: Implement endpoint**

`src/features/update-profile-settings/api/profileSettingsApi.ts`:

```ts
import { baseApi } from '@/shared/api/baseApi';
import type { ProfileSettingsInput } from '../model/types';

export const profileSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateProfileSettings: builder.mutation<{ success: boolean }, ProfileSettingsInput>({
      query: (body) => ({ url: 'profile', method: 'PATCH', body }),
    }),
  }),
  overrideExisting: false,
});

export const { useUpdateProfileSettingsMutation } = profileSettingsApi;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/update-profile-settings/api
git commit -m "feat(profile): add profile settings RTK Query endpoint"
```

---

## Task 11: PrivacySelector component

**Files:**
- Create: `src/features/update-profile-settings/ui/PrivacySelector/PrivacySelector.tsx`
- Create: `src/features/update-profile-settings/ui/PrivacySelector/PrivacySelector.module.css`
- Create: `src/features/update-profile-settings/ui/PrivacySelector/index.ts`

- [ ] **Step 1: Implement component**

`PrivacySelector.tsx`:

```tsx
'use client';

import { Lock, Users, Globe } from 'lucide-react';
import type { PrivacyLevel } from '@/entities/user';
import styles from './PrivacySelector.module.css';

const OPTIONS: { level: PrivacyLevel; Icon: typeof Lock; label: string }[] = [
  { level: 'private', Icon: Lock, label: 'Only me' },
  { level: 'guildmates', Icon: Users, label: 'Guild mates' },
  { level: 'public', Icon: Globe, label: 'Everyone' },
];

interface PrivacySelectorProps {
  value: PrivacyLevel;
  onChange: (level: PrivacyLevel) => void;
}

export const PrivacySelector = ({ value, onChange }: PrivacySelectorProps) => (
  <div className={styles.group} role="group">
    {OPTIONS.map(({ level, Icon, label }) => (
      <button
        key={level}
        type="button"
        aria-label={label}
        aria-pressed={value === level}
        className={value === level ? styles.activeOption : styles.option}
        onClick={() => onChange(level)}
      >
        <Icon size={16} />
      </button>
    ))}
  </div>
);
```

`PrivacySelector.module.css`:

```css
.group {
  display: inline-flex;
  gap: 4px;
}
.option,
.activeOption {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.option:hover {
  color: var(--text-primary);
}
.activeOption {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--text-primary);
}
```

`index.ts`:

```ts
export { PrivacySelector } from './PrivacySelector';
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm tsc --noEmit` → PASS.

```bash
git add src/features/update-profile-settings/ui/PrivacySelector
git commit -m "feat(profile): add PrivacySelector control"
```

---

## Task 12: IconPicker component

**Files:**
- Create: `src/features/update-profile-settings/ui/IconPicker/IconPicker.tsx`
- Create: `src/features/update-profile-settings/ui/IconPicker/IconPicker.module.css`
- Create: `src/features/update-profile-settings/ui/IconPicker/index.ts`

- [ ] **Step 1: Implement component**

`IconPicker.tsx`:

```tsx
'use client';

import * as Icons from 'lucide-react';
import { PROFILE_ICONS, type ProfileIcon } from '@/entities/user/config/icons';
import styles from './IconPicker.module.css';

interface IconPickerProps {
  value: string | null;
  onChange: (icon: ProfileIcon | null) => void;
}

export const IconPicker = ({ value, onChange }: IconPickerProps) => (
  <div className={styles.grid}>
    <button
      type="button"
      aria-label="No icon"
      aria-pressed={!value}
      className={!value ? styles.activeCell : styles.cell}
      onClick={() => onChange(null)}
    >
      <Icons.Ban size={18} />
    </button>
    {PROFILE_ICONS.map((name) => {
      const Icon = Icons[name] as React.ComponentType<{ size?: number }>;
      return (
        <button
          key={name}
          type="button"
          aria-label={name}
          aria-pressed={value === name}
          className={value === name ? styles.activeCell : styles.cell}
          onClick={() => onChange(name)}
        >
          <Icon size={18} />
        </button>
      );
    })}
  </div>
);
```

`IconPicker.module.css`:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.cell,
.activeCell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-secondary);
  cursor: pointer;
}
.cell:hover {
  color: var(--text-primary);
}
.activeCell {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--text-primary);
}
```

`index.ts`:

```ts
export { IconPicker } from './IconPicker';
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm tsc --noEmit` → PASS.

```bash
git add src/features/update-profile-settings/ui/IconPicker
git commit -m "feat(profile): add IconPicker control"
```

---

## Task 13: ProfileSettingsDialog + feature barrel

**Files:**
- Create: `src/features/update-profile-settings/ui/ProfileSettingsDialog/ProfileSettingsDialog.tsx`
- Create: `src/features/update-profile-settings/ui/ProfileSettingsDialog/ProfileSettingsDialog.module.css`
- Create: `src/features/update-profile-settings/ui/ProfileSettingsDialog/index.ts`
- Create: `src/features/update-profile-settings/index.ts`

- [ ] **Step 1: Implement the dialog**

`ProfileSettingsDialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Switch } from '@/shared/ui/Switch';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Select } from '@/shared/ui/Select';
import type { PrivacyField, PrivacyLevel, SocialLink } from '@/entities/user';
import { resolvePrivacy } from '@/entities/user/lib/visibility';
import { SOCIAL_PLATFORMS, SOCIAL_META, type SocialPlatform } from '@/entities/user/config/socials';
import { type ProfileIcon } from '@/entities/user/config/icons';
import {
  ABOUT_MAX,
  INTERESTS_MAX,
  ALIAS_MAX,
  type ProfileSettingsInput,
} from '../../model/types';
import { useUpdateProfileSettingsMutation } from '../../api/profileSettingsApi';
import { PrivacySelector } from '../PrivacySelector';
import { IconPicker } from '../IconPicker';
import styles from './ProfileSettingsDialog.module.css';

export interface ProfileSettingsInitial {
  alias: string | null;
  displayAsAlias: boolean;
  icon: string | null;
  about: string | null;
  interests: string[];
  socials: SocialLink[];
  privacy: Record<PrivacyField, PrivacyLevel>;
}

const PRIVACY_ROWS: { field: PrivacyField; label: string }[] = [
  { field: 'name', label: 'Real name' },
  { field: 'alias', label: 'Alias' },
  { field: 'about', label: 'About' },
  { field: 'interests', label: 'Interests' },
  { field: 'socials', label: 'Socials' },
  { field: 'joined', label: 'Join date' },
  { field: 'stats', label: 'Statistics' },
  { field: 'common_guilds', label: 'Common guilds' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initial: ProfileSettingsInitial;
}

export const ProfileSettingsDialog = ({ isOpen, onClose, initial }: Props) => {
  const router = useRouter();
  const [updateSettings, { isLoading }] = useUpdateProfileSettingsMutation();

  const [alias, setAlias] = useState(initial.alias ?? '');
  const [displayAsAlias, setDisplayAsAlias] = useState(initial.displayAsAlias);
  const [icon, setIcon] = useState<string | null>(initial.icon);
  const [about, setAbout] = useState(initial.about ?? '');
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [interestDraft, setInterestDraft] = useState('');
  const [socials, setSocials] = useState<SocialLink[]>(initial.socials);
  const [privacy, setPrivacy] = useState(resolvePrivacy(initial.privacy));

  const addInterest = () => {
    const v = interestDraft.trim();
    if (v && interests.length < INTERESTS_MAX && !interests.includes(v)) {
      setInterests([...interests, v]);
    }
    setInterestDraft('');
  };

  const setSocial = (platform: SocialPlatform, value: string) => {
    setSocials((prev) => {
      const next = prev.filter((s) => s.platform !== platform);
      if (value.trim()) next.push({ platform, value });
      return next;
    });
  };

  const handleSave = async () => {
    const payload: ProfileSettingsInput = {
      alias,
      displayAsAlias,
      icon,
      about,
      interests,
      socials,
      privacy,
    };
    try {
      await updateSettings(payload).unwrap();
      toast.success('Profile updated');
      onClose();
      router.refresh();
    } catch {
      toast.error('Failed to update profile');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile settings" className={styles.dialog}>
      <div className={styles.section}>
        <label className={styles.toggleRow}>
          <span>Show me as alias</span>
          <Switch checked={displayAsAlias} onCheckedChange={setDisplayAsAlias} ariaLabel="Show me as alias" />
        </label>
        <Input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          maxLength={ALIAS_MAX}
          placeholder="Alias / character name"
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Icon after name</span>
        <IconPicker value={icon} onChange={(v: ProfileIcon | null) => setIcon(v)} />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>About</span>
        <Textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          maxLength={ABOUT_MAX}
          rows={3}
          placeholder="A few words about yourself"
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Interests ({interests.length}/{INTERESTS_MAX})</span>
        <div className={styles.chips}>
          {interests.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.chip}
              onClick={() => setInterests(interests.filter((t) => t !== tag))}
            >
              {tag} ✕
            </button>
          ))}
        </div>
        <Input
          value={interestDraft}
          onChange={(e) => setInterestDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addInterest();
            }
          }}
          placeholder="Add interest and press Enter"
          disabled={interests.length >= INTERESTS_MAX}
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Socials</span>
        {SOCIAL_PLATFORMS.map((platform) => (
          <div key={platform} className={styles.socialRow}>
            <span className={styles.socialLabel}>{SOCIAL_META[platform].label}</span>
            <Input
              value={socials.find((s) => s.platform === platform)?.value ?? ''}
              onChange={(e) => setSocial(platform, e.target.value)}
              placeholder="handle or link"
            />
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Field privacy</span>
        {PRIVACY_ROWS.map(({ field, label }) => (
          <div key={field} className={styles.privacyRow}>
            <span>{label}</span>
            <PrivacySelector
              value={privacy[field]}
              onChange={(level) => setPrivacy({ ...privacy, [field]: level })}
            />
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSave} isLoading={isLoading}>Save</Button>
      </div>
    </Modal>
  );
};
```

`ProfileSettingsDialog.module.css`:

```css
.dialog {
  max-width: 520px;
  width: 100%;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}
.label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-secondary);
}
.toggleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-primary);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border: 1px solid var(--accent-primary);
  background: var(--glass-bg);
  color: var(--text-primary);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
}
.socialRow,
.privacyRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.socialLabel {
  color: var(--text-secondary);
  font-size: 13px;
  min-width: 96px;
}
.privacyRow {
  color: var(--text-primary);
  font-size: 14px;
  padding: 4px 0;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
```

`index.ts`:

```ts
export { ProfileSettingsDialog } from './ProfileSettingsDialog';
export type { ProfileSettingsInitial } from './ProfileSettingsDialog';
```

- [ ] **Step 2: Feature barrel**

`src/features/update-profile-settings/index.ts`:

```ts
export { ProfileSettingsDialog } from './ui/ProfileSettingsDialog';
export type { ProfileSettingsInitial } from './ui/ProfileSettingsDialog';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: PASS. (If `Select` import is unused, remove it.)

- [ ] **Step 4: Commit**

```bash
git add src/features/update-profile-settings
git commit -m "feat(profile): add profile settings dialog"
```

---

## Task 14: Profile blocks (presentational) + name flair

**Files:**
- Create: `src/app/profile/[publicId]/ProfileBlocks.tsx`
- Create: `src/app/profile/[publicId]/ProfileBlocks.module.css`

These are server-safe presentational pieces shared by public + own views. The header
renders `displayName` + optional icon flair.

- [ ] **Step 1: Implement blocks**

`ProfileBlocks.tsx`:

```tsx
import * as Icons from 'lucide-react';
import Link from 'next/link';
import type { CommonGuild, PublicProfile, SocialLink } from '@/entities/user';
import { SOCIAL_META } from '@/entities/user/config/socials';
import styles from './ProfileBlocks.module.css';

export const NameWithIcon = ({ name, icon }: { name: string | null; icon: string | null }) => {
  const Icon = icon ? (Icons[icon as keyof typeof Icons] as React.ComponentType<{ size?: number }>) : null;
  return (
    <span className={styles.nameRow}>
      {name || 'Guild Master user'}
      {Icon && <Icon size={18} />}
    </span>
  );
};

export const AboutBlock = ({ about }: { about: string }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>About</h2>
    <p className={styles.about}>{about}</p>
  </section>
);

export const InterestsBlock = ({ interests }: { interests: string[] }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>Interests</h2>
    <div className={styles.chips}>
      {interests.map((tag) => (
        <span key={tag} className={styles.chip}>{tag}</span>
      ))}
    </div>
  </section>
);

export const SocialsBlock = ({ socials }: { socials: SocialLink[] }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>Socials</h2>
    <ul className={styles.socials}>
      {socials.map((s) => {
        const isUrl = /^https?:\/\//i.test(s.value);
        return (
          <li key={s.platform}>
            <span className={styles.socialLabel}>{SOCIAL_META[s.platform].label}:</span>{' '}
            {isUrl ? (
              <a href={s.value} target="_blank" rel="noopener noreferrer">{s.value}</a>
            ) : (
              <span>{s.value}</span>
            )}
          </li>
        );
      })}
    </ul>
  </section>
);

export const CommonGuildsBlock = ({ guilds }: { guilds: CommonGuild[] }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>Common guilds</h2>
    {guilds.length === 0 ? (
      <p className={styles.muted}>No common guilds</p>
    ) : (
      <ul className={styles.guilds}>
        {guilds.map((g) => (
          <li key={g.id}>
            <Link href={`/guilds/${g.id}`}>{g.name}</Link>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export const StatsBlock = ({ profile }: { profile: Pick<PublicProfile, 'guildsCount' | 'eventsCount'> }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>Statistics</h2>
    <div className={styles.statsRow}>
      <div className={styles.statCard}>
        <span className={styles.statValue}>{profile.guildsCount ?? 0}</span>
        <span className={styles.statLabel}>Guilds</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statValue}>{profile.eventsCount ?? 0}</span>
        <span className={styles.statLabel}>Events</span>
      </div>
    </div>
  </section>
);
```

`ProfileBlocks.module.css`:

```css
.nameRow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-yellow);
}
.block {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 16px;
  margin-top: 12px;
}
.blockTitle {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-secondary);
  margin: 0 0 8px;
}
.about {
  color: var(--text-secondary);
  margin: 0;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  background: rgba(45, 158, 208, 0.25);
  border: 1px solid var(--accent-primary);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  color: var(--text-primary);
}
.socials,
.guilds {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-secondary);
}
.socialLabel {
  color: var(--text-muted);
}
.muted {
  color: var(--text-muted);
  margin: 0;
}
.statsRow {
  display: flex;
  gap: 12px;
}
.statCard {
  flex: 1;
  text-align: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 12px;
}
.statValue {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}
.statLabel {
  font-size: 12px;
  color: var(--text-muted);
}
```

Note the icon-name index must be narrowed: `Icons[icon as keyof typeof Icons]` may surface
non-component members. Since `icon` originates from the validated allow-list (Task 2),
the cast is safe; keep the `Icon &&` guard.

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm tsc --noEmit` → PASS.

```bash
git add "src/app/profile/[publicId]/ProfileBlocks.tsx" "src/app/profile/[publicId]/ProfileBlocks.module.css"
git commit -m "feat(profile): add presentational profile blocks"
```

---

## Task 15: Rebuild public profile page

**Files:**
- Modify: `src/app/profile/[publicId]/page.tsx`
- Modify: `src/app/profile/[publicId]/PublicProfilePage.module.css` (reuse existing classes; add as needed)

- [ ] **Step 1: Rewrite the page**

Replace the body of `PublicProfilePage` (keep `generateMetadata`, but it now passes no
viewer) in `src/app/profile/[publicId]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { Calendar } from 'lucide-react';
import { getPublicProfile } from '@/entities/user/api/getPublicProfile';
import { createClient } from '@/shared/api/supabase/server';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { OwnProfile } from './OwnProfile';
import {
  NameWithIcon,
  AboutBlock,
  InterestsBlock,
  SocialsBlock,
  CommonGuildsBlock,
  StatsBlock,
} from './ProfileBlocks';
import styles from './PublicProfilePage.module.css';

interface PublicProfilePageProps {
  params: Promise<{ publicId: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { publicId } = await params;
  const profile = await getPublicProfile(publicId);
  const name = profile?.displayName;
  return { title: name ? `${name} — Guild Master` : 'Guild Master' };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { publicId } = await params;

  const supabase = await createClient();
  const { data: { user: viewer } } = await supabase.auth.getUser();

  const profile = await getPublicProfile(publicId, viewer?.id);
  if (!profile) notFound();

  if (viewer && viewer.id === profile.id) {
    return <OwnProfile user={viewer} />;
  }

  const t = await getTranslations('PublicProfile');
  const locale = await getLocale();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <UserAvatar avatarUrl={profile.avatarUrl} name={profile.displayName} size="xl" />
          <h1 className={styles.name}>
            <NameWithIcon name={profile.displayName} icon={profile.icon} />
          </h1>
          {profile.realName && profile.realName !== profile.displayName && (
            <p className={styles.realName}>{profile.realName}</p>
          )}
        </div>

        {profile.about && <AboutBlock about={profile.about} />}
        {profile.interests && profile.interests.length > 0 && (
          <InterestsBlock interests={profile.interests} />
        )}
        {profile.socials && profile.socials.length > 0 && (
          <SocialsBlock socials={profile.socials} />
        )}
        {profile.commonGuilds && <CommonGuildsBlock guilds={profile.commonGuilds} />}

        {profile.joinedAt && (
          <div className={styles.infoItem}>
            <Calendar className={styles.icon} size={20} />
            <div>
              <span className={styles.infoLabel}>{t('joined')}</span>
              <p>{new Date(profile.joinedAt).toLocaleDateString(locale)}</p>
            </div>
          </div>
        )}

        {profile.guildsCount !== undefined && <StatsBlock profile={profile} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `.realName` style**

Append to `PublicProfilePage.module.css`:

```css
.realName {
  color: var(--text-muted);
  font-size: 13px;
  margin: 2px 0 0;
}
```

- [ ] **Step 3: Typecheck + run profile tests**

Run: `pnpm tsc --noEmit` → PASS.
Run: `pnpm test:run src/entities/user` → PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/profile/[publicId]/page.tsx" "src/app/profile/[publicId]/PublicProfilePage.module.css"
git commit -m "feat(profile): rebuild public profile page with new blocks"
```

---

## Task 16: Own profile — settings entry point + new blocks

**Files:**
- Modify: `src/app/profile/[publicId]/OwnProfile.tsx`
- Create: `src/app/profile/[publicId]/OwnProfileClient.tsx`
- Modify: `src/app/profile/[publicId]/OwnProfile.module.css`

`OwnProfile` is a server component; the gear button + dialog need client state, so add a
small client wrapper that holds the dialog open state and renders the gear.

- [ ] **Step 1: Create the client wrapper**

`src/app/profile/[publicId]/OwnProfileClient.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import {
  ProfileSettingsDialog,
  type ProfileSettingsInitial,
} from '@/features/update-profile-settings';

export const OwnProfileSettings = ({ initial }: { initial: ProfileSettingsInitial }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon_sm"
        aria-label="Profile settings"
        onClick={() => setOpen(true)}
      >
        <Settings size={20} />
      </Button>
      <ProfileSettingsDialog isOpen={open} onClose={() => setOpen(false)} initial={initial} />
    </>
  );
};
```

- [ ] **Step 2: Update `OwnProfile.tsx` to fetch new fields + render gear/blocks**

Replace the profile select and add the gear. Change the select line and JSX:

```tsx
// select:
const { data: profile } = await supabase
  .from('profiles')
  .select('avatar_url, full_name, alias, display_as_alias, icon, about, interests, socials, privacy')
  .eq('id', user.id)
  .single();
```

Add imports at top:

```tsx
import { resolvePrivacy } from '@/entities/user/lib/visibility';
import { resolveDisplayName } from '@/entities/user/lib/resolveDisplayName';
import type { SocialLink } from '@/entities/user';
import { OwnProfileSettings } from './OwnProfileClient';
import { AboutBlock, InterestsBlock, SocialsBlock, StatsBlock, NameWithIcon } from './ProfileBlocks';
```

Build the dialog initial state and display name before the return:

```tsx
const displayName = resolveDisplayName({
  fullName: profile?.full_name ?? null,
  alias: profile?.alias ?? null,
  displayAsAlias: profile?.display_as_alias ?? false,
});

const settingsInitial = {
  alias: profile?.alias ?? null,
  displayAsAlias: profile?.display_as_alias ?? false,
  icon: profile?.icon ?? null,
  about: profile?.about ?? null,
  interests: (profile?.interests as string[]) ?? [],
  socials: (profile?.socials as SocialLink[]) ?? [],
  privacy: resolvePrivacy(profile?.privacy as Parameters<typeof resolvePrivacy>[0]),
};
```

In the header JSX, add the gear top-right and the icon flair next to the title; keep the
existing `AvatarUpload` and `EditableName`. Add to the `.header` block:

```tsx
<div className={styles.headerTop}>
  <OwnProfileSettings initial={settingsInitial} />
</div>
```

and replace the `<h1>` title with:

```tsx
<h1><NameWithIcon name={displayName ?? user.email?.split('@')[0] ?? 'User Profile'} icon={profile?.icon ?? null} /></h1>
```

After the existing `infoGrid`, render the new blocks (each conditional):

```tsx
{profile?.about && <AboutBlock about={profile.about} />}
{Array.isArray(profile?.interests) && profile.interests.length > 0 && (
  <InterestsBlock interests={profile.interests as string[]} />
)}
{Array.isArray(profile?.socials) && (profile.socials as SocialLink[]).length > 0 && (
  <SocialsBlock socials={profile.socials as SocialLink[]} />
)}
```

Keep the existing Statistics section (or swap to `<StatsBlock profile={{ guildsCount, eventsCount }} />`).

- [ ] **Step 3: Add `.headerTop` style**

Append to `OwnProfile.module.css`:

```css
.headerTop {
  position: absolute;
  top: 12px;
  right: 12px;
}
```

Ensure `.header` (or `.card`) has `position: relative;` — if not present, add it to the
header rule in `OwnProfile.module.css`.

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm tsc --noEmit` → PASS.

```bash
git add "src/app/profile/[publicId]/OwnProfile.tsx" "src/app/profile/[publicId]/OwnProfileClient.tsx" "src/app/profile/[publicId]/OwnProfile.module.css"
git commit -m "feat(profile): add settings gear and new blocks to own profile"
```

---

## Task 17: User barrel exports

**Files:**
- Modify: `src/entities/user/index.ts`

- [ ] **Step 1: Add exports**

Append to `src/entities/user/index.ts`:

```ts
export { canSee, resolvePrivacy, DEFAULT_PRIVACY } from './lib/visibility';
export { resolveDisplayName } from './lib/resolveDisplayName';
export { getPublicProfile } from './api/getPublicProfile';
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm tsc --noEmit` → PASS.

```bash
git add src/entities/user/index.ts
git commit -m "chore(profile): export profile helpers from user barrel"
```

---

## Task 18: App-wide alias in guild member lists + header

**Files:**
- Modify: `src/entities/guild/model/types.ts` — `GuildMember.profile` carries alias fields.
- Modify: `src/entities/guild/api/getGuildMembers.ts` — select + map alias fields.
- Modify: `src/widgets/guild-members` — render `resolveDisplayName(...)`.
- Modify: `src/widgets/header` — render `resolveDisplayName(...)` for the current user.

- [ ] **Step 1: Extend `GuildMember` type**

In `src/entities/guild/model/types.ts`, extend the `profile` shape:

```ts
profile: {
  publicId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  alias: string | null;
  displayAsAlias: boolean;
};
```

- [ ] **Step 2: Select + map alias fields in `getGuildMembers.ts`**

Read the file first. In the Supabase `.select(...)` for the joined `profiles`, add
`alias, display_as_alias`. In the mapping, add:

```ts
alias: p.alias ?? null,
displayAsAlias: p.display_as_alias ?? false,
```

(adjust the destructured `p` profile type to include `alias: string | null; display_as_alias: boolean`).

- [ ] **Step 3: Render resolved name in guild-members widget**

In the guild-members widget component, where it renders `member.profile.fullName`,
replace with:

```tsx
import { resolveDisplayName } from '@/entities/user';
// ...
{resolveDisplayName({
  fullName: member.profile.fullName,
  alias: member.profile.alias,
  displayAsAlias: member.profile.displayAsAlias,
}) ?? 'Guild Master user'}
```

- [ ] **Step 4: Render resolved name in header**

Read `src/widgets/header`. Where the current user's `full_name` is rendered, fetch
`alias, display_as_alias` alongside it and apply `resolveDisplayName`. (If the header
already reads a profile object, extend its select and apply the helper.)

- [ ] **Step 5: Typecheck + run guild tests**

Run: `pnpm tsc --noEmit` → PASS.
Run: `pnpm test:run src/entities/guild` → PASS (update `getGuildMembers.test.ts` mock rows to include `alias`/`display_as_alias` if it asserts exact shape).

- [ ] **Step 6: Commit**

```bash
git add src/entities/guild src/widgets/guild-members src/widgets/header
git commit -m "feat(profile): apply alias display name across member lists and header"
```

---

## Task 19: i18n strings

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`

- [ ] **Step 1: Add keys**

Read both files. Under `PublicProfile`, ensure keys `joined`, `statistics`, `guilds`,
`events` exist (already present per current page). Add a new `ProfileSettings` namespace
used by the dialog if you choose to translate its labels (the dialog currently uses inline
English literals — translation is optional). If translating, add:

```json
"ProfileSettings": {
  "title": "Profile settings",
  "showAsAlias": "Show me as alias",
  "iconLabel": "Icon after name",
  "about": "About",
  "interests": "Interests",
  "socials": "Socials",
  "privacy": "Field privacy",
  "save": "Save",
  "cancel": "Cancel"
}
```

Mirror in `ru.json` with Russian translations.

- [ ] **Step 2: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat(profile): add profile settings i18n strings"
```

---

## Task 20: Full verification

- [ ] **Step 1: Lint**

Run: `pnpm lint`
Expected: PASS (no new errors).

- [ ] **Step 2: FSD lint**

Run: `pnpm lint:fsd`
Expected: PASS — no cross-layer or public-API violations.

- [ ] **Step 3: Full test suite**

Run: `pnpm test:run`
Expected: PASS.

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 6: Update CLAUDE.md schema table**

Per CLAUDE.md hygiene rule, update the `profiles` row in `src/CLAUDE.md`'s Database
Schema table to list the new columns (`alias`, `display_as_alias`, `icon`, `about`,
`interests`, `socials`, `privacy`).

```bash
git add src/CLAUDE.md
git commit -m "docs: document new profiles columns"
```

---

## Self-Review Notes

- **Spec coverage:** alias + toggle (T3,5,13,16,18), icon no-privacy (T2,12,14), about/interests/socials (T3,8,13,14), privacy map + 3 levels + defaults (T3,4,8,13), server-side visibility incl. anonymous (T4,7,15), common guilds + "none" message (T6,7,14,15), settings gear panel (T13,16), email own-only (unchanged — never selected for public view), dark glass theme (T11-14 CSS). Availability table intentionally excluded.
- **Type consistency:** `PrivacyField`/`PrivacyLevel`/`ProfilePrivacy`/`SocialLink`/`CommonGuild`/`ViewerRelationship` defined in T3, consumed consistently. `resolvePrivacy` returns `Required<ProfilePrivacy>`; dialog indexes `privacy[field]` safely. `resolveDisplayName` input shape identical across T5/15/16/18.
- **Privacy interaction:** alias used as app-wide display name regardless of `alias` privacy (per spec) — `resolveDisplayName` ignores privacy; privacy only gates the profile-page alias field.
