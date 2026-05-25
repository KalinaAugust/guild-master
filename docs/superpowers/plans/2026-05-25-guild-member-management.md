# Guild Member Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tab-based right panel to EditGuildWizard with a Members tab (add by email, list, remove) and Settings tab (avatar placeholder), backed by two new API endpoints.

**Architecture:** RTK Query mutations (`addGuildMember`, `removeGuildMember`) in `entities/guild/api/guildApi.ts`. Two new Next.js route handlers for POST/DELETE. New `GuildMembersSection` component in `features/manage-guilds`. `EditGuildWizard` right column replaced with tab switcher.

**Tech Stack:** Next.js App Router route handlers, RTK Query, Supabase (anon client for auth/DB, admin client for user lookup by email), React, CSS Modules, lucide-react.

---

## Prerequisites

Add to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key_from_supabase_dashboard>
```
This key is server-only (not prefixed with `NEXT_PUBLIC_`). Never expose it to the client.

---

## Files

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/shared/api/supabase/admin.ts` | Supabase admin client (service role) |
| Modify | `src/entities/guild/api/guildApi.ts` | Add `addGuildMember`, `removeGuildMember` mutations |
| Modify | `src/entities/guild/index.ts` | Export new hooks |
| Modify | `src/app/api/guilds/[id]/members/route.ts` | Add POST handler |
| Create | `src/app/api/guilds/[id]/members/[userId]/route.ts` | DELETE handler |
| Create | `src/features/manage-guilds/ui/GuildMembersSection.tsx` | Members tab UI |
| Create | `src/features/manage-guilds/ui/GuildMembersSection.module.css` | Members tab styles |
| Create | `src/features/manage-guilds/ui/GuildMembersSection.test.tsx` | Unit tests |
| Modify | `src/features/manage-guilds/ui/EditGuildWizard.tsx` | Replace right column with tabs |
| Modify | `src/features/manage-guilds/ui/EditGuildWizard.module.css` | Tab bar styles |

---

### Task 1: Supabase admin client

**Files:**
- Create: `src/shared/api/supabase/admin.ts`

- [ ] **Step 1: Create the admin client helper**

Create `src/shared/api/supabase/admin.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/api/supabase/admin.ts
git commit -m "feat(supabase): add admin client helper for service-role operations"
```

---

### Task 2: RTK Query mutations

**Files:**
- Modify: `src/entities/guild/api/guildApi.ts`
- Modify: `src/entities/guild/index.ts`

- [ ] **Step 1: Add mutations to guildApi.ts**

In `src/entities/guild/api/guildApi.ts`, add two new endpoints inside `injectEndpoints` after `updateGuild`:

```ts
    addGuildMember: builder.mutation<GuildMember, { guildId: string; email: string }>({
      query: ({ guildId, email }) => ({
        url: `guilds/${guildId}/members`,
        method: 'POST',
        body: { email },
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'GuildMember' as const, id: `LIST-${guildId}` },
      ],
    }),
    removeGuildMember: builder.mutation<{ success: boolean }, { guildId: string; userId: string }>({
      query: ({ guildId, userId }) => ({
        url: `guilds/${guildId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'GuildMember' as const, id: `LIST-${guildId}` },
      ],
    }),
