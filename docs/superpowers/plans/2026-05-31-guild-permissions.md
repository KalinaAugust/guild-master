# Guild Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict guild editing to owners and event creation/editing/deletion to OWNER+ADMIN roles, with a single extensible permission hook.

**Architecture:** A new `useGuildPermissions` hook in `shared/lib` centralises role-checking (future: per-guild settings table). UI components read its boolean flags; no new API routes or schema changes are needed. Server-side RLS is already the authoritative guard — these are UI changes only.

**Tech Stack:** React 19, Redux Toolkit / RTK Query, TypeScript, CSS Modules, Next.js App Router

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/shared/lib/useGuildPermissions.ts` | Returns `canManageEvents`, `canManageMembers` for a user in a guild |
| Modify | `src/app/day/[date]/page.tsx` | Fetch `userId` server-side, pass to `DayEventsList` |
| Modify | `src/widgets/day-events/ui/DayEventsList.tsx` | Gate Add/Edit/Delete buttons on `canManageEvents` |
| Modify | `src/features/manage-guilds/ui/GuildList.tsx` | Make `onEdit`/`onDelete` optional |
| Modify | `src/features/manage-guilds/ui/GuildManagePage.tsx` | Omit edit/delete handlers for member guilds section |
| Modify | `src/features/manage-guilds/ui/EditGuildWizard.tsx` | Accept and forward `userId` |
| Modify | `src/features/manage-guilds/ui/GuildMembersSection.tsx` | Hide add-form and Remove button for non-managers |

---

### Task 1: Create `useGuildPermissions` hook

**Files:**
- Create: `src/shared/lib/useGuildPermissions.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/shared/lib/useGuildPermissions.ts
import { useGetGuildMembersQuery } from '@/entities/guild';

export function useGuildPermissions(
  guildId: string | null | undefined,
  userId: string | null | undefined,
) {
  const { data: members = [] } = useGetGuildMembersQuery(guildId ?? '', {
    skip: !guildId || !userId,
  });
  const myRole = members.find((m) => m.userId === userId)?.role;
  const elevated = myRole === 'OWNER' || myRole === 'ADMIN';
  return { canManageEvents: elevated, canManageMembers: elevated };
}
```

- [ ] **Step 2: Run lint to verify no type errors**

```bash
npm run lint
```

Expected: no errors in `src/shared/lib/useGuildPermissions.ts`

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/useGuildPermissions.ts
git commit -m "feat(permissions): add useGuildPermissions hook"
```

---

### Task 2: Make `GuildList` edit/delete handlers optional

**Files:**
- Modify: `src/features/manage-guilds/ui/GuildList.tsx`

- [ ] **Step 1: Update the component**

