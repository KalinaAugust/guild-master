# Guild Management Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/guilds/create` with a full Guild Management page at `/guilds` — guild list (owner + member sections), fullscreen create wizard with real API, fullscreen edit wizard with stubs, and delete confirmation.

**Architecture:** Local React state controls wizard open/close on the page — no Redux needed since wizards are only triggered from this page. RTK Query endpoints handle all data fetching/mutation via Next.js route handlers. New `manage-guilds` FSD feature slice owns all page-level UI.

**Tech Stack:** Next.js 15 App Router, RTK Query (`baseApi.injectEndpoints`), Radix UI Dialog, CSS Modules, lucide-react, next-intl, Supabase SSR.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `messages/en.json` | Add Guild i18n keys |
| Modify | `messages/ru.json` | Add Guild i18n keys (RU) |
| Modify | `src/shared/api/baseApi.ts` | Add `'Guild'` tagType |
| Modify | `src/entities/guild/api/guildApi.ts` | Add getGuilds, createGuild, deleteGuild endpoints |
| Modify | `src/entities/guild/index.ts` | Export new RTK hooks |
| Create | `src/app/api/guilds/route.ts` | GET (list) + POST (create) guild route handler |
| Create | `src/app/api/guilds/[id]/route.ts` | DELETE guild route handler |
| Create | `src/features/manage-guilds/ui/GuildList.tsx` | List component with edit/delete icons |
| Create | `src/features/manage-guilds/ui/GuildList.module.css` | Styles for list rows |
| Create | `src/features/manage-guilds/ui/GuildList.test.tsx` | Unit tests |
| Create | `src/features/manage-guilds/ui/CreateGuildWizard.tsx` | Fullscreen create wizard |
| Create | `src/features/manage-guilds/ui/CreateGuildWizard.module.css` | Wizard styles |
| Create | `src/features/manage-guilds/ui/CreateGuildWizard.test.tsx` | Unit tests |
| Create | `src/features/manage-guilds/ui/EditGuildWizard.tsx` | Fullscreen edit wizard (stubs) |
| Create | `src/features/manage-guilds/ui/EditGuildWizard.module.css` | Edit wizard styles (2-col) |
| Create | `src/features/manage-guilds/ui/GuildManagePage.tsx` | Page root component |
| Create | `src/features/manage-guilds/ui/GuildManagePage.module.css` | Page layout styles |
| Create | `src/features/manage-guilds/index.ts` | Feature public API |
| Create | `src/app/guilds/page.tsx` | Next.js page (server component) |
| Modify | `src/widgets/header/ui/UserMenu.tsx` | Update href + label key |
| Delete | `src/app/guilds/create/` | Entire folder |
| Delete | `src/features/create-guild/` | Entire folder |

---

## Task 1: Add i18n keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add Guild keys to en.json**

Open `messages/en.json`. Inside the `"Guild"` object, add these keys (keep existing keys):

```json
"manageTitle": "Manage Guilds",
"ownerSection": "You are the owner",
"memberSection": "You are a member",
"createButton": "Create Guild",
"editTitle": "Edit Guild",
"deleteSuccess": "Guild deleted",
"deleteConfirm": "Are you sure you want to delete this guild?",
"emptyOwned": "You don't own any guilds yet",
"emptyMember": "You are not a member of any guilds",
"editLabel": "Edit guild",
"deleteLabel": "Delete guild",
"avatarSection": "Avatar",
"membersSection": "Members",
"settingsSection": "Settings",
"comingSoon": "Coming soon",
"successCreated": "Guild created"
```

- [ ] **Step 2: Add Guild keys to ru.json**

Open `messages/ru.json`. Inside the `"Guild"` object, add:

```json
"manageTitle": "Управление гильдиями",
"ownerSection": "Вы владелец",
"memberSection": "Вы участник",
"createButton": "Создать гильдию",
"editTitle": "Редактировать гильдию",
"deleteSuccess": "Гильдия удалена",
"deleteConfirm": "Вы уверены, что хотите удалить эту гильдию?",
"emptyOwned": "У вас нет своих гильдий",
"emptyMember": "Вы не состоите ни в одной гильдии",
"editLabel": "Редактировать гильдию",
"deleteLabel": "Удалить гильдию",
"avatarSection": "Аватар",
"membersSection": "Участники",
"settingsSection": "Настройки",
"comingSoon": "Скоро",
"successCreated": "Гильдия создана"
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat(i18n): add guild management keys"
```

