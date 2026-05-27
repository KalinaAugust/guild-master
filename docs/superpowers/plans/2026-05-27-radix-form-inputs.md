# Radix Form Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@radix-ui/react-form`, create shared `Input`, `Textarea`, and `FormField` components in `shared/ui`, and migrate all native `<input>`/`<textarea>` elements across forms to use them.

**Architecture:** Three new components in `shared/ui` follow the existing Radix-wrapper pattern (like `Select`, `Modal`, `Tooltip`). `Input` and `Textarea` are `forwardRef` wrappers for plain elements. `FormField` bundles `Form.Field + Form.Label + Form.Control + Form.Message` and requires a `Form.Root` ancestor. Forms replace `<form>` with `Form.Root` and `<div className={styles.formGroup}>` wrappers with `<FormField>`.

**Tech Stack:** `@radix-ui/react-form`, React 19 `forwardRef`, CSS Modules, TypeScript

---

## File Map

| Action | File |
|--------|------|
| Create | `src/shared/ui/Input/Input.tsx` |
| Create | `src/shared/ui/Input/Input.module.css` |
| Create | `src/shared/ui/Input/index.ts` |
| Create | `src/shared/ui/Textarea/Textarea.tsx` |
| Create | `src/shared/ui/Textarea/Textarea.module.css` |
| Create | `src/shared/ui/Textarea/index.ts` |
| Create | `src/shared/ui/FormField/FormField.tsx` |
| Create | `src/shared/ui/FormField/FormField.module.css` |
| Create | `src/shared/ui/FormField/index.ts` |
| Modify | `src/features/create-event/ui/EventForm.tsx` |
| Modify | `src/features/manage-guilds/ui/EditGuildWizard.tsx` |
| Modify | `src/features/manage-guilds/ui/GuildMembersSection.tsx` |
| Modify | `src/features/ai-helper/ui/AiHelperModal.tsx` |

---

## Task 1: Install @radix-ui/react-form

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Install the package**

```bash
npm install @radix-ui/react-form
```

- [ ] **Step 2: Verify installation**

```bash
grep '"@radix-ui/react-form"' package.json
```

Expected output: `"@radix-ui/react-form": "^<version>"`

---

## Task 2: Create shared/ui/Input

**Files:**
- Create: `src/shared/ui/Input/Input.tsx`
- Create: `src/shared/ui/Input/Input.module.css`
- Create: `src/shared/ui/Input/index.ts`

- [ ] **Step 1: Create `Input.tsx`**

```tsx
import * as React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, className, ...props }, ref) => (
    <input
      ref={ref}
      className={[styles.input, hasError && styles.inputError, className].filter(Boolean).join(' ')}
      {...props}
    />
  )
);
Input.displayName = 'Input';
```

- [ ] **Step 2: Create `Input.module.css`**

Styles are extracted from `EventForm.module.css` (canonical). The `[data-invalid]` selector handles error styling when the component is inside `FormField` (Radix sets this attribute automatically via `serverInvalid`). `.inputError` handles manual `hasError` usage.

```css
.input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 0 16px;
  height: 45px;
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  width: 100%;
}

.input::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
  opacity: 1;
}

.input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-glow);
  background: rgba(255, 255, 255, 0.08);
}

.input[data-invalid],
.inputError {
  border-color: #ff6b6b;
}
```

- [ ] **Step 3: Create `index.ts`**

```ts
export { Input } from './Input';
export type { InputProps } from './Input';
```

---

## Task 3: Create shared/ui/Textarea

**Files:**
- Create: `src/shared/ui/Textarea/Textarea.tsx`
- Create: `src/shared/ui/Textarea/Textarea.module.css`
- Create: `src/shared/ui/Textarea/index.ts`

- [ ] **Step 1: Create `Textarea.tsx`**

```tsx
import * as React from 'react';
import styles from './Textarea.module.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={[styles.textarea, hasError && styles.textareaError, className].filter(Boolean).join(' ')}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
```

