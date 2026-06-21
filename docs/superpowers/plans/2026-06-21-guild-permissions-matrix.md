# Guild Permissions Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a guild owner configure, per content type (events, announcements, polls, call-to-actions), who may create it — all members, officers, or owner — enforced both in the UI and in the server route handlers.

**Architecture:** A nullable `guilds.permissions` JSONB column stores the matrix. A single pure resolver in `shared/api` (`canPerform`) maps `(permissions, action, role) → boolean`, applying per-action defaults that preserve today's behavior. The server reuses it via a new `requireGuildPermission` route helper and in the `getGuild*` read functions' `canCreate` flags; the client reuses it via an extended `useGuildPermissions` hook. The owner edits the matrix through the existing owner-gated `PATCH /api/guilds/[id]`.

**Tech Stack:** Next.js 16 App Router, React 19, Redux Toolkit + RTK Query, Supabase (RLS baseline), TypeScript, CSS Modules, next-intl, Vitest.

## Global Constraints

- FSD layers: `widgets` → `features` → `entities` → `shared`. Import only downward. The shared resolver lives in `shared/api` so both route handlers and entity read-functions can import it (entities → shared is legal; shared must NOT import entities).
- Import slices only through their `index.ts` barrel.
- RTK Query only for server data via `injectEndpoints` on `baseApi`. No `createAsyncThunk`.
- CSS Modules only. **NEVER inline styles.** Align with `docs/design-system.md`.
- i18n: every user-facing string goes through next-intl; add keys to BOTH `messages/en.json` and `messages/ru.json` in full key parity. `Guild` and `GuildPoll` namespaces are already registered in `requiredNamespaces` — no `layout.tsx` change.
- Supabase migrations: no CLI. Apply DDL via the Supabase MCP `apply_migration`, then hand-edit `src/shared/api/supabase/types.ts`.
- React 19: use `React.SubmitEvent` for form submit handlers (not `React.FormEvent`).
- Strict scope: only touch what each task requires. Baseline `tsc`/`lint:fsd` already have known unrelated failures — ignore those.
- Permission levels → roles: `all`=[MEMBER,ADMIN,OWNER], `officers`=[ADMIN,OWNER], `owner`=[OWNER].
- Defaults (used for NULL column / missing key): `events='officers'`, `announcements='officers'`, `polls='all'`, `call_to_actions='all'`.
- The setting controls **creation only**. Edit/delete and ADMIN/OWNER moderation stay unchanged.

---

## File Structure

**Create:**
- `src/shared/api/guildPermissions.ts` — pure resolver, types, defaults (no Supabase/React deps).
- `src/shared/api/guildPermissions.test.ts` — unit tests for the resolver.

**Modify:**
- `src/shared/api/supabase/types.ts` — add `permissions` to `guilds` Row/Insert/Update.
- `src/shared/api/guildAuth.ts` — add `requireGuildPermission`.
- `src/app/api/events/route.ts` — gate POST with `requireGuildPermission(.., 'events')`.
- `src/app/api/guilds/[id]/announcements/route.ts` — swap role gate for permission gate.
- `src/app/api/guilds/[id]/polls/route.ts` — add permission gate.
- `src/app/api/guilds/[id]/call-to-actions/route.ts` — swap role gate for permission gate.
- `src/app/api/guilds/[id]/route.ts` — PATCH accepts & persists `permissions`.
- `src/entities/announcement/api/getGuildAnnouncements.ts` — matrix-based `canCreate`.
- `src/entities/call-to-action/api/getCallToActions.ts` — matrix-based `canCreate`.
- `src/entities/guild/model/types.ts` — add `permissions` to `Guild`.
- `src/entities/guild/api/getGuilds.ts` — select + map `permissions`.
- `src/entities/guild/api/guildApi.ts` — `updateGuild` mutation accepts `permissions`.
- `src/entities/guild/lib/useGuildPermissions.ts` — add `canCreate*` flags.
- `src/widgets/calendar/ui/CalendarGrid.tsx` — create button uses `canCreateEvents`.
- `src/widgets/day-events/ui/DayEventsList.tsx` — create buttons use `canCreateEvents` (delete stays `canManageEvents`).
- `src/widgets/guild-announcements/ui/GuildAnnouncements.tsx` — gate poll create button with `canCreatePolls`.
- `src/features/manage-guilds/ui/EditGuildWizard.tsx` — Permissions section + save.
- `src/features/manage-guilds/ui/EditGuildWizard.module.css` — styles for the section.
- `messages/en.json`, `messages/ru.json` — new `Guild` keys.