---

## Task 2: Add RTK Query endpoints for guilds

**Files:**
- Modify: `src/shared/api/baseApi.ts`
- Modify: `src/entities/guild/api/guildApi.ts`
- Modify: `src/entities/guild/index.ts`

- [ ] **Step 1: Add 'Guild' to baseApi tagTypes**

Replace the entire content of `src/shared/api/baseApi.ts`:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Event', 'Participant', 'GuildMember', 'Guild'],
  endpoints: () => ({}),
});
```

- [ ] **Step 2: Add getGuilds, createGuild, deleteGuild to guildApi.ts**

Replace the entire content of `src/entities/guild/api/guildApi.ts`:

```ts
import { baseApi } from '@/shared/api/baseApi';
import { Guild, GuildMember } from '../model/types';

export const guildApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGuildMembers: builder.query<GuildMember[], string>({
      query: (guildId) => `guilds/${guildId}/members`,
      providesTags: (result, _, guildId) =>
        result
          ? [
              ...result.map(({ userId }) => ({ type: 'GuildMember' as const, id: userId })),
              { type: 'GuildMember' as const, id: `LIST-${guildId}` },
            ]
          : [{ type: 'GuildMember' as const, id: `LIST-${guildId}` }],
    }),
    getGuilds: builder.query<Guild[], void>({
      query: () => 'guilds',
      providesTags: [{ type: 'Guild', id: 'LIST' }],
    }),
    createGuild: builder.mutation<Guild, { name: string; description?: string }>({
      query: (body) => ({ url: 'guilds', method: 'POST', body }),
      invalidatesTags: [{ type: 'Guild', id: 'LIST' }],
    }),
    deleteGuild: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `guilds/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Guild', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetGuildMembersQuery,
  useGetGuildsQuery,
  useCreateGuildMutation,
  useDeleteGuildMutation,
} = guildApi;
```

- [ ] **Step 3: Update entities/guild/index.ts exports**

Replace the entire content of `src/entities/guild/index.ts`:

```ts
export * from './model/types';
export * from './model/slice';
export * from './api/getGuilds';
export * from './api/createGuild';
export {
  useGetGuildMembersQuery,
  useGetGuildsQuery,
  useCreateGuildMutation,
  useDeleteGuildMutation,
} from './api/guildApi';
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to guildApi or baseApi.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/baseApi.ts src/entities/guild/api/guildApi.ts src/entities/guild/index.ts
git commit -m "feat(guild): add RTK Query endpoints for list, create, delete"
```

---

## Task 3: Add API route handlers for guilds

**Files:**
- Create: `src/app/api/guilds/route.ts`
- Create: `src/app/api/guilds/[id]/route.ts`

- [ ] **Step 1: Create GET + POST route handler**

Create `src/app/api/guilds/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('guild_members')
    .select('guild_id, guilds (id, name, owner_id, description)')
    .eq('user_id', user.id);

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 });
  }

  const guilds = data.reduce<Array<{ id: string; name: string; ownerId: string; description?: string }>>(
    (acc, m) => {
      const g = m.guilds as unknown as {
        id: string;
        name: string;
        owner_id: string;
        description: string | null;
      };
      if (g) {
        acc.push({
          id: g.id,
          name: g.name,
          ownerId: g.owner_id,
          description: g.description || undefined,
        });
      }
      return acc;
    },
    []
  );

  return NextResponse.json(guilds);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description } = await request.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  await supabase.from('profiles').upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
  });

  const { data: guild, error: guildError } = await supabase
    .from('guilds')
    .insert({ name, description: description || null, owner_id: user.id })
    .select()
    .single();

  if (guildError || !guild) {
    return NextResponse.json({ error: 'Failed to create guild' }, { status: 500 });
  }

  const { error: memberError } = await supabase
    .from('guild_members')
    .insert({ guild_id: guild.id, user_id: user.id, role: 'OWNER' });

  if (memberError) {
    return NextResponse.json({ error: 'Failed to add owner as member' }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: guild.id,
      name: guild.name,
      ownerId: guild.owner_id,
      description: guild.description || undefined,
    },
    { status: 201 }
  );
}
```

- [ ] **Step 2: Create DELETE route handler**

