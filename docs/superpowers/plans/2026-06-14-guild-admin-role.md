# Guild Admin Role Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a guild OWNER promote a MEMBER to ADMIN and revoke it via a per-row `⋮` menu in the members list, with admins able to manage only regular members.

**Architecture:** Add a `PATCH` role-change endpoint (owner-only) alongside the existing member route and tighten `DELETE` so only the owner can remove an admin. Expose an `updateGuildMemberRole` RTK Query mutation and an `isOwner` flag from `useGuildPermissions`. Replace the inline remove button in `GuildMembersSection` with a Radix `DropdownMenu` whose items are computed from viewer role × target role, reusing `ConfirmModal` for all actions.

**Tech Stack:** Next.js 16 route handlers, Supabase JS, RTK Query (`injectEndpoints` on `baseApi`), React 19, Radix `DropdownMenu`, CSS Modules, next-intl, Vitest + Testing Library.

---

## File Structure

- `src/app/api/guilds/[id]/members/[userId]/route.ts` — add `PATCH` (role change, owner-only); amend `DELETE` (admin can't remove admin).
- `src/app/api/guilds/[id]/members/[userId]/route.test.ts` — tests for new `PATCH` + new `DELETE` case.
- `src/entities/guild/api/guildApi.ts` — `updateGuildMemberRole` mutation + export hook.
- `src/entities/guild/lib/useGuildPermissions.ts` — return `isOwner`.
- `src/entities/guild/index.ts` — export `useUpdateGuildMemberRoleMutation`.
- `src/widgets/guild-members/ui/GuildMembersSection.tsx` — `⋮` dropdown, role actions, sorting.
- `src/widgets/guild-members/ui/GuildMembersSection.module.css` — dropdown styles.
- `src/widgets/guild-members/ui/GuildMembersSection.test.tsx` — menu-by-role tests.
- `messages/en.json`, `messages/ru.json` — `GuildMembers` keys.

---

## Task 1: Backend — `PATCH` role change + tighten `DELETE`

**Files:**
- Modify: `src/app/api/guilds/[id]/members/[userId]/route.ts`
- Test: `src/app/api/guilds/[id]/members/[userId]/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Append these to `route.test.ts`. First extend the existing import line and add the `requireGuildOwner` mock:

```ts
import { DELETE, PATCH } from './route';
import { requireUser, requireGuildRole, requireGuildOwner } from '@/shared/api/guildAuth';
```

Add to the top-level `vi.mock('@/shared/api/guildAuth')` block — it already auto-mocks all exports, so no change needed there. In `beforeEach`, add a default allow for the owner gate:

```ts
  vi.mocked(requireGuildOwner).mockResolvedValue(null); // owner by default
```

Add a helper to build a PATCH request with a JSON body (place near `req`):

```ts
const patchReq = (body: unknown) => ({ json: () => Promise.resolve(body) }) as never;
```

Then add these describe blocks:

```ts
describe('PATCH /api/guilds/[id]/members/[userId] (role change)', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await PATCH(patchReq({ role: 'ADMIN' }), params('g1', 'u2'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when the caller is not the owner', async () => {
    authed(vi.fn());
    vi.mocked(requireGuildOwner).mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );
    const res = await PATCH(patchReq({ role: 'ADMIN' }), params('g1', 'u2'));
    expect(res.status).toBe(403);
    expect(requireGuildOwner).toHaveBeenCalledWith(expect.anything(), 'g1', 'admin1');
  });

  it('returns 400 for an invalid role value', async () => {
    authed(vi.fn());
    const res = await PATCH(patchReq({ role: 'OWNER' }), params('g1', 'u2'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the target is not a member', async () => {
    authed(vi.fn().mockReturnValue(query({ data: null })));
    const res = await PATCH(patchReq({ role: 'ADMIN' }), params('g1', 'u2'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when targeting the guild owner', async () => {
    authed(vi.fn().mockReturnValue(query({ data: { role: 'OWNER' } })));
    const res = await PATCH(patchReq({ role: 'MEMBER' }), params('g1', 'owner1'));
    expect(res.status).toBe(403);
  });

  it('returns 200 and promotes a member to admin', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { role: 'MEMBER' } }))
      .mockReturnValueOnce(query({ error: null }));
    authed(from);
    const res = await PATCH(patchReq({ role: 'ADMIN' }), params('g1', 'u2'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('returns 500 when the update fails', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { role: 'MEMBER' } }))
      .mockReturnValueOnce(query({ error: { message: 'boom' } }));
    authed(from);
    const res = await PATCH(patchReq({ role: 'ADMIN' }), params('g1', 'u2'));
    expect(res.status).toBe(500);
  });
});