---

## Task 1: Shared permission resolver + defaults

**Files:**
- Create: `src/shared/api/guildPermissions.ts`
- Test: `src/shared/api/guildPermissions.test.ts`

**Interfaces:**
- Produces:
  - `type GuildAction = 'events' | 'announcements' | 'polls' | 'call_to_actions'`
  - `type PermissionLevel = 'all' | 'officers' | 'owner'`
  - `type GuildRole = 'OWNER' | 'ADMIN' | 'MEMBER'`
  - `type GuildPermissions = Partial<Record<GuildAction, PermissionLevel>>`
  - `const DEFAULT_PERMISSIONS: Record<GuildAction, PermissionLevel>`
  - `const GUILD_ACTIONS: GuildAction[]`
  - `function resolveLevel(permissions: GuildPermissions | null | undefined, action: GuildAction): PermissionLevel`
  - `function canPerform(permissions: GuildPermissions | null | undefined, action: GuildAction, role: string | null | undefined): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/api/guildPermissions.test.ts
import { describe, it, expect } from 'vitest';
import { canPerform, resolveLevel, DEFAULT_PERMISSIONS } from './guildPermissions';

describe('resolveLevel', () => {
  it('falls back to defaults for null permissions', () => {
    expect(resolveLevel(null, 'events')).toBe('officers');
    expect(resolveLevel(null, 'polls')).toBe('all');
  });
  it('falls back to default for a missing key', () => {
    expect(resolveLevel({ events: 'owner' }, 'polls')).toBe('all');
  });
  it('uses an explicit value when present', () => {
    expect(resolveLevel({ polls: 'officers' }, 'polls')).toBe('officers');
  });
});

describe('canPerform', () => {
  it("level 'all' lets a MEMBER act", () => {
    expect(canPerform({ events: 'all' }, 'events', 'MEMBER')).toBe(true);
  });
  it("level 'officers' blocks a MEMBER, allows ADMIN/OWNER", () => {
    expect(canPerform({ events: 'officers' }, 'events', 'MEMBER')).toBe(false);
    expect(canPerform({ events: 'officers' }, 'events', 'ADMIN')).toBe(true);
    expect(canPerform({ events: 'officers' }, 'events', 'OWNER')).toBe(true);
  });
  it("level 'owner' allows only OWNER", () => {
    expect(canPerform({ events: 'owner' }, 'events', 'ADMIN')).toBe(false);
    expect(canPerform({ events: 'owner' }, 'events', 'OWNER')).toBe(true);
  });
  it('applies defaults: polls default all, announcements default officers', () => {
    expect(canPerform(null, 'polls', 'MEMBER')).toBe(true);
    expect(canPerform(null, 'announcements', 'MEMBER')).toBe(false);
  });
  it('a null/unknown role can never act', () => {
    expect(canPerform({ events: 'all' }, 'events', null)).toBe(false);
    expect(canPerform({ events: 'all' }, 'events', 'GUEST')).toBe(false);
  });
  it('DEFAULT_PERMISSIONS preserves current behavior', () => {
    expect(DEFAULT_PERMISSIONS).toEqual({
      events: 'officers', announcements: 'officers', polls: 'all', call_to_actions: 'all',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/shared/api/guildPermissions.test.ts`
Expected: FAIL — cannot find module `./guildPermissions`.

- [ ] **Step 3: Write the resolver**

```ts
// src/shared/api/guildPermissions.ts
export type GuildAction = 'events' | 'announcements' | 'polls' | 'call_to_actions';
export type PermissionLevel = 'all' | 'officers' | 'owner';
export type GuildRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type GuildPermissions = Partial<Record<GuildAction, PermissionLevel>>;

export const GUILD_ACTIONS: GuildAction[] = ['events', 'announcements', 'polls', 'call_to_actions'];

export const DEFAULT_PERMISSIONS: Record<GuildAction, PermissionLevel> = {
  events: 'officers',
  announcements: 'officers',
  polls: 'all',
  call_to_actions: 'all',
};

const ROLES_FOR_LEVEL: Record<PermissionLevel, string[]> = {
  all: ['MEMBER', 'ADMIN', 'OWNER'],
  officers: ['ADMIN', 'OWNER'],
  owner: ['OWNER'],
};

export function resolveLevel(
  permissions: GuildPermissions | null | undefined,
  action: GuildAction,
): PermissionLevel {
  return permissions?.[action] ?? DEFAULT_PERMISSIONS[action];
}

export function canPerform(
  permissions: GuildPermissions | null | undefined,
  action: GuildAction,
  role: string | null | undefined,
): boolean {
  if (!role) return false;
  return ROLES_FOR_LEVEL[resolveLevel(permissions, action)].includes(role);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/shared/api/guildPermissions.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/guildPermissions.ts src/shared/api/guildPermissions.test.ts
git commit -m "feat: add guild permission resolver and defaults"
```