Create `src/app/api/guilds/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase.from('guilds').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to delete guild' }, { status: 500 });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in new route files.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/guilds/route.ts src/app/api/guilds/[id]/route.ts
git commit -m "feat(api): add guilds GET/POST and DELETE route handlers"
```

---

## Task 4: GuildList component

**Files:**
- Create: `src/features/manage-guilds/ui/GuildList.tsx`
- Create: `src/features/manage-guilds/ui/GuildList.module.css`
- Create: `src/features/manage-guilds/ui/GuildList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/manage-guilds/ui/GuildList.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GuildList } from './GuildList';
import type { Guild } from '@/entities/guild';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const guilds: Guild[] = [
  { id: '1', name: 'Alpha Guild', ownerId: 'user1' },
  { id: '2', name: 'Beta Guild', ownerId: 'user1', description: 'A great guild' },
];

describe('GuildList', () => {
  it('renders title and guild names', () => {
    render(
      <GuildList title="You are the owner" guilds={guilds} onEdit={vi.fn()} onDelete={vi.fn()} emptyMessage="No guilds" />
    );
    expect(screen.getByText('You are the owner')).toBeInTheDocument();
    expect(screen.getByText('Alpha Guild')).toBeInTheDocument();
    expect(screen.getByText('Beta Guild')).toBeInTheDocument();
  });

  it('renders description when present', () => {
    render(
      <GuildList title="Owner" guilds={guilds} onEdit={vi.fn()} onDelete={vi.fn()} emptyMessage="No guilds" />
    );
    expect(screen.getByText('A great guild')).toBeInTheDocument();
  });

  it('renders empty message when guild list is empty', () => {
    render(
      <GuildList title="Owner" guilds={[]} onEdit={vi.fn()} onDelete={vi.fn()} emptyMessage="No guilds yet" />
    );
    expect(screen.getByText('No guilds yet')).toBeInTheDocument();
  });

  it('calls onEdit with the correct guild when edit button clicked', () => {
    const onEdit = vi.fn();
    render(
      <GuildList title="Owner" guilds={guilds} onEdit={onEdit} onDelete={vi.fn()} emptyMessage="No guilds" />
    );
    const editButtons = screen.getAllByRole('button', { name: 'editLabel' });
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(guilds[0]);
  });

  it('calls onDelete with the correct guild when delete button clicked', () => {
    const onDelete = vi.fn();
    render(
      <GuildList title="Owner" guilds={guilds} onEdit={vi.fn()} onDelete={onDelete} emptyMessage="No guilds" />
    );
    const deleteButtons = screen.getAllByRole('button', { name: 'deleteLabel' });
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith(guilds[0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/manage-guilds/ui/GuildList.test.tsx
```

Expected: FAIL — `GuildList` not found.

- [ ] **Step 3: Create GuildList component**

Create `src/features/manage-guilds/ui/GuildList.tsx`:

```tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Pencil, Trash2 } from 'lucide-react';
import { Guild } from '@/entities/guild';
import styles from './GuildList.module.css';

interface GuildListProps {
  title: string;
  guilds: Guild[];
  onEdit: (guild: Guild) => void;
  onDelete: (guild: Guild) => void;
  emptyMessage: string;
}

export const GuildList: React.FC<GuildListProps> = ({ title, guilds, onEdit, onDelete, emptyMessage }) => {
  const t = useTranslations('Guild');

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      {guilds.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <ul className={styles.list}>
          {guilds.map((guild) => (
            <li key={guild.id} className={styles.row}>
              <Shield size={18} className={styles.icon} />
              <div className={styles.info}>
                <span className={styles.name}>{guild.name}</span>
                {guild.description && (
                  <span className={styles.description}>{guild.description}</span>
                )}
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  aria-label={t('editLabel')}
                  onClick={() => onEdit(guild)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className={styles.actionBtn}
                  aria-label={t('deleteLabel')}
                  onClick={() => onDelete(guild)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
```

- [ ] **Step 4: Create GuildList styles**

Create `src/features/manage-guilds/ui/GuildList.module.css`:

```css
.section {
  margin-bottom: 40px;
}

.title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0 0 12px 0;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border);
  transition: background 0.15s ease;
}

.row:hover {
  background: rgba(255, 255, 255, 0.07);
}

.icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.name {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
}

.description {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.actionBtn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.actionBtn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.empty {
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 16px 0;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/features/manage-guilds/ui/GuildList.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/manage-guilds/ui/GuildList.tsx src/features/manage-guilds/ui/GuildList.module.css src/features/manage-guilds/ui/GuildList.test.tsx
git commit -m "feat(manage-guilds): add GuildList component"
```