describe('DELETE — admin cannot remove an admin', () => {
  it('returns 403 when caller is admin and target is admin', async () => {
    authed(vi.fn().mockReturnValue(query({ data: { role: 'ADMIN' } })));
    vi.mocked(requireGuildOwner).mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );
    const res = await DELETE(req, params('g1', 'admin2'));
    expect(res.status).toBe(403);
  });

  it('returns 200 when owner removes an admin', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { role: 'ADMIN' } }))
      .mockReturnValueOnce(query({ error: null }));
    authed(from);
    vi.mocked(requireGuildOwner).mockResolvedValue(null); // owner
    const res = await DELETE(req, params('g1', 'admin2'));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:run src/app/api/guilds/\[id\]/members/\[userId\]/route.test.ts`
Expected: FAIL — `PATCH is not a function` / new DELETE cases fail.

- [ ] **Step 3: Implement `PATCH` and amend `DELETE`**

Replace the entire contents of `route.ts` with:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireGuildRole, requireGuildOwner } from '@/shared/api/guildAuth';

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId, userId } = await params;

  const forbidden = await requireGuildRole(supabase, guildId, user.id, ['OWNER', 'ADMIN']);
  if (forbidden) return forbidden;

  const { data: targetMembership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!targetMembership) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  if (targetMembership.role === 'OWNER') {
    return NextResponse.json({ error: 'Cannot remove guild owner' }, { status: 403 });
  }

  // Only the owner may remove an admin.
  if (targetMembership.role === 'ADMIN') {
    const notOwner = await requireGuildOwner(supabase, guildId, user.id);
    if (notOwner) return notOwner;
  }

  const { error } = await supabase
    .from('guild_members')
    .delete()
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId, userId } = await params;

  // Granting and revoking the admin role is owner-only.
  const forbidden = await requireGuildOwner(supabase, guildId, user.id);
  if (forbidden) return forbidden;

  const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
  const role = body?.role;
  if (role !== 'ADMIN' && role !== 'MEMBER') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { data: targetMembership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!targetMembership) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  if (targetMembership.role === 'OWNER') {
    return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 });
  }

  const { error } = await supabase
    .from('guild_members')
    .update({ role })
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:run src/app/api/guilds/\[id\]/members/\[userId\]/route.test.ts`
Expected: PASS (all DELETE + PATCH cases green).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/guilds/[id]/members/[userId]/route.ts" "src/app/api/guilds/[id]/members/[userId]/route.test.ts"
git commit -m "feat(api): owner-only role change for guild members"
```

---

## Task 2: RTK Query mutation + permissions flag

**Files:**
- Modify: `src/entities/guild/api/guildApi.ts`
- Modify: `src/entities/guild/lib/useGuildPermissions.ts`
- Modify: `src/entities/guild/index.ts`

> No new unit test file: this layer is exercised through the widget tests in Task 3. Verification is `tsc`.

- [ ] **Step 1: Add the `updateGuildMemberRole` mutation**

In `guildApi.ts`, add this endpoint right after the `removeGuildMember` endpoint (inside the `endpoints` object):

```ts
    updateGuildMemberRole: builder.mutation<
      { success: boolean },
      { guildId: string; userId: string; role: 'ADMIN' | 'MEMBER' }
    >({
      query: ({ guildId, userId, role }) => ({
        url: `guilds/${guildId}/members/${userId}`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'GuildMember' as const, id: `LIST-${guildId}` },
      ],
    }),