---

## Task 2: DB column + Supabase types

**Files:**
- Modify: `src/shared/api/supabase/types.ts` (guilds Row/Insert/Update)

**Interfaces:**
- Consumes: nothing.
- Produces: `guilds.permissions` column (`Json | null`) usable by all server code.

- [ ] **Step 1: Apply the migration (Supabase MCP)**

Use the Supabase MCP `apply_migration` with name `add_guild_permissions` and SQL:

```sql
alter table public.guilds
  add column permissions jsonb;

comment on column public.guilds.permissions is
  'Per-action create permissions map {events|announcements|polls|call_to_actions: all|officers|owner}. NULL or missing key falls back to app defaults.';
```

- [ ] **Step 2: Verify the column exists**

Use the Supabase MCP `list_tables` (schema `public`) and confirm `guilds` now has a `permissions` (jsonb, nullable) column.

- [ ] **Step 3: Hand-edit `types.ts`**

In `src/shared/api/supabase/types.ts`, inside `guilds`, add `permissions: Json | null` to `Row`, `permissions?: Json | null` to `Insert`, and `permissions?: Json | null` to `Update`. Place each alphabetically near `owner_id`/`public_id` to match the existing ordering:

```ts
// Row
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          permissions: Json | null
          public_id: string
        }
// Insert
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          permissions?: Json | null
          public_id?: string
        }
// Update
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          permissions?: Json | null
          public_id?: string
        }
```

(`Json` is already imported/defined at the top of `types.ts`.)

- [ ] **Step 4: Typecheck the edited file**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -i "supabase/types" || echo "no new type errors in types.ts"`
Expected: `no new type errors in types.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat: add permissions column to guilds (migration + types)"
```

---

## Task 3: Server route gate `requireGuildPermission`

**Files:**
- Modify: `src/shared/api/guildAuth.ts`

**Interfaces:**
- Consumes: `canPerform`, `GuildAction`, `GuildPermissions` from `./guildPermissions` (Task 1); `guilds.permissions` (Task 2).
- Produces: `requireGuildPermission(supabase, guildId, userId, action): Promise<NextResponse | null>` — 403 NextResponse if the caller's role is not allowed for `action`, else `null`.

- [ ] **Step 1: Add the helper**

Append to `src/shared/api/guildAuth.ts` (and add the import at the top):

```ts
import { canPerform, type GuildAction, type GuildPermissions } from './guildPermissions';
```

```ts
/**
 * Returns a 403 response if the guild's permission level for `action`
 * does not admit the caller's role, otherwise null. Reads guilds.permissions
 * and the caller's guild_members.role; missing config falls back to defaults.
 */