```

Also add the new hooks to the existing destructured export at the bottom of the same file:

```ts
export const {
  useGetGuildMembersQuery,
  useGetGuildsQuery,
  useCreateGuildMutation,
  useDeleteGuildMutation,
  useUpdateGuildMutation,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
} = guildApi;
```

- [ ] **Step 2: Export new hooks from index.ts**

In `src/entities/guild/index.ts`, update the named export block:

```ts
export * from './model/types';
export * from './model/slice';
export * from './api/getGuilds';
export {
  useGetGuildMembersQuery,
  useGetGuildsQuery,
  useCreateGuildMutation,
  useDeleteGuildMutation,
  useUpdateGuildMutation,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
} from './api/guildApi';
```

- [ ] **Step 3: Commit**

```bash
git add src/entities/guild/api/guildApi.ts src/entities/guild/index.ts
git commit -m "feat(guild): add addGuildMember and removeGuildMember RTK mutations"
```

---

### Task 3: POST /api/guilds/[id]/members

**Files:**
- Modify: `src/app/api/guilds/[id]/members/route.ts`

- [ ] **Step 1: Add POST handler to the existing route file**

Replace the full content of `src/app/api/guilds/[id]/members/route.ts` with:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';
import { createClient } from '@/shared/api/supabase/server';
import { createAdminClient } from '@/shared/api/supabase/admin';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getGuildMembers(id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch guild members' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const body = await request.json();
  const email: string | undefined = body?.email;
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const { data: callerMembership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .single();

  if (!callerMembership || !['OWNER', 'ADMIN'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data: { user: targetUser }, error: lookupError } =
    await adminClient.auth.admin.getUserByEmail(email);

  if (lookupError || !targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('guild_members')
    .select('user_id')
    .eq('guild_id', guildId)
    .eq('user_id', targetUser.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 });
  }

  const { error: insertError } = await supabase
    .from('guild_members')
    .insert({ guild_id: guildId, user_id: targetUser.id, role: 'MEMBER' });

  if (insertError) {
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }

  const { data: newRow } = await supabase
    .from('guild_members')
    .select('user_id, role, profiles(full_name, avatar_url)')
    .eq('guild_id', guildId)
    .eq('user_id', targetUser.id)
    .single();

  type ProfileShape = { full_name: string | null; avatar_url: string | null } | null;

  return NextResponse.json({
    userId: newRow!.user_id,
    role: newRow!.role,
    profile: {
      fullName: (newRow!.profiles as ProfileShape)?.full_name ?? null,
      avatarUrl: (newRow!.profiles as ProfileShape)?.avatar_url ?? null,
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/guilds/[id]/members/route.ts"
git commit -m "feat(api): add POST /guilds/[id]/members — add member by email"
```

---

### Task 4: DELETE /api/guilds/[id]/members/[userId]

**Files:**
- Create: `src/app/api/guilds/[id]/members/[userId]/route.ts`

- [ ] **Step 1: Create the DELETE route handler**

Create `src/app/api/guilds/[id]/members/[userId]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId, userId } = await params;

  const { data: callerMembership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .single();

  if (!callerMembership || !['OWNER', 'ADMIN'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ error: 'Cannot remove guild owner' }, { status: 403 });
  }

  const { error } = await supabase
    .from('guild_members')
    .delete()
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/guilds/[id]/members/[userId]/route.ts"
git commit -m "feat(api): add DELETE /guilds/[id]/members/[userId] — remove member"
```

---

### Task 5: Write failing tests for GuildMembersSection

**Files:**
- Create: `src/features/manage-guilds/ui/GuildMembersSection.test.tsx`

- [ ] **Step 1: Create the test file**

Create `src/features/manage-guilds/ui/GuildMembersSection.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildMembersSection } from './GuildMembersSection';

vi.mock('@/entities/guild', () => ({
  useGetGuildMembersQuery: vi.fn(),
  useAddGuildMemberMutation: vi.fn(),
  useRemoveGuildMemberMutation: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
} from '@/entities/guild';

const mockMembers = [
  { userId: 'u1', role: 'OWNER' as const, profile: { fullName: 'Alice', avatarUrl: null } },
  { userId: 'u2', role: 'MEMBER' as const, profile: { fullName: 'Bob', avatarUrl: null } },
];

describe('GuildMembersSection', () => {
  const addMemberMock = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  const removeMemberMock = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

  beforeEach(() => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: mockMembers, isLoading: false } as never
    );
    vi.mocked(useAddGuildMemberMutation).mockReturnValue(
      [addMemberMock, { isLoading: false }] as never
    );
    vi.mocked(useRemoveGuildMemberMutation).mockReturnValue(
      [removeMemberMock, { isLoading: false }] as never
    );
  });

  it('renders member names', () => {
    render(<GuildMembersSection guildId="g1" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('Add button is disabled when email input is empty', () => {
    render(<GuildMembersSection guildId="g1" />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('Add button is enabled after typing email', () => {
    render(<GuildMembersSection guildId="g1" />);
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { value: 'test@test.com' },
    });
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
  });

  it('calls addGuildMember with guildId and email on submit', () => {
    render(<GuildMembersSection guildId="g1" />);
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(addMemberMock).toHaveBeenCalledWith({ guildId: 'g1', email: 'new@example.com' });
  });

  it('does not show remove button for OWNER', () => {
    render(<GuildMembersSection guildId="g1" />);
    const removeButtons = screen.getAllByRole('button', { name: 'Remove member' });
    expect(removeButtons).toHaveLength(1);
  });

  it('calls removeGuildMember with correct ids when remove clicked', () => {
    render(<GuildMembersSection guildId="g1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove member' }));
    expect(removeMemberMock).toHaveBeenCalledWith({ guildId: 'g1', userId: 'u2' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test:run -- GuildMembersSection
```