```

- [ ] **Step 2: Export the hook**

In `guildApi.ts`, add `useUpdateGuildMemberRoleMutation,` to the destructured `export const { ... } = guildApi;` block (after `useRemoveGuildMemberMutation,`).

In `src/entities/guild/index.ts`, add `useUpdateGuildMemberRoleMutation,` to the existing `export { ... } from './api/guildApi';` list (after `useRemoveGuildMemberMutation,`).

- [ ] **Step 3: Expose `isOwner` from `useGuildPermissions`**

Replace the body of `src/entities/guild/lib/useGuildPermissions.ts` with:

```ts
'use client';

import { useGetGuildMembersQuery } from '../api/guildApi';

export function useGuildPermissions(
  guildId: string | null | undefined,
  userId: string | null | undefined,
) {
  const { data: members = [] } = useGetGuildMembersQuery(guildId ?? '', {
    skip: !guildId || !userId,
  });
  const myRole = members.find((m) => m.userId === userId)?.role;
  const isOwner = myRole === 'OWNER';
  const elevated = isOwner || myRole === 'ADMIN';
  return { canManageEvents: elevated, canManageMembers: elevated, isOwner };
}
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors referencing `guildApi.ts`, `useGuildPermissions.ts`, or `index.ts` (baseline has 3 pre-existing errors elsewhere — ignore those).

- [ ] **Step 5: Commit**

```bash
git add src/entities/guild/api/guildApi.ts src/entities/guild/lib/useGuildPermissions.ts src/entities/guild/index.ts
git commit -m "feat(guild): add updateGuildMemberRole mutation and isOwner flag"
```

---

## Task 3: i18n keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add English keys**

In `messages/en.json`, inside the `"GuildMembers"` object, add these keys (after `"removeError"`, adding a comma to the prior line):

```json
    "memberActions": "Member actions",
    "makeAdmin": "Make admin",
    "revokeAdmin": "Revoke admin",
    "promoteConfirm": "Make {name} an admin?",
    "revokeConfirm": "Revoke admin rights from {name}?",
    "confirm": "Confirm",
    "roleError": "Failed to update role"
```

- [ ] **Step 2: Add Russian keys**

In `messages/ru.json`, inside the `"GuildMembers"` object, add (after `"removeError"`, adding a comma to the prior line):

```json
    "memberActions": "Действия с участником",
    "makeAdmin": "Назначить админом",
    "revokeAdmin": "Снять админа",
    "promoteConfirm": "Назначить {name} админом?",
    "revokeConfirm": "Снять права админа с {name}?",
    "confirm": "Подтвердить",
    "roleError": "Не удалось изменить роль"
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "require('./messages/en.json');require('./messages/ru.json');console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "i18n(guild-members): add admin-role action strings"
```

---

## Task 4: Widget — `⋮` dropdown with role actions

**Files:**
- Modify: `src/widgets/guild-members/ui/GuildMembersSection.tsx`
- Modify: `src/widgets/guild-members/ui/GuildMembersSection.module.css`
- Test: `src/widgets/guild-members/ui/GuildMembersSection.test.tsx`

- [ ] **Step 1: Update the test mock and write failing menu tests**

In `GuildMembersSection.test.tsx`, update the `@/entities/guild` mock to include the new hook and `isOwner`:

```ts
vi.mock('@/entities/guild', () => ({
  useGetGuildMembersQuery: vi.fn(),
  useAddGuildMemberMutation: vi.fn(),
  useRemoveGuildMemberMutation: vi.fn(),
  useUpdateGuildMemberRoleMutation: vi.fn(),
  useGuildPermissions: vi.fn(() => ({ canManageMembers: false, isOwner: false })),
  resolveDisplayName: undefined,
}));
```

Note: `resolveDisplayName` comes from `@/entities/user`, which is NOT mocked here, so remove the stray `resolveDisplayName` line — instead add a `@/entities/user` mock block below the `@/entities/guild` mock:

```ts
vi.mock('@/entities/user', () => ({
  resolveDisplayName: ({ fullName }: { fullName: string | null }) => fullName,
}));
```

(Delete the `resolveDisplayName: undefined,` line from the guild mock.)

Extend the imports from `@/entities/guild`:

```ts
import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
  useUpdateGuildMemberRoleMutation,
  useGuildPermissions,
} from '@/entities/guild';
```

Add a role-mutation mock and register it in `beforeEach`:

```ts
  const updateRoleMock = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
```