export async function requireGuildPermission(
  supabase: Client,
  guildId: string,
  userId: string,
  action: GuildAction,
): Promise<NextResponse | null> {
  const { data: membership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  const { data: guild } = await supabase
    .from('guilds')
    .select('permissions')
    .eq('id', guildId)
    .maybeSingle();

  const permissions = (guild?.permissions ?? null) as GuildPermissions | null;
  if (!canPerform(permissions, action, membership?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -i "guildAuth" || echo "guildAuth clean"`
Expected: `guildAuth clean`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/api/guildAuth.ts
git commit -m "feat: add requireGuildPermission route gate"
```

---

## Task 4: Wire the four POST routes to the permission gate

**Files:**
- Modify: `src/app/api/events/route.ts`
- Modify: `src/app/api/guilds/[id]/announcements/route.ts`
- Modify: `src/app/api/guilds/[id]/polls/route.ts`
- Modify: `src/app/api/guilds/[id]/call-to-actions/route.ts`

**Interfaces:**
- Consumes: `requireUser`, `requireGuildPermission` (Task 3).

- [ ] **Step 1: Events POST — add auth + gate**

In `src/app/api/events/route.ts`, replace the existing `POST` with:

```ts
import { requireUser, requireGuildPermission } from '@/shared/api/guildAuth';
```

```ts
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const guildId = String(body.guild_id ?? '');
    if (!guildId) return NextResponse.json({ error: 'guild_id required' }, { status: 400 });
    const forbidden = await requireGuildPermission(auth.supabase, guildId, auth.user.id, 'events');
    if (forbidden) return forbidden;

    const data = await createEvent(body);
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Announcements POST — swap role gate for permission gate**

In `src/app/api/guilds/[id]/announcements/route.ts`:
- Change the import from `{ requireUser, requireGuildRole }` to `{ requireUser, requireGuildPermission }`.
- Replace the gate line:

```ts
    const forbidden = await requireGuildPermission(auth.supabase, id, auth.user.id, 'announcements');
    if (forbidden) return forbidden;
```

(Remove the old `requireGuildRole(auth.supabase, id, auth.user.id, ['ADMIN', 'OWNER'])` block.)

- [ ] **Step 3: Polls POST — add permission gate**

In `src/app/api/guilds/[id]/polls/route.ts`:
- Change the import to `{ requireUser, requireGuildPermission }`.
- After `const { id } = await params;` and before reading the body, insert:

```ts
    const forbidden = await requireGuildPermission(auth.supabase, id, auth.user.id, 'polls');
    if (forbidden) return forbidden;
```

- [ ] **Step 4: Call-to-actions POST — swap role gate for permission gate**

In `src/app/api/guilds/[id]/call-to-actions/route.ts`:
- Change the import to `{ requireUser, requireGuildPermission }`.
- Replace the `requireGuildRole(auth.supabase, id, auth.user.id, ['MEMBER', 'ADMIN', 'OWNER'])` block with:

```ts
    const forbidden = await requireGuildPermission(auth.supabase, id, auth.user.id, 'call_to_actions');
    if (forbidden) return forbidden;
```

- [ ] **Step 5: Typecheck the routes**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -iE "api/(events|guilds).*route" || echo "routes clean"`
Expected: `routes clean`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/events/route.ts "src/app/api/guilds/[id]/announcements/route.ts" "src/app/api/guilds/[id]/polls/route.ts" "src/app/api/guilds/[id]/call-to-actions/route.ts"
git commit -m "feat: gate event/announcement/poll/CTA creation by guild permissions"
```

---

## Task 5: Matrix-based `canCreate` in announcement & CTA reads

**Files:**
- Modify: `src/entities/announcement/api/getGuildAnnouncements.ts`
- Modify: `src/entities/call-to-action/api/getCallToActions.ts`

**Interfaces:**
- Consumes: `canPerform` from `@/shared/api/guildPermissions`.
- Produces: `GuildAnnouncementsResult.canCreate` and `CallToActionsResult.canCreate` now reflect the matrix (the widgets already consume `data.canCreate`).

- [ ] **Step 1: Announcements — read permissions and resolve canCreate**

In `getGuildAnnouncements.ts`, add the import:

```ts
import { canPerform, type GuildPermissions } from '@/shared/api/guildPermissions';
```

In `getGuildAnnouncements`, after `const { userId, role } = await resolveCaller(supabase, guildId);`, fetch permissions and use them for `canCreate`:

```ts
  const { data: guildRow } = await supabase
    .from('guilds')
    .select('permissions')
    .eq('id', guildId)
    .maybeSingle();
  const permissions = (guildRow?.permissions ?? null) as GuildPermissions | null;
```

Change the return to:

```ts
  return { announcements, canCreate: canPerform(permissions, 'announcements', role) };
```

(Leave `isManager` / `canManage` for per-row edit/delete unchanged.)

- [ ] **Step 2: CTA — read permissions and resolve canCreate**

In `getCallToActions.ts`, add the import:

```ts
import { canPerform, type GuildPermissions } from '@/shared/api/guildPermissions';
```

In `getCallToActions`, after `const { userId, role, isMember } = await resolveCaller(supabase, guildId);`, add:

```ts
  const { data: guildRow } = await supabase
    .from('guilds')
    .select('permissions')
    .eq('id', guildId)
    .maybeSingle();
  const permissions = (guildRow?.permissions ?? null) as GuildPermissions | null;
```

Change the return to:

```ts
  return { callToActions, canCreate: canPerform(permissions, 'call_to_actions', role) };
```

(`isMember` is no longer used for `canCreate`; keep `resolveCaller` returning it — other callers/`getCallToActionById` are unaffected. If `isMember` becomes unused in this function only, that's fine.)

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -iE "getGuildAnnouncements|getCallToActions" || echo "reads clean"`
Expected: `reads clean`.

- [ ] **Step 4: Commit**

```bash
git add src/entities/announcement/api/getGuildAnnouncements.ts src/entities/call-to-action/api/getCallToActions.ts
git commit -m "feat: resolve announcement/CTA canCreate from permission matrix"
```

---

## Task 6: Surface `permissions` on the Guild model + update mutation/route

**Files:**
- Modify: `src/entities/guild/model/types.ts`
- Modify: `src/entities/guild/api/getGuilds.ts`
- Modify: `src/entities/guild/api/guildApi.ts`
- Modify: `src/app/api/guilds/[id]/route.ts`

**Interfaces:**
- Consumes: `GuildPermissions` from `@/shared/api/guildPermissions`.
- Produces:
  - `Guild.permissions?: GuildPermissions`
  - `useUpdateGuildMutation` accepts optional `permissions`
  - `PATCH /api/guilds/[id]` persists `permissions` (owner-gated — route already calls `requireGuildOwner`) and returns it.

- [ ] **Step 1: Add `permissions` to the `Guild` type**

In `src/entities/guild/model/types.ts`, add the import at the top and the field on `Guild`:

```ts
import type { GuildPermissions } from '@/shared/api/guildPermissions';
```

```ts
  /** The viewer's role in this guild (populated by guild list endpoints). */
  role?: 'OWNER' | 'ADMIN' | 'MEMBER';
  /** Per-action create permissions; NULL/missing keys fall back to defaults. */
  permissions?: GuildPermissions;
```

- [ ] **Step 2: Select + map `permissions` in `getGuilds`**

In `src/entities/guild/api/getGuilds.ts`:
- Add `permissions` to the nested select: `guilds (id, public_id, name, owner_id, description, avatar_url, permissions)`.
- Extend the local `g` cast type with `permissions: GuildPermissions | null` and import the type:

```ts
import { Guild } from '../model/types';
import type { GuildPermissions } from '@/shared/api/guildPermissions';
```

- In the mapped object, add:

```ts
        role: (m.role as 'OWNER' | 'ADMIN' | 'MEMBER') ?? undefined,
        permissions: g.permissions ?? undefined,
```

(Update the `const g = m.guilds as unknown as { ...; permissions: GuildPermissions | null }` cast accordingly.)

- [ ] **Step 3: Accept `permissions` in the `updateGuild` mutation**

In `src/entities/guild/api/guildApi.ts`, widen the `updateGuild` mutation arg type:

```ts
    updateGuild: builder.mutation<
      Guild,
      { id: string; name: string; description?: string; avatarUrl?: string; permissions?: import('../model/types').Guild['permissions'] }
    >({
      query: ({ id, ...body }) => ({ url: `guilds/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_, __, { id }) => [
        { type: 'Guild', id: 'LIST' },
        { type: 'Guild', id },
      ],
    }),
```

- [ ] **Step 4: Persist `permissions` in the PATCH route**

In `src/app/api/guilds/[id]/route.ts` `PATCH`:
- Destructure `permissions`: `const { name, description, avatarUrl, permissions } = await request.json();`
- The route already calls `requireGuildOwner` for all updates, so persisting `permissions` is owner-gated.
- Extend the `updates` object type and assignment:

```ts
  const updates: { name: string; description: string | null; avatar_url?: string | null; permissions?: unknown } = {
    name,
    description: description || null,
  };
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl || null;
  if (permissions !== undefined) updates.permissions = permissions;
```

- Add `permissions` to the returned `g` cast and JSON response:

```ts
  const g = guild as unknown as { id: string; public_id: string; name: string; owner_id: string; description: string | null; avatar_url: string | null; permissions: unknown };

  return NextResponse.json({
    id: g.id,
    publicId: g.public_id,
    name: g.name,
    ownerId: g.owner_id,
    description: g.description || undefined,
    avatarUrl: g.avatar_url || undefined,
    permissions: g.permissions ?? undefined,
  });
```

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -iE "entities/guild|guilds/\[id\]/route" || echo "guild model clean"`
Expected: `guild model clean`.

- [ ] **Step 6: Commit**

```bash
git add src/entities/guild/model/types.ts src/entities/guild/api/getGuilds.ts src/entities/guild/api/guildApi.ts "src/app/api/guilds/[id]/route.ts"
git commit -m "feat: surface guild permissions on model and persist via PATCH"
```

---

## Task 7: Extend `useGuildPermissions` with `canCreate*` flags + gate client buttons

**Files:**
- Modify: `src/entities/guild/lib/useGuildPermissions.ts`
- Modify: `src/entities/guild/lib/useGuildPermissions.test.ts`
- Modify: `src/widgets/calendar/ui/CalendarGrid.tsx`
- Modify: `src/widgets/day-events/ui/DayEventsList.tsx`
- Modify: `src/widgets/guild-announcements/ui/GuildAnnouncements.tsx`

**Interfaces:**
- Consumes: `canPerform` from `@/shared/api/guildPermissions`; `Guild.permissions` (Task 6); `useGetGuildsQuery` (existing).
- Produces: `useGuildPermissions` return additionally includes `canCreateEvents`, `canCreateAnnouncements`, `canCreatePolls`, `canCreateCallToActions` (existing `canManageEvents`, `canManageMembers`, `isOwner` unchanged).

- [ ] **Step 1: Update the hook test**

In `src/entities/guild/lib/useGuildPermissions.test.ts`, add cases asserting the new flags. Match the existing test's mocking style for `useGetGuildMembersQuery`, and mock `useGetGuildsQuery` to return a guild whose `permissions` drive the flags. Example assertions (adapt to the file's existing harness):