Expected: FAIL with `Cannot find module './GuildMembersSection'`

---

### Task 6: Implement GuildMembersSection

**Files:**
- Create: `src/features/manage-guilds/ui/GuildMembersSection.tsx`
- Create: `src/features/manage-guilds/ui/GuildMembersSection.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/features/manage-guilds/ui/GuildMembersSection.module.css`:

```css
.root {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.addForm {
  display: flex;
  gap: 8px;
}

.emailInput {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  height: 40px;
  padding: 0 12px;
  color: var(--text-primary);
  font-size: 0.875rem;
  min-width: 0;
}

.emailInput::placeholder {
  color: var(--text-muted);
}

.emailInput:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
}

.name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.removeBtn {
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

.removeBtn:hover {
  color: var(--event-raid-border);
  background: rgba(235, 64, 52, 0.1);
}

.loading {
  color: var(--text-muted);
  font-size: 0.875rem;
  text-align: center;
  padding: 16px 0;
}

.empty {
  color: var(--text-muted);
  font-size: 0.875rem;
  text-align: center;
  padding: 16px 0;
}
```

- [ ] **Step 2: Create the component**

Create `src/features/manage-guilds/ui/GuildMembersSection.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
} from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import styles from './GuildMembersSection.module.css';

interface GuildMembersSectionProps {
  guildId: string;
}

export const GuildMembersSection: React.FC<GuildMembersSectionProps> = ({ guildId }) => {
  const [email, setEmail] = useState('');
  const { data: members = [], isLoading } = useGetGuildMembersQuery(guildId);
  const [addMember, { isLoading: isAdding }] = useAddGuildMemberMutation();
  const [removeMember] = useRemoveGuildMemberMutation();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await addMember({ guildId, email: email.trim() }).unwrap();
      setEmail('');
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 404) toast.error('User with this email not found');
      else if (status === 409) toast.error('User is already a member');
      else toast.error('Failed to add member');
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeMember({ guildId, userId }).unwrap();
    } catch {
      toast.error('Failed to remove member');
    }
  };

  return (
    <div className={styles.root}>
      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className={styles.emailInput}
        />
        <Button type="submit" variant="primary" disabled={!email.trim() || isAdding}>
          Add
        </Button>
      </form>

      {isLoading ? (
        <p className={styles.loading}>Loading…</p>
      ) : members.length === 0 ? (
        <p className={styles.empty}>No members yet.</p>
      ) : (
        <ul className={styles.list}>
          {members.map((member) => (
            <li key={member.userId} className={styles.item}>
              <span className={styles.name}>
                {member.profile.fullName ?? member.userId}
              </span>
              <span className={styles.role}>{member.role}</span>
              {member.role !== 'OWNER' && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemove(member.userId)}
                  aria-label="Remove member"
                >
                  <UserMinus size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Run tests — expect PASS**

```bash
npm run test:run -- GuildMembersSection
```

Expected: 6 tests pass.

- [ ] **Step 4: Run full test suite — expect green**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/manage-guilds/ui/GuildMembersSection.tsx \
        src/features/manage-guilds/ui/GuildMembersSection.module.css \
        src/features/manage-guilds/ui/GuildMembersSection.test.tsx
git commit -m "feat(manage-guilds): add GuildMembersSection component with TDD"
```

---

### Task 7: Tab UI in EditGuildWizard