- [ ] **Step 2: Create `Textarea.module.css`**

```css
.textarea {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  width: 100%;
  min-height: 100px;
  resize: none;
  font-family: inherit;
}

.textarea:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-glow);
  background: rgba(255, 255, 255, 0.08);
}

.textarea::placeholder {
  color: var(--text-secondary);
}

.textarea:disabled {
  opacity: 0.6;
}

.textarea[data-invalid],
.textareaError {
  border-color: #ff6b6b;
}
```

- [ ] **Step 3: Create `index.ts`**

```ts
export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';
```

---

## Task 4: Create shared/ui/FormField

**Files:**
- Create: `src/shared/ui/FormField/FormField.tsx`
- Create: `src/shared/ui/FormField/FormField.module.css`
- Create: `src/shared/ui/FormField/index.ts`

`FormField` must be inside a `Form.Root` ancestor (from `@radix-ui/react-form`). It accepts exactly one child element — either `Input` or `Textarea`.

- [ ] **Step 1: Create `FormField.tsx`**

`serverInvalid={!!error}` causes Radix to set `aria-invalid="true"` and `data-invalid` on the `Form.Control`'s child, triggering the error CSS in `Input.module.css`/`Textarea.module.css` without needing to pass `hasError` manually.

```tsx
'use client';
import * as React from 'react';
import * as Form from '@radix-ui/react-form';
import styles from './FormField.module.css';

export interface FormFieldProps {
  name: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactElement;
}

export const FormField: React.FC<FormFieldProps> = ({ name, label, error, className, children }) => (
  <Form.Field
    name={name}
    serverInvalid={!!error}
    className={[styles.field, className].filter(Boolean).join(' ')}
  >
    <Form.Label className={styles.label}>{label}</Form.Label>
    <Form.Control asChild>
      {children}
    </Form.Control>
    {error && (
      <Form.Message className={styles.errorMessage}>
        {error}
      </Form.Message>
    )}
  </Form.Field>
);
```

- [ ] **Step 2: Create `FormField.module.css`**

```css
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.errorMessage {
  font-size: 0.75rem;
  color: #ff6b6b;
  margin-top: -4px;
}
```

- [ ] **Step 3: Create `index.ts`**

```ts
export { FormField } from './FormField';
export type { FormFieldProps } from './FormField';
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no TypeScript errors in the new files. Fix any type errors before continuing.

---

## Task 5: Migrate EventForm

**Files:**
- Modify: `src/features/create-event/ui/EventForm.tsx`

Replace `<form>` with `Form.Root`; replace the three `<input>` field groups with `FormField + Input`; replace `<textarea>` group with `FormField + Textarea`. The Select field stays in its `<div className={styles.formGroup}>` wrapper — Select is not an Input and does not use FormField.

Note: `EventForm.module.css` classes `styles.input`, `styles.inputError`, `styles.fieldError` become unused but are left in place per spec.

Note: Minor visual normalization — EditGuildWizard's inputs will get `border-radius: 12px` and `height: 45px` instead of their current `10px`/`44px`. This is an acceptable cosmetic normalization.

- [ ] **Step 1: Replace EventForm.tsx with migrated version**

```tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import * as Form from '@radix-ui/react-form';
import { ActivityType } from '@/shared/types';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { FormField } from '@/shared/ui/FormField';
import { EventFormProps } from '../model/types';
import { createEventFormSchema } from '../model/schema';
import styles from './EventForm.module.css';