```ts
// MEMBER in a guild with default permissions: can create polls (default 'all')
// but not events (default 'officers').
expect(result.current.canCreatePolls).toBe(true);
expect(result.current.canCreateEvents).toBe(false);
// ADMIN can create events.
expect(adminResult.current.canCreateEvents).toBe(true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/entities/guild/lib/useGuildPermissions.test.ts`
Expected: FAIL — `canCreatePolls` / `canCreateEvents` undefined.

- [ ] **Step 3: Implement the hook**

Rewrite `src/entities/guild/lib/useGuildPermissions.ts`:

```ts
'use client';

import { useGetGuildMembersQuery, useGetGuildsQuery } from '../api/guildApi';
import { canPerform } from '@/shared/api/guildPermissions';

export function useGuildPermissions(
  guildId: string | null | undefined,
  userId: string | null | undefined,
) {
  const { data: members = [] } = useGetGuildMembersQuery(guildId ?? '', {
    skip: !guildId || !userId,
  });
  const { data: guilds = [] } = useGetGuildsQuery(undefined, { skip: !guildId });

  const myRole = members.find((m) => m.userId === userId)?.role;
  const isOwner = myRole === 'OWNER';
  const elevated = isOwner || myRole === 'ADMIN';

  const permissions = guilds.find((g) => g.id === guildId)?.permissions ?? null;

  return {
    canManageEvents: elevated,
    canManageMembers: elevated,
    isOwner,
    canCreateEvents: canPerform(permissions, 'events', myRole),
    canCreateAnnouncements: canPerform(permissions, 'announcements', myRole),
    canCreatePolls: canPerform(permissions, 'polls', myRole),
    canCreateCallToActions: canPerform(permissions, 'call_to_actions', myRole),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/entities/guild/lib/useGuildPermissions.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate the event create buttons**

In `src/widgets/calendar/ui/CalendarGrid.tsx`:
- Destructure `canCreateEvents` instead of (or in addition to) `canManageEvents`:
  `const { canCreateEvents } = useGuildPermissions(activeGuildId, userId);`
- Change the create-button condition (line ~172) from `canManageEvents` to `canCreateEvents`.

In `src/widgets/day-events/ui/DayEventsList.tsx`:
- Destructure both: `const { canCreateEvents, canManageEvents } = useGuildPermissions(activeGuildId, userId);`
- Create-button conditions (lines ~167, ~195): use `canCreateEvents`.
- Delete handler (line ~187): keep `canManageEvents`.

- [ ] **Step 6: Gate the poll create button**

In `src/widgets/guild-announcements/ui/GuildAnnouncements.tsx`:
- Import and call the hook: `import { useGuildPermissions } from '@/entities/guild';` then
  `const { canCreatePolls } = useGuildPermissions(activeGuildId ?? '', userId);`
- Wrap the poll create `<Tooltip>/<Button>` block (lines ~89–99) in `{canCreatePolls && ( ... )}`.

- [ ] **Step 7: Typecheck + run the touched widget tests**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -iE "useGuildPermissions|CalendarGrid|DayEventsList|GuildAnnouncements" || echo "clients clean"`
Expected: `clients clean`.