```ts
    updateRoleMock.mockClear();
    vi.mocked(useUpdateGuildMemberRoleMutation).mockReturnValue(
      [updateRoleMock, { isLoading: false }] as never
    );
```

Add a 3-member fixture for menu tests (place under `mockMembers`):

```ts
const ownerMember = mockMembers[0]; // u1 OWNER
const regularMember = mockMembers[1]; // u2 MEMBER
const adminMember = {
  userId: 'u3', role: 'ADMIN' as const,
  profile: { publicId: null, fullName: 'Carol', avatarUrl: null, alias: null, displayAsAlias: false, icon: null },
};
```

The current tests reference a `removeMember`-named button directly. With the dropdown the actions live inside a menu opened by the `⋮` trigger (aria-label `memberActions`). Replace the three existing remove-related tests (`does not show remove button for OWNER`, `asks for confirmation before removing...`, `calls removeGuildMember...`) with these:

```ts
  it('shows an actions menu only for non-owner members when manager', () => {
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    // OWNER row has no actions trigger; one MEMBER row does.
    expect(screen.getAllByRole('button', { name: 'memberActions' })).toHaveLength(1);
  });

  it('owner sees Make admin + Remove for a member', () => {
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'memberActions' }));
    expect(screen.getByText('makeAdmin')).toBeInTheDocument();
    expect(screen.getByText('removeMember')).toBeInTheDocument();
  });

  it('owner sees Revoke admin for an admin', () => {
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, adminMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'memberActions' }));
    expect(screen.getByText('revokeAdmin')).toBeInTheDocument();
  });

  it('admin sees Remove for a member but no role action and no menu on an admin', () => {
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: false } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember, adminMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u9" />);
    // Only the MEMBER row exposes a menu (owner row + admin row do not).
    const triggers = screen.getAllByRole('button', { name: 'memberActions' });
    expect(triggers).toHaveLength(1);
    fireEvent.click(triggers[0]);
    expect(screen.getByText('removeMember')).toBeInTheDocument();
    expect(screen.queryByText('makeAdmin')).not.toBeInTheDocument();
  });

  it('promotes a member to admin after confirming', () => {
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'memberActions' }));
    fireEvent.click(screen.getByText('makeAdmin'));
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
    expect(updateRoleMock).toHaveBeenCalledWith({ guildId: 'g1', userId: 'u2', role: 'ADMIN' });
  });

  it('removes a member after confirming', () => {
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'memberActions' }));
    fireEvent.click(screen.getByText('removeMember'));
    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    expect(removeMemberMock).toHaveBeenCalledWith({ guildId: 'g1', userId: 'u2' });
  });
```

> The `'renders member names'` and `Add`/email-validation tests stay as-is. Those render without `userId`, so `effectiveCanManage` is true and no menu trigger is required by them.

- [ ] **Step 2: Run the widget tests to verify they fail**

Run: `pnpm test:run src/widgets/guild-members/ui/GuildMembersSection.test.tsx`
Expected: FAIL — `memberActions` trigger/menu items not found; `useUpdateGuildMemberRoleMutation` not exported by mock target.

- [ ] **Step 3: Add dropdown styles**

Append to `GuildMembersSection.module.css`:

```css
.menuTrigger {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.menuTrigger:hover,
.menuTrigger[data-state='open'] {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.06);
}

.menuContent {
  min-width: 180px;
  background: var(--modal-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 0.5rem;
  box-shadow: var(--shadow-glass);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  z-index: 1000;
}

.menuItem {
  font-size: 0.9rem;
  color: var(--text-primary);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.7rem;
  user-select: none;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menuItem:hover,
.menuItem[data-highlighted] {
  background: var(--accent-glow);
  color: var(--accent-secondary);
}

.menuItemDanger:hover,
.menuItemDanger[data-highlighted] {
  background: rgba(235, 64, 52, 0.1);
  color: var(--event-raid-border);
}
```

- [ ] **Step 4: Rewrite the widget**

Replace the entire contents of `GuildMembersSection.tsx` with:

```tsx
'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { UserMinus, Shield, ShieldOff, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import * as Form from '@radix-ui/react-form';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
  useUpdateGuildMemberRoleMutation,
  useGuildPermissions,
} from '@/entities/guild';
import { resolveDisplayName } from '@/entities/user';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ListRowSkeleton } from '@/shared/ui/ListRowSkeleton';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { NameWithIcon } from '@/shared/ui/NameWithIcon';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import styles from './GuildMembersSection.module.css';

interface GuildMembersSectionProps {
  guildId: string;
  userId?: string;
  readOnly?: boolean;
  /** Fill the parent's height and scroll only when members overflow. */
  fill?: boolean;
}

type PendingAction =
  | { type: 'remove'; userId: string; name: string }
  | { type: 'promote'; userId: string; name: string }
  | { type: 'revoke'; userId: string; name: string };

const ROLE_ORDER: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };

export const GuildMembersSection: React.FC<GuildMembersSectionProps> = ({ guildId, userId, readOnly = false, fill = false }) => {
  const t = useTranslations('GuildMembers');
  const [email, setEmail] = useState('');
  const { data: members = [], isLoading } = useGetGuildMembersQuery(guildId);
  const [addMember, { isLoading: isAdding }] = useAddGuildMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveGuildMemberMutation();
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateGuildMemberRoleMutation();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const { canManageMembers, isOwner } = useGuildPermissions(guildId, userId);
  const effectiveCanManage = !readOnly && (!userId || canManageMembers);

  const handleAdd = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!z.email().safeParse(trimmed).success) {
      toast.error(t('invalidEmail'));
      return;
    }
    try {
      await addMember({ guildId, email: trimmed }).unwrap();
      setEmail('');
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 404) toast.error(t('userNotFound'));
      else if (status === 409) toast.error(t('alreadyMember'));
      else toast.error(t('addError'));
    }
  };

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      if (pending.type === 'remove') {
        await removeMember({ guildId, userId: pending.userId }).unwrap();
      } else {
        await updateRole({
          guildId,
          userId: pending.userId,
          role: pending.type === 'promote' ? 'ADMIN' : 'MEMBER',
        }).unwrap();
      }
      setPending(null);
    } catch {
      toast.error(pending.type === 'remove' ? t('removeError') : t('roleError'));
    }
  };

  const confirmCopy = () => {
    if (!pending) return { title: '', description: undefined as string | undefined, label: '', variant: 'danger' as const };
    if (pending.type === 'remove') {
      return { title: t('removeMember'), description: t('removeConfirm', { name: pending.name }), label: t('remove'), variant: 'danger' as const };
    }
    if (pending.type === 'promote') {
      return { title: t('makeAdmin'), description: t('promoteConfirm', { name: pending.name }), label: t('confirm'), variant: 'primary' as const };
    }
    return { title: t('revokeAdmin'), description: t('revokeConfirm', { name: pending.name }), label: t('confirm'), variant: 'primary' as const };
  };
  const copy = confirmCopy();

  const sorted = [...members].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9),
  );

  return (
    <div className={`${styles.root} ${fill ? styles.rootFill : ''}`}>
      {effectiveCanManage && (
        <Form.Root onSubmit={handleAdd} className={styles.addForm} noValidate>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={styles.emailInput}
          />
          <Button type="submit" variant="primary" isLoading={isAdding} disabled={!email.trim()}>
            {t('add')}
          </Button>
        </Form.Root>
      )}

      {isLoading ? (
        <div className={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <ListRowSkeleton key={i} circle lines={1} />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className={styles.empty}>{t('empty')}</p>
      ) : (
        <ul className={`${styles.list} ${fill ? styles.listFill : ''}`}>
          {sorted.map((member) => {
            const memberName = resolveDisplayName({
              fullName: member.profile.fullName,
              alias: member.profile.alias,
              displayAsAlias: member.profile.displayAsAlias,
            });
            const isSelf = !!userId && member.userId === userId;
            const canRemove = effectiveCanManage && !isSelf && member.role !== 'OWNER' &&
              (member.role !== 'ADMIN' || isOwner);
            const canChangeRole = effectiveCanManage && !isSelf && isOwner && member.role !== 'OWNER';
            const showMenu = canRemove || canChangeRole;
            return (
            <li key={member.userId} className={styles.item}>
              <ProfileLink
                publicId={member.profile.publicId}
                aria-label={memberName ?? undefined}
              >
                <UserAvatar
                  avatarUrl={member.profile.avatarUrl}
                  name={memberName}
                  size="sm"
                />
              </ProfileLink>
              <ProfileLink publicId={member.profile.publicId} className={styles.name}>
                <NameWithIcon name={memberName ?? member.userId} icon={member.profile.icon} fallback={member.userId} iconSize={14} />
              </ProfileLink>
              <span className={styles.role}>{member.role}</span>
              {member.role === 'OWNER' && (
                <span className={styles.ownerIcon}>
                  <Shield size={14} />
                </span>
              )}
              {showMenu && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button type="button" className={styles.menuTrigger} aria-label={t('memberActions')}>
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className={styles.menuContent} side="bottom" align="end" sideOffset={4}>
                      {canChangeRole && member.role === 'MEMBER' && (
                        <DropdownMenu.Item
                          className={styles.menuItem}
                          onSelect={() => setPending({ type: 'promote', userId: member.userId, name: memberName ?? member.userId })}
                        >
                          <Shield size={16} />
                          <span>{t('makeAdmin')}</span>
                        </DropdownMenu.Item>
                      )}
                      {canChangeRole && member.role === 'ADMIN' && (
                        <DropdownMenu.Item
                          className={styles.menuItem}
                          onSelect={() => setPending({ type: 'revoke', userId: member.userId, name: memberName ?? member.userId })}
                        >
                          <ShieldOff size={16} />
                          <span>{t('revokeAdmin')}</span>
                        </DropdownMenu.Item>
                      )}
                      {canRemove && (
                        <DropdownMenu.Item
                          className={`${styles.menuItem} ${styles.menuItemDanger}`}
                          onSelect={() => setPending({ type: 'remove', userId: member.userId, name: memberName ?? member.userId })}
                        >
                          <UserMinus size={16} />
                          <span>{t('removeMember')}</span>
                        </DropdownMenu.Item>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              )}
            </li>
            );
          })}
        </ul>
      )}

      <ConfirmModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        title={copy.title}
        description={copy.description}
        confirmLabel={copy.label}
        variant={copy.variant}
        isLoading={isRemoving || isUpdatingRole}
      />
    </div>
  );
};
```