export const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  isDayView,
  isEdit,
  hideActions,
  formId,
}) => {
  const t = useTranslations('Event');
  const commonT = useTranslations('Common');

  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [time, setTime] = useState(initialData?.time || '19:00');
  const [type, setType] = useState<ActivityType>(initialData?.type || 'game');
  const [description, setDescription] = useState(initialData?.description || '');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const typeOptions = useMemo(() => [
    { label: t('types.game'), value: 'game' as ActivityType },
    { label: t('types.raid'), value: 'raid' as ActivityType },
    { label: t('types.meeting'), value: 'meeting' as ActivityType },
    { label: t('types.other'), value: 'other' as ActivityType },
  ], [t]);

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    const schema = createEventFormSchema({
      titleRequired: t('validation.titleRequired'),
      dateRequired: t('validation.dateRequired'),
      timeRequired: t('validation.timeRequired'),
    });
    const result = schema.safeParse({ title, date, time, type, description });
    if (!result.success) {
      const fieldErrors: Partial<Record<string, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  const showDateInput = !isDayView || isEdit;

  return (
    <Form.Root id={formId} onSubmit={handleSubmit} className={styles.form}>
      <FormField name="title" label={t('titleLabel')} error={errors.title}>
        <Input
          type="text"
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </FormField>
      <div className={styles.row}>
        {showDateInput && (
          <FormField name="date" label={t('dateLabel')} error={errors.date}>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormField>
        )}
        <FormField name="time" label={t('timeLabel')} error={errors.time}>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </FormField>
      </div>
      <div className={styles.formGroup}>
        <label>{t('typeLabel')}</label>
        <Select
          value={type}
          onValueChange={(val) => setType(val as ActivityType)}
          options={typeOptions}
        />
      </div>
      <FormField name="description" label={t('descriptionLabel')}>
        <Textarea
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>
      {!hideActions && (
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onCancel}>
            {commonT('cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {submitLabel}
          </Button>
        </div>
      )}
    </Form.Root>
  );
};
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npm run build 2>&1 | grep -i "error" | head -20
```

Expected: no errors related to EventForm or the new shared components.

---

## Task 6: Migrate EditGuildWizard

**Files:**
- Modify: `src/features/manage-guilds/ui/EditGuildWizard.tsx`

Two `<form>` elements become `Form.Root`. Guild name and description use `FormField`. The pending-email input in the new-guild flow uses standalone `Input` (no label). The guild description uses `FormField + Textarea`.

- [ ] **Step 1: Replace EditGuildWizard.tsx with migrated version**

Only the form-related sections change. Add imports at the top, then update the two form blocks.

Full migrated file:

```tsx
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as Form from '@radix-ui/react-form';
import { X, Image as ImageIcon, Users, Settings } from 'lucide-react';
import { Guild, useCreateGuildMutation, useUpdateGuildMutation, useAddGuildMemberMutation } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { FormField } from '@/shared/ui/FormField';
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
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [pendingInput, setPendingInput] = useState('');
  const [createGuild, { isLoading: isCreating }] = useCreateGuildMutation();
  const [updateGuild, { isLoading: isUpdating }] = useUpdateGuildMutation();
  const [addMember] = useAddGuildMemberMutation();
  const isLoading = isCreating || isUpdating;

  const handleClose = () => {
    if (!isEdit) {
      setName('');
      setDescription('');
      setPendingEmails([]);
      setPendingInput('');
    }
    onClose();
  };

  const handleAddPending = (e: React.SubmitEvent) => {
    e.preventDefault();
    const email = pendingInput.trim();
    if (!email || pendingEmails.includes(email)) return;
    setPendingEmails((prev) => [...prev, email]);
    setPendingInput('');
  };

  const handleRemovePending = (email: string) => {
    setPendingEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (isEdit) {
        await updateGuild({ id: guild.id, name: name.trim(), description: description.trim() }).unwrap();
        toast.success(t('successUpdated'));
      } else {
        const newGuild = await createGuild({ name: name.trim(), description: description.trim() }).unwrap();
        if (pendingEmails.length > 0) {
          const results = await Promise.allSettled(
            pendingEmails.map((email) => addMember({ guildId: newGuild.id, email }).unwrap())
          );
          const failed = results.filter((r) => r.status === 'rejected').length;
          if (failed > 0) toast.error(`Failed to add ${failed} member(s)`);
        }
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
              <Form.Root id="guild-wizard-form" onSubmit={handleSubmit}>
                <FormField name="name" label={t('nameLabel')} className={styles.formGroup}>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </FormField>
                <FormField name="description" label={t('descriptionLabel')} className={styles.formGroup}>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </FormField>
              </Form.Root>
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
                  : (
                    <div>
                      <Form.Root onSubmit={handleAddPending} className={styles.pendingForm}>
                        <Input
                          type="email"
                          value={pendingInput}
                          onChange={(e) => setPendingInput(e.target.value)}
                          placeholder="user@example.com"
                          className={styles.pendingInput}
                        />
                        <Button type="submit" variant="primary" disabled={!pendingInput.trim()}>
                          Add
                        </Button>
                      </Form.Root>
                      {pendingEmails.length > 0 && (
                        <ul className={styles.pendingList}>
                          {pendingEmails.map((email) => (
                            <li key={email} className={styles.pendingItem}>
                              <span className={styles.pendingEmail}>{email}</span>
                              <button
                                type="button"
                                className={styles.pendingRemove}
                                onClick={() => handleRemovePending(email)}
                                aria-label="Remove"
                              >
                                <X size={12} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
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

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npm run build 2>&1 | grep -i "error" | head -20
```

Expected: no errors related to EditGuildWizard.

---

## Task 7: Migrate GuildMembersSection

**Files:**
- Modify: `src/features/manage-guilds/ui/GuildMembersSection.tsx`

The email `<input>` becomes a standalone `<Input>` (no FormField — there is no label in this UI). The `<form>` becomes `Form.Root`.

- [ ] **Step 1: Replace GuildMembersSection.tsx with migrated version**

```tsx
'use client';

import React, { useState } from 'react';
import { UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import * as Form from '@radix-ui/react-form';
import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
} from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import styles from './GuildMembersSection.module.css';

interface GuildMembersSectionProps {
  guildId: string;
}

export const GuildMembersSection: React.FC<GuildMembersSectionProps> = ({ guildId }) => {
  const [email, setEmail] = useState('');
  const { data: members = [], isLoading } = useGetGuildMembersQuery(guildId);
  const [addMember, { isLoading: isAdding }] = useAddGuildMemberMutation();
  const [removeMember] = useRemoveGuildMemberMutation();

  const handleAdd = async (e: React.SubmitEvent) => {
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

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npm run build 2>&1 | grep -i "error" | head -20
```

---

## Task 8: Migrate AiHelperModal

**Files:**
- Modify: `src/features/ai-helper/ui/AiHelperModal.tsx`

The `<textarea>` in the chat input row becomes `<Textarea>`. No `Form.Root` is needed — this is a non-form div layout. The `className={styles.textarea}` is passed directly to `Textarea` to preserve the local layout styles (flex sizing, etc.).

- [ ] **Step 1: Add Textarea import and replace the textarea element**

In `src/features/ai-helper/ui/AiHelperModal.tsx`:

Change the import block — add `Textarea` import:

```tsx
import { Textarea } from '@/shared/ui/Textarea';
```

Replace (lines ~95–103):
```tsx
          <textarea
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            rows={2}
            disabled={isLoading}
          />
```

With:
```tsx
          <Textarea
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            rows={2}
            disabled={isLoading}
          />
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npm run build 2>&1 | grep -i "error" | head -20
```

---

## Task 9: Final verification

- [ ] **Step 1: Run linter**

```bash
npm run lint
```

Expected: no new lint errors.

- [ ] **Step 2: Run full build**

```bash
npm run build
```

Expected: build completes successfully with no errors.

- [ ] **Step 3: Run existing tests**

```bash
npm run test:run
```

Expected: all existing tests pass (no regressions from the migration).