Replace the entire file content with:

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
  onEdit?: (guild: Guild) => void;
  onDelete?: (guild: Guild) => void;
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
              {(onEdit || onDelete) && (
                <div className={styles.actions}>
                  {onEdit && (
                    <button
                      className={styles.actionBtn}
                      aria-label={t('editLabel')}
                      onClick={() => onEdit(guild)}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className={styles.actionBtn}
                      aria-label={t('deleteLabel')}
                      onClick={() => onDelete(guild)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/manage-guilds/ui/GuildList.tsx
git commit -m "feat(permissions): make GuildList edit/delete handlers optional"
```

---

### Task 3: Remove edit/delete from member guilds in `GuildManagePage`

**Files:**
- Modify: `src/features/manage-guilds/ui/GuildManagePage.tsx`

- [ ] **Step 1: Remove handlers from member `GuildList` call**

Find this block (lines ~65–70):

```tsx
      <GuildList
        title={t('memberSection')}
        guilds={member}
        onEdit={openEdit}
        onDelete={setDeletingGuild}
        emptyMessage={t('emptyMember')}
      />
```

Replace with:

```tsx
      <GuildList
        title={t('memberSection')}
        guilds={member}
        emptyMessage={t('emptyMember')}
      />
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/manage-guilds/ui/GuildManagePage.tsx
git commit -m "feat(permissions): hide edit/delete for member guilds"
```

---

### Task 4: Pass `userId` from `DayPage` to `DayEventsList`

**Files:**
- Modify: `src/app/day/[date]/page.tsx`
- Modify: `src/widgets/day-events/ui/DayEventsList.tsx` (props interface only — logic in Task 5)

- [ ] **Step 1: Update `DayPage` to fetch and forward `userId`**

Replace the file content:

```tsx
import Link from 'next/link';
import { getMyGuilds } from '@/entities/guild';
import { redirect } from 'next/navigation';
import { DayEventsList } from '@/widgets/day-events';
import { EventWizard } from '@/features/create-event';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/shared/api/supabase/server';
import styles from './DayPage.module.css';

interface DayPageProps {
  params: Promise<{
    date: string;
  }>;
}

export default async function DayPage({ params }: DayPageProps) {
  const { date } = await params;

  const supabase = await createClient();
  const [{ data: { user } }, guilds] = await Promise.all([
    supabase.auth.getUser(),
    getMyGuilds(),
  ]);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const currentGuildId = guilds[0].id;
  const t = await getTranslations('Common');

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.backLink}>
        <ChevronLeft size={20} />
        {t('backToCalendar')}
      </Link>

      <DayEventsList date={date} guildId={currentGuildId} userId={user?.id} />

      <EventWizard isDayView />
    </main>
  );
}
```

- [ ] **Step 2: Add `userId` to `DayEventsList` props interface**

In `src/widgets/day-events/ui/DayEventsList.tsx`, find:

```tsx
interface DayEventsListProps {
  date: string;
  guildId?: string;
}
```

Replace with:

```tsx
interface DayEventsListProps {
  date: string;
  guildId?: string;
  userId?: string;
}
```

Also add `userId` to the destructured props:

```tsx
export const DayEventsList: React.FC<DayEventsListProps> = ({ date, guildId: propGuildId, userId }) => {
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/day/\[date\]/page.tsx src/widgets/day-events/ui/DayEventsList.tsx
git commit -m "feat(permissions): pass userId to DayEventsList"
```

---

### Task 5: Gate event buttons on `canManageEvents` in `DayEventsList`

**Files:**
- Modify: `src/widgets/day-events/ui/DayEventsList.tsx`

- [ ] **Step 1: Import the hook**

Add to the import block at the top of `DayEventsList.tsx`:

```tsx
import { useGuildPermissions } from '@/shared/lib/useGuildPermissions';
```

- [ ] **Step 2: Call the hook inside the component**

After the line `const activeGuildId = currentGuildId || propGuildId;`, add:

```tsx
  const { canManageEvents } = useGuildPermissions(activeGuildId, userId);
```

- [ ] **Step 3: Gate Add Event button in the header**

Find:

```tsx
        {!isPastDate && (
          <Button variant="primary" size="sm" onClick={handleAddEvent} className={styles.addBtn}>
            <Plus size={18} strokeWidth={2.5} />
            <span>{t('addEvent')}</span>
          </Button>
        )}
```

Replace with:

```tsx
        {!isPastDate && canManageEvents && (
          <Button variant="primary" size="sm" onClick={handleAddEvent} className={styles.addBtn}>
            <Plus size={18} strokeWidth={2.5} />
            <span>{t('addEvent')}</span>
          </Button>
        )}
```

- [ ] **Step 4: Gate `onEdit` and `onDelete` on `EventCard`**

Find:

```tsx
            <EventCard
              key={event.id}
              event={event}
              onClick={handleViewEvent}
              onEdit={!isPastDate ? handleEditEvent : undefined}
              onDelete={handleDeleteClick}
            />
```

Replace with:

```tsx
            <EventCard
              key={event.id}
              event={event}
              onClick={handleViewEvent}
              onEdit={!isPastDate && canManageEvents ? handleEditEvent : undefined}
              onDelete={canManageEvents ? handleDeleteClick : undefined}
            />
```

- [ ] **Step 5: Gate "Create first event" button in empty state**

Find:

```tsx
          {!isPastDate && (
            <Button variant="secondary" onClick={handleAddEvent}>
              {t('createFirst')}
            </Button>
          )}
```

Replace with:

```tsx
          {!isPastDate && canManageEvents && (
            <Button variant="secondary" onClick={handleAddEvent}>
              {t('createFirst')}
            </Button>
          )}
```

- [ ] **Step 6: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 7: Run tests**

```bash
npm run test:run
```

Expected: all existing tests pass

- [ ] **Step 8: Commit**

```bash
git add src/widgets/day-events/ui/DayEventsList.tsx
git commit -m "feat(permissions): hide event create/edit/delete for MEMBER role"
```

---

### Task 6: Forward `userId` through `EditGuildWizard`

**Files:**
- Modify: `src/features/manage-guilds/ui/EditGuildWizard.tsx`
- Modify: `src/features/manage-guilds/ui/GuildManagePage.tsx`

- [ ] **Step 1: Add `userId` to `EditGuildWizard` props**

In `src/features/manage-guilds/ui/EditGuildWizard.tsx`, find:

```tsx
interface GuildWizardProps {
  open: boolean;
  guild: Guild | null;
  onClose: () => void;
}

export const EditGuildWizard: React.FC<GuildWizardProps> = ({ open, guild, onClose }) => {
```

Replace with:

```tsx
interface GuildWizardProps {
  open: boolean;
  guild: Guild | null;
  onClose: () => void;
  userId: string;
}

export const EditGuildWizard: React.FC<GuildWizardProps> = ({ open, guild, onClose, userId }) => {
```

- [ ] **Step 2: Find where `GuildMembersSection` is rendered in `EditGuildWizard` and pass `userId`**

Find (the exact JSX may vary, search for `<GuildMembersSection`):

```tsx
<GuildMembersSection guildId={guild.id} />
```

Replace with:

```tsx
<GuildMembersSection guildId={guild.id} userId={userId} />
```

- [ ] **Step 3: Pass `userId` from `GuildManagePage` to `EditGuildWizard`**

In `src/features/manage-guilds/ui/GuildManagePage.tsx`, find:

```tsx
      <EditGuildWizard key={editingGuild?.id ?? 'new'} open={wizardOpen} guild={editingGuild} onClose={closeWizard} />
```

Replace with:

```tsx
      <EditGuildWizard key={editingGuild?.id ?? 'new'} open={wizardOpen} guild={editingGuild} onClose={closeWizard} userId={userId} />
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/features/manage-guilds/ui/EditGuildWizard.tsx src/features/manage-guilds/ui/GuildManagePage.tsx
git commit -m "feat(permissions): forward userId to EditGuildWizard and GuildMembersSection"
```

---

### Task 7: Restrict `GuildMembersSection` for non-managers

**Files:**
- Modify: `src/features/manage-guilds/ui/GuildMembersSection.tsx`

- [ ] **Step 1: Import the hook**

Add to imports:

```tsx
import { useGuildPermissions } from '@/shared/lib/useGuildPermissions';
```

- [ ] **Step 2: Add `userId` to props interface**

Find:

```tsx
interface GuildMembersSectionProps {
  guildId: string;
}

export const GuildMembersSection: React.FC<GuildMembersSectionProps> = ({ guildId }) => {
```

Replace with:

```tsx
interface GuildMembersSectionProps {
  guildId: string;
  userId: string;
}

export const GuildMembersSection: React.FC<GuildMembersSectionProps> = ({ guildId, userId }) => {
```

- [ ] **Step 3: Call the hook**

After the existing RTK Query hook calls near the top of the component body, add:

```tsx
  const { canManageMembers } = useGuildPermissions(guildId, userId);
```

- [ ] **Step 4: Gate the add-member form**

Find:

```tsx
      <Form.Root onSubmit={handleAdd} className={styles.addForm}>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className={styles.emailInput}
        />
        <Button type="submit" variant="primary" disabled={!email.trim() || isAdding}>
          Add
        </Button>
      </Form.Root>
```

Replace with:

```tsx
      {canManageMembers && (
        <Form.Root onSubmit={handleAdd} className={styles.addForm}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={styles.emailInput}
          />
          <Button type="submit" variant="primary" disabled={!email.trim() || isAdding}>
            Add
          </Button>
        </Form.Root>
      )}
```

- [ ] **Step 5: Gate the Remove button**

Find:

```tsx
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
```

Replace with:

```tsx
              {canManageMembers && member.role !== 'OWNER' && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemove(member.userId)}
                  aria-label="Remove member"
                >
                  <UserMinus size={14} />
                </button>
              )}
```

- [ ] **Step 6: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 7: Run all tests**

```bash
npm run test:run
```

Expected: all existing tests pass

- [ ] **Step 8: Commit**

```bash
git add src/features/manage-guilds/ui/GuildMembersSection.tsx
git commit -m "feat(permissions): hide member management UI for non-managers"
```

---

## Self-Review

**Spec coverage:**
- ✅ `useGuildPermissions` hook — Task 1
- ✅ `GuildList` optional handlers — Task 2
- ✅ Member guilds no edit/delete — Task 3
- ✅ `userId` from server to `DayEventsList` — Task 4
- ✅ Add/Edit/Delete event gated — Task 5
- ✅ `userId` forwarded to `GuildMembersSection` — Tasks 6
- ✅ Add-form and Remove button gated — Task 7
- ✅ Future extensibility: hook is the single gating point

**Placeholder scan:** No TBDs, no "similar to above", all code is complete.

**Type consistency:** `useGuildPermissions(guildId, userId)` signature used consistently across Tasks 1, 5, 7. `canManageEvents` / `canManageMembers` names match definition.