- [ ] **Step 5: Run the widget tests to verify they pass**

Run: `pnpm test:run src/widgets/guild-members/ui/GuildMembersSection.test.tsx`
Expected: PASS.

> If menu items rendered in a Radix `Portal` are not found by `screen.getByText`, they still attach to `document.body` and Testing Library's default `screen` queries the whole document — this works. If a future Radix version requires it, the test can switch to `within(document.body)`, but do not pre-emptively add that.

- [ ] **Step 6: Typecheck the widget**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors. (`ConfirmModal` accepts `variant?: 'danger' | 'primary'`, confirmed in `src/shared/ui/ConfirmModal/ConfirmModal.tsx`, so the `'primary'` variants used in `confirmCopy()` are valid.)

- [ ] **Step 7: Commit**

```bash
git add src/widgets/guild-members/ui/GuildMembersSection.tsx src/widgets/guild-members/ui/GuildMembersSection.module.css src/widgets/guild-members/ui/GuildMembersSection.test.tsx
git commit -m "feat(guild-members): row actions menu with admin promote/revoke"
```

---

## Task 5: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test:run`
Expected: PASS (no regressions).

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no new errors from touched files.

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: only the 3 pre-existing baseline errors (unrelated to this work).

- [ ] **Step 4: Confirm done**

All tasks complete; the members list supports owner-driven admin promotion/revocation and the role-gated `⋮` menu.

---

## Notes / pre-flight checks for the implementer

- **`ConfirmModal` variant union:** `variant?: 'danger' | 'primary'` (confirmed in `src/shared/ui/ConfirmModal/ConfirmModal.tsx`). Both variants used in `confirmCopy()` are valid.
- **`requireGuildOwner` signature:** `(supabase, guildId, userId) => Promise<NextResponse | null>`; returns `null` when the caller owns the guild. Confirmed in `src/shared/api/guildAuth.ts`.
- **Baseline failures to ignore:** master already has 3 `tsc` errors and 2 `lint:fsd` insignificant-slice warnings unrelated to this feature.
```