- [ ] **Step 8: Commit**

```bash
git add src/entities/guild/lib/useGuildPermissions.ts src/entities/guild/lib/useGuildPermissions.test.ts src/widgets/calendar/ui/CalendarGrid.tsx src/widgets/day-events/ui/DayEventsList.tsx src/widgets/guild-announcements/ui/GuildAnnouncements.tsx
git commit -m "feat: gate create buttons by per-action guild permissions"
```

---

## Task 8: Permissions section in the guild wizard + i18n

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`
- Modify: `src/features/manage-guilds/ui/EditGuildWizard.tsx`
- Modify: `src/features/manage-guilds/ui/EditGuildWizard.module.css`

**Interfaces:**
- Consumes: `GUILD_ACTIONS`, `DEFAULT_PERMISSIONS`, `resolveLevel`, types from `@/shared/api/guildPermissions`; `Select` from `@/shared/ui/Select`; `useGuildPermissions` (for `isOwner`); `useUpdateGuildMutation` permissions arg (Task 6).

- [ ] **Step 1: Add i18n keys (both files, full parity)**

Add to the `Guild` namespace in `messages/en.json`:

```json
    "permissionsSection": "Permissions",
    "permEvents": "Events",
    "permAnnouncements": "Announcements",
    "permPolls": "Polls",
    "permCallToActions": "Looking for group",
    "permLevelAll": "All members",
    "permLevelOfficers": "Officers",
    "permLevelOwner": "Owner"