---

## Task 5: CreateGuildWizard component

**Files:**
- Create: `src/features/manage-guilds/ui/CreateGuildWizard.tsx`
- Create: `src/features/manage-guilds/ui/CreateGuildWizard.module.css`
- Create: `src/features/manage-guilds/ui/CreateGuildWizard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/manage-guilds/ui/CreateGuildWizard.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateGuildWizard } from './CreateGuildWizard';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockUnwrap = vi.fn().mockResolvedValue({ id: 'new-guild-id', name: 'My Guild', ownerId: 'u1' });
const mockCreateGuild = vi.fn().mockReturnValue({ unwrap: mockUnwrap });

vi.mock('@/entities/guild', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/guild')>();
  return {
    ...actual,
    useCreateGuildMutation: () => [mockCreateGuild, { isLoading: false }],
  };
});

describe('CreateGuildWizard', () => {
  it('does not render dialog when closed', () => {
    render(<CreateGuildWizard open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with form when open', () => {
    render(<CreateGuildWizard open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('nameLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('descriptionLabel')).toBeInTheDocument();
  });

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    render(<CreateGuildWizard open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls createGuild mutation on form submit', async () => {
    render(<CreateGuildWizard open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('nameLabel'), { target: { value: 'My Guild' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
    await waitFor(() =>
      expect(mockCreateGuild).toHaveBeenCalledWith({ name: 'My Guild', description: '' })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/manage-guilds/ui/CreateGuildWizard.test.tsx
```

Expected: FAIL — `CreateGuildWizard` not found.

- [ ] **Step 3: Create CreateGuildWizard component**

Create `src/features/manage-guilds/ui/CreateGuildWizard.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useCreateGuildMutation } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import styles from './CreateGuildWizard.module.css';

interface CreateGuildWizardProps {
  open: boolean;
  onClose: () => void;
}

export const CreateGuildWizard: React.FC<CreateGuildWizardProps> = ({ open, onClose }) => {
  const t = useTranslations('Guild');
  const commonT = useTranslations('Common');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createGuild, { isLoading }] = useCreateGuildMutation();

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createGuild({ name: name.trim(), description: description.trim() }).unwrap();
      toast.success(t('successCreated'));
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
              {t('createTitle')}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <form id="create-guild-form" onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="guild-name">{t('nameLabel')}</label>
                <input
                  id="guild-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="guild-description">{t('descriptionLabel')}</label>
                <textarea
                  id="guild-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.textarea}
                />
              </div>
            </form>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              form="create-guild-form"
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? t('creating') : t('submit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
```

- [ ] **Step 4: Create CreateGuildWizard styles**

Create `src/features/manage-guilds/ui/CreateGuildWizard.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: linear-gradient(135deg, rgba(15, 12, 41, 0.97) 0%, rgba(48, 43, 99, 0.97) 50%, rgba(36, 36, 62, 0.97) 100%);
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  animation: wizardShow 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.header {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
  position: relative;
}

.closeButton {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
}

.closeButton:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.body {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow-y: auto;
  padding: 40px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 520px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.formGroup label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  height: 44px;
  padding: 0 16px;
  color: var(--text-primary);
  font-size: 0.95rem;
  width: 100%;
  transition: border-color 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: rgba(108, 99, 255, 0.5);
}

.textarea {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: 0.95rem;
  width: 100%;
  min-height: 120px;
  resize: vertical;
  transition: border-color 0.2s ease;
  font-family: inherit;
}

.textarea:focus {
  outline: none;
  border-color: rgba(108, 99, 255, 0.5);
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
}

@keyframes wizardShow {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/features/manage-guilds/ui/CreateGuildWizard.test.tsx
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/manage-guilds/ui/CreateGuildWizard.tsx src/features/manage-guilds/ui/CreateGuildWizard.module.css src/features/manage-guilds/ui/CreateGuildWizard.test.tsx
git commit -m "feat(manage-guilds): add CreateGuildWizard component"
```

---

## Task 6: EditGuildWizard component (stubs)

**Files:**
- Create: `src/features/manage-guilds/ui/EditGuildWizard.tsx`
- Create: `src/features/manage-guilds/ui/EditGuildWizard.module.css`

