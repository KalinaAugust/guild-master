# Edit Profile Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user edit their `full_name` inline on the profile page.

**Architecture:** Mirror the existing avatar mutation pattern: a direct Supabase client call in `entities/user/api/updateFullName.ts`, consumed by a new `update-profile-name` feature slice whose client `EditableName` component toggles between a view row (name + pencil) and an edit row (shared `Input` + Save/Cancel), then `router.refresh()` re-renders the server profile page.

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/ssr` browser client, CSS Modules, `sonner` toasts, `lucide-react`, shared UI (`Input`, `Button`).

**Note on tests:** Project rule forbids new tests. Verification is `npm run lint` + manual check. No TDD steps.

---

## File Structure

- Create: `src/entities/user/api/updateFullName.ts` — direct Supabase update of `profiles.full_name`.
- Modify: `src/entities/user/index.ts` — export `updateFullName`.
- Create: `src/features/update-profile-name/ui/EditableName/EditableName.tsx` — client view/edit component.
- Create: `src/features/update-profile-name/ui/EditableName/EditableName.module.css` — styles.
- Create: `src/features/update-profile-name/ui/EditableName/index.ts` — re-export.
- Create: `src/features/update-profile-name/index.ts` — feature public API.
- Modify: `src/app/profile/page.tsx` — always render the Name item, mount `EditableName`.

---

## Task 1: entities `updateFullName`

**Files:**
- Create: `src/entities/user/api/updateFullName.ts`
- Modify: `src/entities/user/index.ts`

- [ ] **Step 1: Create `updateFullName.ts`**

```ts
import { createClient } from '@/shared/api/supabase/client';

export const updateFullName = async (userId: string, fullName: string) => {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', userId);

  if (error) throw error;
};
```

- [ ] **Step 2: Export it from the entity public API**

In `src/entities/user/index.ts`, add this line after the existing `updateAvatar` export:

```ts
export { updateFullName } from './api/updateFullName';
```

Resulting file:

```ts
export * from './model/types';
export { getUser } from './api/getUser';
export { updateAvatar } from './api/updateAvatar';
export { updateFullName } from './api/updateFullName';
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: PASS (ignore the pre-existing warning in `EventDetailContent.test.tsx`).

---

## Task 2: `EditableName` feature component

**Files:**
- Create: `src/features/update-profile-name/ui/EditableName/EditableName.tsx`
- Create: `src/features/update-profile-name/ui/EditableName/EditableName.module.css`
- Create: `src/features/update-profile-name/ui/EditableName/index.ts`
- Create: `src/features/update-profile-name/index.ts`

- [ ] **Step 1: Create `EditableName.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { updateFullName } from '@/entities/user';
import styles from './EditableName.module.css';

interface EditableNameProps {
  initialFullName: string | null;
  userId: string;
}

export const EditableName = ({ initialFullName, userId }: EditableNameProps) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialFullName ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const trimmed = value.trim();
  const isUnchanged = trimmed === (initialFullName ?? '').trim();

  const handleCancel = () => {
    setValue(initialFullName ?? '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateFullName(userId, trimmed);
      toast.success('Name updated');
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className={styles.view}>
        <span className={initialFullName ? styles.name : styles.placeholder}>
          {initialFullName || 'Add your name'}
        </span>
        <Button
          variant="icon"
          size="icon_sm"
          onClick={() => setIsEditing(true)}
          aria-label="Edit name"
        >
          <Pencil size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.edit}>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={50}
        placeholder="Your name"
        autoFocus
        disabled={isSaving}
      />
      <div className={styles.actions}>
        <Button size="sm" onClick={handleSave} disabled={isSaving || isUnchanged}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
```

Implementation notes:
- `Button` variants/sizes used (`variant="icon"`, `size="icon_sm"`, `size="sm"`, `variant="ghost"`) all exist in `src/shared/ui/Button/Button.tsx`.
- After Save, `router.refresh()` re-renders the server page, which passes the updated `initialFullName` prop; view mode renders that prop, so the displayed name updates.

- [ ] **Step 2: Create `EditableName.module.css`**

```css
.view {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.name {
  font-size: 1rem;
  color: var(--text-primary);
}

.placeholder {
  font-size: 1rem;
  font-style: italic;
  color: var(--text-muted);
}

.edit {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.actions {
  display: flex;
  gap: 0.5rem;
}
```

- [ ] **Step 3: Create `EditableName/index.ts`**

```ts
export { EditableName } from './EditableName';
```

- [ ] **Step 4: Create the feature public API `src/features/update-profile-name/index.ts`**

```ts
export * from './ui/EditableName';
```

- [ ] **Step 5: Verify lint passes**

Run: `npm run lint`
Expected: PASS (ignore the pre-existing `EventDetailContent.test.tsx` warning).

---

## Task 3: Wire `EditableName` into the profile page

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/app/profile/page.tsx`, add after the existing `AvatarUpload` import:

```tsx
import { EditableName } from '@/features/update-profile-name';
```

- [ ] **Step 2: Replace the conditional Name block**

Replace this block (currently lines ~61-69):

```tsx
          {profile?.full_name && (
            <div className={styles.infoItem}>
              <User className={styles.icon} size={20} />
              <div>
                <label>Name</label>
                <p>{profile.full_name}</p>
              </div>
            </div>
          )}
```

with:

```tsx
          <div className={styles.infoItem}>
            <User className={styles.icon} size={20} />
            <div>
              <label>Name</label>
              <EditableName initialFullName={profile?.full_name ?? null} userId={user.id} />
            </div>
          </div>
```

(`User` is already imported in the file; keep that import.)

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: PASS (ignore the pre-existing `EventDetailContent.test.tsx` warning).

---

## Task 4: Final verification & commit

- [ ] **Step 1: Lint the whole project**

Run: `npm run lint`
Expected: PASS (0 errors).

- [ ] **Step 2: Manual check (performed by the user in the browser)**

On `/profile`:
- The "Name" row always shows — placeholder `Add your name` (italic, muted) when empty.
- Click the pencil → input + Save/Cancel appear, seeded with the current name.
- Save is disabled when the value is unchanged.
- Editing + Save shows a success toast and the displayed name updates after refresh.
- Cancel discards the edit and returns to view mode.

- [ ] **Step 3: Commit**

```bash
git add src/entities/user/api/updateFullName.ts \
        src/entities/user/index.ts \
        src/features/update-profile-name \
        src/app/profile/page.tsx
git commit -m "feat(profile): inline editing of full name"
```

---

## Self-Review Notes

- **Spec coverage:** entities `updateFullName` → Task 1. Feature slice (`EditableName` + css + index files + public API) → Task 2. Page change (always-visible Name item, mount component) → Task 3. View/edit modes, Save/Cancel, disabled-when-unchanged, empty allowed, toast, `router.refresh()`, `maxLength={50}` → Task 2 component code. Out-of-scope respected: no `<h1>` change, no RTK Query refactor, no new tests.
- **Placeholder scan:** No TBD/TODO; all code blocks are complete.
- **Type consistency:** `updateFullName(userId: string, fullName: string)` defined in Task 1, imported via `@/entities/user` and called with `(userId, trimmed)` in Task 2. `EditableNameProps` (`initialFullName: string | null`, `userId: string`) matches the page usage in Task 3 (`profile?.full_name ?? null`, `user.id`).