```

And the matching `Guild` keys in `messages/ru.json`:

```json
    "permissionsSection": "Права",
    "permEvents": "События",
    "permAnnouncements": "Анонсы",
    "permPolls": "Опросы",
    "permCallToActions": "Поиск спутников",
    "permLevelAll": "Все участники",
    "permLevelOfficers": "Офицеры",
    "permLevelOwner": "Владелец"
```

- [ ] **Step 2: Add permissions state + UI to the wizard**

In `src/features/manage-guilds/ui/EditGuildWizard.tsx`:

- Imports:

```ts
import { Select } from '@/shared/ui/Select';
import { useGuildPermissions } from '@/entities/guild';
import { GUILD_ACTIONS, DEFAULT_PERMISSIONS, resolveLevel, type GuildAction, type PermissionLevel, type GuildPermissions } from '@/shared/api/guildPermissions';
import { ShieldCheck } from 'lucide-react';
```

- Owner check (create mode: creator is owner):

```ts
  const { isOwner } = useGuildPermissions(guild?.id, userId);
  const canEditPermissions = isEdit ? isOwner : true;
```

- Initialize state from the guild (defaults when absent):

```ts
  const [permissions, setPermissions] = useState<GuildPermissions>(() => {
    const base = (guild?.permissions ?? {}) as GuildPermissions;
    return Object.fromEntries(
      GUILD_ACTIONS.map((a) => [a, base[a] ?? DEFAULT_PERMISSIONS[a]]),
    ) as GuildPermissions;
  });
```

- Action/level label maps (translated):

```ts
  const actionLabel: Record<GuildAction, string> = {
    events: t('permEvents'),
    announcements: t('permAnnouncements'),
    polls: t('permPolls'),
    call_to_actions: t('permCallToActions'),
  };
  const levelOptions: { label: string; value: PermissionLevel }[] = [
    { label: t('permLevelAll'), value: 'all' },
    { label: t('permLevelOfficers'), value: 'officers' },
    { label: t('permLevelOwner'), value: 'owner' },
  ];