- [ ] **Step 1: Create EditGuildWizard component**

Create `src/features/manage-guilds/ui/EditGuildWizard.tsx`:

```tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Image, Users, Settings } from 'lucide-react';
import { Guild } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import styles from './EditGuildWizard.module.css';

interface EditGuildWizardProps {
  guild: Guild | null;
  onClose: () => void;
}

export const EditGuildWizard: React.FC<EditGuildWizardProps> = ({ guild, onClose }) => {
  const t = useTranslations('Guild');
  const commonT = useTranslations('Common');

  return (
    <DialogPrimitive.Root open={guild !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className={styles.overlay} aria-describedby={undefined}>
          <div className={styles.header}>
            <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
              <X size={20} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className={styles.title}>
              {t('editTitle')}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <div className={styles.column}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-guild-name">{t('nameLabel')}</label>
                <input
                  id="edit-guild-name"
                  type="text"
                  defaultValue={guild?.name ?? ''}
                  className={styles.input}
                  readOnly
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-guild-description">{t('descriptionLabel')}</label>
                <textarea
                  id="edit-guild-description"
                  defaultValue={guild?.description ?? ''}
                  className={styles.textarea}
                  readOnly
                />
              </div>
            </div>

            <div className={styles.column}>
              <div className={styles.stubGroup}>
                <div className={styles.stubHeader}>
                  <Image size={16} />
                  <span className={styles.stubLabel}>{t('avatarSection')}</span>
                </div>
                <div className={styles.stubField}>{t('comingSoon')}</div>
              </div>

              <div className={styles.stubGroup}>
                <div className={styles.stubHeader}>
                  <Users size={16} />
                  <span className={styles.stubLabel}>{t('membersSection')}</span>
                </div>
                <div className={styles.stubField}>{t('comingSoon')}</div>
              </div>

              <div className={styles.stubGroup}>
                <div className={styles.stubHeader}>
                  <Settings size={16} />
                  <span className={styles.stubLabel}>{t('settingsSection')}</span>
                </div>
                <div className={styles.stubField}>{t('comingSoon')}</div>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={onClose}>
              {commonT('cancel')}
            </Button>
            <Button type="button" variant="primary" disabled>
              {commonT('save')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
```

- [ ] **Step 2: Create EditGuildWizard styles**

Create `src/features/manage-guilds/ui/EditGuildWizard.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: linear-gradient(135deg, rgba(15, 12, 41, 0.97) 0%, rgba(48, 43, 99, 0.97) 50%, rgba(36, 36, 62, 0.97) 100%);
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  animation: wizardShow 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.header {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
  position: relative;
}

.closeButton {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
}

.closeButton:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow-y: auto;
}

.column {
  padding: 32px;
}

.column:first-child {
  border-right: 1px solid var(--glass-border);
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.formGroup label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  height: 44px;
  padding: 0 16px;
  color: var(--text-primary);
  font-size: 0.95rem;
  width: 100%;
}

.textarea {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: 0.95rem;
  width: 100%;
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
}

.stubGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.stubHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.stubLabel {
  font-size: 0.9rem;
  font-weight: 500;
}

.stubField {
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed var(--glass-border);
  border-radius: 10px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
}

@keyframes wizardShow {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

@media (max-width: 768px) {
  .body {
    grid-template-columns: 1fr;
  }
  .column:first-child {
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/manage-guilds/ui/EditGuildWizard.tsx src/features/manage-guilds/ui/EditGuildWizard.module.css
git commit -m "feat(manage-guilds): add EditGuildWizard stub component"
```

---

## Task 7: GuildManagePage and feature index

**Files:**
- Create: `src/features/manage-guilds/ui/GuildManagePage.tsx`
- Create: `src/features/manage-guilds/ui/GuildManagePage.module.css`
- Create: `src/features/manage-guilds/index.ts`

- [ ] **Step 1: Create GuildManagePage component**