**Files:**
- Modify: `src/features/manage-guilds/ui/EditGuildWizard.tsx`
- Modify: `src/features/manage-guilds/ui/EditGuildWizard.module.css`

- [ ] **Step 1: Add tab styles to EditGuildWizard.module.css**

Append to the end of `src/features/manage-guilds/ui/EditGuildWizard.module.css` (before the closing `@media` block — insert before line 148):

```css
.tabBar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: 24px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.tab:hover {
  color: var(--text-primary);
}

.tabActive {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}

.tabEmpty {
  color: var(--text-muted);
  font-size: 0.875rem;
  text-align: center;
  margin-top: 48px;
}
```

- [ ] **Step 2: Rewrite EditGuildWizard.tsx**

Replace the full content of `src/features/manage-guilds/ui/EditGuildWizard.tsx` with:

```tsx
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Image as ImageIcon, Users, Settings } from 'lucide-react';
import { Guild, useCreateGuildMutation, useUpdateGuildMutation } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import { GuildMembersSection } from './GuildMembersSection';
import styles from './EditGuildWizard.module.css';

type Tab = 'members' | 'settings';

interface GuildWizardProps {
  open: boolean;
  guild: Guild | null;
  onClose: () => void;
}

export const EditGuildWizard: React.FC<GuildWizardProps> = ({ open, guild, onClose }) => {
  const t = useTranslations('Guild');
  const commonT = useTranslations('Common');
  const isEdit = guild !== null;

  const [name, setName] = useState(guild?.name ?? '');
  const [description, setDescription] = useState(guild?.description ?? '');
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [createGuild, { isLoading: isCreating }] = useCreateGuildMutation();
  const [updateGuild, { isLoading: isUpdating }] = useUpdateGuildMutation();
  const isLoading = isCreating || isUpdating;

  const handleClose = () => {
    if (!isEdit) {
      setName('');
      setDescription('');
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (isEdit) {
        await updateGuild({ id: guild.id, name: name.trim(), description: description.trim() }).unwrap();
        toast.success(t('successUpdated'));
      } else {
        await createGuild({ name: name.trim(), description: description.trim() }).unwrap();
        toast.success(t('successCreated'));
      }
      handleClose();
    } catch {
      toast.error(t('errorCreate'));
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className={styles.overlay} aria-describedby={undefined}>
          <div className={styles.header}>
            <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
              <X size={20} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className={styles.title}>
              {isEdit ? t('editTitle') : t('createTitle')}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <div className={styles.column}>
              <form id="guild-wizard-form" onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="guild-wizard-name">{t('nameLabel')}</label>
                  <input
                    id="guild-wizard-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.input}
                    required
                    autoFocus
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="guild-wizard-description">{t('descriptionLabel')}</label>
                  <textarea
                    id="guild-wizard-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={styles.textarea}
                  />
                </div>
              </form>
            </div>

            <div className={styles.column}>
              <div className={styles.tabBar}>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'members' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('members')}
                >
                  <Users size={15} />
                  {t('membersSection')}
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings size={15} />
                  {t('settingsSection')}
                </button>
              </div>

              {activeTab === 'members' && (
                guild
                  ? <GuildMembersSection guildId={guild.id} />
                  : <p className={styles.tabEmpty}>Save guild first to manage members.</p>
              )}

              {activeTab === 'settings' && (
                <div className={styles.stubGroup}>
                  <div className={styles.stubHeader}>
                    <ImageIcon size={16} aria-hidden="true" />
                    <span className={styles.stubLabel}>{t('avatarSection')}</span>
                  </div>
                  <div className={styles.stubField}>{t('comingSoon')}</div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              form="guild-wizard-form"
              disabled={!name.trim() || isLoading}
            >
              {isEdit
                ? isLoading ? commonT('saving') : commonT('save')
                : isLoading ? t('creating') : t('submit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
```

- [ ] **Step 3: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/manage-guilds/ui/EditGuildWizard.tsx \
        src/features/manage-guilds/ui/EditGuildWizard.module.css
git commit -m "feat(manage-guilds): replace right panel with Members/Settings tab switcher"
```