```

- Render block inside the `settings` tab (after the avatar group, before the danger zone), gated by `canEditPermissions`:

```tsx
                  {canEditPermissions && (
                    <div className={styles.permGroup}>
                      <div className={styles.stubHeader}>
                        <ShieldCheck size={16} aria-hidden="true" />
                        <span className={styles.stubLabel}>{t('permissionsSection')}</span>
                      </div>
                      <ul className={styles.permList}>
                        {GUILD_ACTIONS.map((action) => (
                          <li key={action} className={styles.permRow}>
                            <span className={styles.permRowLabel}>{actionLabel[action]}</span>
                            <Select
                              value={resolveLevel(permissions, action)}
                              onValueChange={(v) =>
                                setPermissions((prev) => ({ ...prev, [action]: v as PermissionLevel }))
                              }
                              options={levelOptions}
                              className={styles.permSelect}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
```

- [ ] **Step 3: Send `permissions` on submit (create + edit)**

In `handleSubmit`, include `permissions` in both `updateGuild` calls:

- Edit branch `updateGuild({ ... })` → add `permissions,`.
- Create branch: the existing post-create `updateGuild({ id: newGuild.id, name, description, avatarUrl })` already runs only when there is an avatar. Ensure `permissions` is always persisted after create even without an avatar. Replace the create-branch avatar block so the post-create update always runs:

```ts
        const newGuild = await createGuild({ name: name.trim(), description: description.trim() }).unwrap();
        let avatarUrl: string | undefined;
        if (avatarBlob) {
          setIsUploadingAvatar(true);
          avatarUrl = await uploadGuildAvatar(newGuild.id, avatarBlob);
        }
        await updateGuild({
          id: newGuild.id,
          name: name.trim(),
          description: description.trim(),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
          permissions,
        }).unwrap();
```

(Keep the existing `pendingEmails` loop and success toast that follow.)

- [ ] **Step 4: Add CSS for the section**

In `src/features/manage-guilds/ui/EditGuildWizard.module.css`, add (reuse existing token vars/patterns from the file — match `.stubGroup`/`.stubHeader` spacing):

```css
.permGroup {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.permList {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.permRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.permRowLabel {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.permSelect {
  min-width: 9.5rem;
}
```

- [ ] **Step 5: Verify build of the touched files + full run of guild tests**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -iE "EditGuildWizard" || echo "wizard clean"`
Expected: `wizard clean`.

Run: `pnpm test:run src/shared/api/guildPermissions.test.ts src/entities/guild/lib/useGuildPermissions.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify i18n key parity**

Run: `node -e "const e=require('./messages/en.json'),r=require('./messages/ru.json');const ek=Object.keys(e.Guild),rk=Object.keys(r.Guild);const miss=ek.filter(k=>!rk.includes(k)).concat(rk.filter(k=>!ek.includes(k)));console.log(miss.length?'MISMATCH: '+miss:'Guild namespace parity OK')"`
Expected: `Guild namespace parity OK`.

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/ru.json src/features/manage-guilds/ui/EditGuildWizard.tsx src/features/manage-guilds/ui/EditGuildWizard.module.css
git commit -m "feat: guild permissions matrix UI in settings tab"
```

---

## Final verification

- [ ] Run `pnpm test:run` — new resolver + hook tests pass; no regressions in touched suites.
- [ ] Run `pnpm lint` on touched files — no new errors.
- [ ] `graphify update .` to refresh the knowledge graph.
- [ ] Update `CLAUDE.md` Database Schema table: add `permissions` (jsonb) to the `guilds` row, and note the per-action create-permission model under the Route Handler Authorization section (mention `requireGuildPermission`).

## Self-Review notes (coverage)

- Spec "Data model" → Task 2 (column + types).
- Spec "Server — enforcement" → Task 1 (resolver), Task 3 (`requireGuildPermission`), Task 4 (4 routes), Task 5 (canCreate in reads).
- Spec "Server — saving the matrix" → Task 6 (PATCH + mutation). Note: PATCH is already owner-gated (`requireGuildOwner`) for ALL fields, so the spec's "gate with requireGuildOwner when permissions present" is satisfied by the existing route gate — no extra conditional owner check needed.
- Spec "Client — UX gating" → Task 6 (Guild.permissions + getGuilds), Task 7 (hook + button gates).
- Spec "UI — Settings tab" → Task 8.
- Spec "i18n" → Task 8 Step 1 + parity check Step 6.
- Spec "Testing" → Task 1 (resolver units), Task 7 (hook units). Route-level enforcement verified by typecheck + manual; deeper route tests optional and not blocking.