Create `src/features/manage-guilds/ui/GuildManagePage.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useGetGuildsQuery, useDeleteGuildMutation, Guild } from '@/entities/guild';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Button } from '@/shared/ui/Button';
import { GuildList } from './GuildList';
import { CreateGuildWizard } from './CreateGuildWizard';
import { EditGuildWizard } from './EditGuildWizard';
import styles from './GuildManagePage.module.css';

interface GuildManagePageProps {
  userId: string;
}

export const GuildManagePage: React.FC<GuildManagePageProps> = ({ userId }) => {
  const t = useTranslations('Guild');
  const commonT = useTranslations('Common');

  const [createOpen, setCreateOpen] = useState(false);
  const [editingGuild, setEditingGuild] = useState<Guild | null>(null);
  const [deletingGuild, setDeletingGuild] = useState<Guild | null>(null);

  const { data: guilds = [] } = useGetGuildsQuery();
  const [deleteGuild] = useDeleteGuildMutation();

  const owned = guilds.filter((g) => g.ownerId === userId);
  const member = guilds.filter((g) => g.ownerId !== userId);

  const handleDelete = async () => {
    if (!deletingGuild) return;
    try {
      await deleteGuild(deletingGuild.id).unwrap();
      toast.success(t('deleteSuccess'));
    } catch {
      toast.error(t('errorCreate'));
    }
    setDeletingGuild(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{t('manageTitle')}</h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          {t('createButton')}
        </Button>
      </div>

      <GuildList
        title={t('ownerSection')}
        guilds={owned}
        onEdit={setEditingGuild}
        onDelete={setDeletingGuild}
        emptyMessage={t('emptyOwned')}
      />

      <GuildList
        title={t('memberSection')}
        guilds={member}
        onEdit={setEditingGuild}
        onDelete={setDeletingGuild}
        emptyMessage={t('emptyMember')}
      />

      <CreateGuildWizard open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditGuildWizard guild={editingGuild} onClose={() => setEditingGuild(null)} />
      <ConfirmModal
        isOpen={!!deletingGuild}
        onClose={() => setDeletingGuild(null)}
        onConfirm={handleDelete}
        title={commonT('delete')}
        description={t('deleteConfirm')}
        confirmLabel={commonT('delete')}
        variant="danger"
      />
    </div>
  );
};
```

- [ ] **Step 2: Create GuildManagePage styles**

Create `src/features/manage-guilds/ui/GuildManagePage.module.css`:

```css
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40px;
}

.pageTitle {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
```

- [ ] **Step 3: Create feature public API**

Create `src/features/manage-guilds/index.ts`:

```ts
export { GuildManagePage } from './ui/GuildManagePage';
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/manage-guilds/ui/GuildManagePage.tsx src/features/manage-guilds/ui/GuildManagePage.module.css src/features/manage-guilds/index.ts
git commit -m "feat(manage-guilds): add GuildManagePage and feature index"
```

---

## Task 8: App route, navigation update, and cleanup

**Files:**
- Create: `src/app/guilds/page.tsx`
- Modify: `src/widgets/header/ui/UserMenu.tsx`
- Delete: `src/app/guilds/create/` (entire folder)
- Delete: `src/features/create-guild/` (entire folder)

- [ ] **Step 1: Create new /guilds page**

Create `src/app/guilds/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';
import { GuildManagePage } from '@/features/manage-guilds';

export default async function GuildsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main>
      <GuildManagePage userId={user.id} />
    </main>
  );
}
```

- [ ] **Step 2: Update UserMenu navigation link**

In `src/widgets/header/ui/UserMenu.tsx`, find this block:

```tsx
<DropdownMenu.Item className={styles.item} asChild>
  <Link href="/guilds/create" className={styles.link}>
    <div className={styles.itemContent}>
      <ShieldPlus size={18} />
      <span>{guildT('createTitle')}</span>
    </div>
  </Link>
</DropdownMenu.Item>
```

Replace with:

```tsx
<DropdownMenu.Item className={styles.item} asChild>
  <Link href="/guilds" className={styles.link}>
    <div className={styles.itemContent}>
      <ShieldPlus size={18} />
      <span>{guildT('manageTitle')}</span>
    </div>
  </Link>
</DropdownMenu.Item>
```

- [ ] **Step 3: Delete old create-guild page and feature**

```bash
git rm -r src/app/guilds/create/ src/features/create-guild/
```

Expected: git stages the deletions and shows `deleted:` lines for each file.

- [ ] **Step 4: Verify TypeScript compiles and tests pass**

```bash
npx tsc --noEmit && npm run test:run
```

Expected: no TS errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/guilds/page.tsx src/widgets/header/ui/UserMenu.tsx
git commit -m "feat(guilds): add /guilds route, update nav, remove old create page and feature"
```
