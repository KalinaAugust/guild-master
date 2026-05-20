# Event Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the centered `EventModal` dialog with a full-screen `EventWizard` that has a two-column layout (main fields left, stubs right) and a wizard-style header.

**Architecture:** New `EventWizard` component in `src/features/create-event/ui/` owns the full-screen overlay and footer buttons directly via `@radix-ui/react-dialog`. `EventForm` is reused as-is with two new props (`hideActions`, `formId`) so the wizard footer can own the submit/cancel buttons. `EventModal` is deleted after wiring.

**Tech Stack:** Next.js App Router, Redux Toolkit, `@radix-ui/react-dialog`, CSS Modules, Vitest + React Testing Library.

---

## File Map

| Action | Path |
|--------|------|
| Rename | `src/features/create-event/ui/EventModal.module.css` → `EventForm.module.css` |
| Modify | `src/features/create-event/ui/EventForm.tsx` — update CSS import, accept `hideActions`/`formId` |
| Modify | `src/features/create-event/model/types.ts` — add `hideActions?`, `formId?` to `EventFormProps` |
| Create | `src/features/create-event/ui/EventWizard.module.css` |
| Create | `src/features/create-event/ui/EventWizard.tsx` |
| Create | `src/features/create-event/ui/EventWizard.test.tsx` |
| Modify | `src/features/create-event/index.ts` — export `EventWizard`, remove `EventModal` |
| Modify | `src/app/page.tsx` — replace `<EventModal />` with `<EventWizard />` |
| Modify | `src/app/day/[date]/page.tsx` — replace `<EventModal isDayView />` with `<EventWizard isDayView />` |
| Delete | `src/features/create-event/ui/EventModal.tsx` |

---

## Task 1: Rename EventModal.module.css → EventForm.module.css

**Files:**
- Rename: `src/features/create-event/ui/EventModal.module.css` → `src/features/create-event/ui/EventForm.module.css`
- Modify: `src/features/create-event/ui/EventForm.tsx:9`

- [ ] **Step 1: Copy the CSS file under its new name**

```bash
cp src/features/create-event/ui/EventModal.module.css src/features/create-event/ui/EventForm.module.css
```

- [ ] **Step 2: Update the import in EventForm.tsx**

Change line 9 in `src/features/create-event/ui/EventForm.tsx`:

```tsx
import styles from './EventForm.module.css';
```

- [ ] **Step 3: Run tests to confirm nothing is broken**

```bash
npm run test:run
```

Expected: all existing tests pass.

- [ ] **Step 4: Delete the old CSS file**

```bash
rm src/features/create-event/ui/EventModal.module.css
```

- [ ] **Step 5: Run tests again**

```bash
npm run test:run
```

Expected: all tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/create-event/ui/EventForm.module.css src/features/create-event/ui/EventForm.tsx
git rm src/features/create-event/ui/EventModal.module.css
git commit -m "refactor(create-event): rename EventModal.module.css to EventForm.module.css"
```

---

## Task 2: Add hideActions and formId props to EventForm

**Files:**
- Modify: `src/features/create-event/model/types.ts`
- Modify: `src/features/create-event/ui/EventForm.tsx`
- Create: `src/features/create-event/ui/EventForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/create-event/ui/EventForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EventForm } from './EventForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const baseProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  submitLabel: 'Submit',
};

describe('EventForm', () => {
  it('renders submit and cancel buttons by default', () => {
    render(<EventForm {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cancel' })).toBeInTheDocument();
  });

  it('hides action buttons when hideActions is true', () => {
    render(<EventForm {...baseProps} hideActions />);
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'cancel' })).not.toBeInTheDocument();
  });

  it('sets form id when formId prop is provided', () => {
    render(<EventForm {...baseProps} formId="test-form" />);
    expect(document.getElementById('test-form')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/features/create-event/ui/EventForm.test.tsx
```

Expected: FAIL — `hideActions` and `formId` props do not exist yet.

- [ ] **Step 3: Update EventFormProps in types.ts**

Full content of `src/features/create-event/model/types.ts`:

```ts
import { ActivityType, ActivityEvent } from '@/shared/types';

export interface EventFormData {
  title: string;
  date: string;
  time: string;
  type: ActivityType;
  description: string;
}

export interface EventFormProps {
  initialData?: Partial<ActivityEvent>;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
  submitLabel: string;
  isDayView?: boolean;
  isEdit?: boolean;
  hideActions?: boolean;
  formId?: string;
}
```

- [ ] **Step 4: Update EventForm.tsx to consume the new props**

Full content of `src/features/create-event/ui/EventForm.tsx`:

```tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ActivityType } from '@/shared/types';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { EventFormProps } from '../model/types';
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

  const typeOptions = useMemo(() => [
    { label: t('types.game'), value: 'game' as ActivityType },
    { label: t('types.raid'), value: 'raid' as ActivityType },
    { label: t('types.meeting'), value: 'meeting' as ActivityType },
    { label: t('types.other'), value: 'other' as ActivityType },
  ], [t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) return;
    onSubmit({ title, date, time, type, description });
  };

  const showDateInput = !isDayView || isEdit;

  return (
    <form id={formId} onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="title">{t('titleLabel')}</label>
        <input
          type="text"
          id="title"
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.row}>
        {showDateInput && (
          <div className={styles.formGroup}>
            <label htmlFor="date">{t('dateLabel')}</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={styles.input}
            />
          </div>
        )}
        <div className={styles.formGroup}>
          <label htmlFor="time">{t('timeLabel')}</label>
          <input
            type="time"
            id="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className={styles.input}
          />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label>{t('typeLabel')}</label>
        <Select
          value={type}
          onValueChange={(val) => setType(val as ActivityType)}
          options={typeOptions}
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="description">{t('descriptionLabel')}</label>
        <textarea
          id="description"
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.textarea}
        />
      </div>
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
    </form>
  );
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:run -- src/features/create-event/ui/EventForm.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/create-event/model/types.ts src/features/create-event/ui/EventForm.tsx src/features/create-event/ui/EventForm.test.tsx
git commit -m "feat(event-form): add hideActions and formId props"
```

---

## Task 3: Create EventWizard.module.css

**Files:**
- Create: `src/features/create-event/ui/EventWizard.module.css`

- [ ] **Step 1: Create the CSS file**

Full content of `src/features/create-event/ui/EventWizard.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
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

.columnTitle {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 24px;
}

.stubGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  opacity: 0.45;
}

.stubLabel {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.stubField {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  height: 45px;
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.colorDots {
  display: flex;
  gap: 10px;
  padding: 8px 0;
}

.colorDot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.colorDotPurple { background: #6c63ff; }
.colorDotPink   { background: #ff6584; }
.colorDotGreen  { background: #43aa8b; }
.colorDotOrange { background: #f8961e; }
.colorDotBlue   { background: #577590; }

.dayToggles {
  display: flex;
  gap: 6px;
}

.dayToggle {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
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
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
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

- [ ] **Step 2: Commit**

```bash
git add src/features/create-event/ui/EventWizard.module.css
git commit -m "feat(event-wizard): add full-screen wizard styles"
```

---

## Task 4: Write failing tests for EventWizard

**Files:**
- Create: `src/features/create-event/ui/EventWizard.test.tsx`

- [ ] **Step 1: Create the test file**

Full content of `src/features/create-event/ui/EventWizard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventWizard } from './EventWizard';
import { calendarReducer } from '@/entities/calendar';
import { guildReducer } from '@/entities/guild/model/slice';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/entities/event', () => ({
  createEventThunk: vi.fn(() => ({ type: 'event/create', payload: undefined, meta: { requestStatus: 'fulfilled' } })),
  updateEventThunk: vi.fn(() => ({ type: 'event/update', payload: undefined, meta: { requestStatus: 'fulfilled' } })),
}));

function makeStore(uiOverrides = {}) {
  return configureStore({
    reducer: { ui: calendarReducer, guild: guildReducer },
    preloadedState: {
      ui: {
        isEventModalOpen: false,
        selectedDate: null,
        viewDate: '2026-05-20T00:00:00.000Z',
        ...uiOverrides,
      },
      guild: { currentGuildId: null },
    },
  });
}

function renderWizard(uiOverrides = {}) {
  const store = makeStore(uiOverrides);
  return render(
    <Provider store={store}>
      <EventWizard />
    </Provider>
  );
}

describe('EventWizard', () => {
  it('is not visible when isEventModalOpen is false', () => {
    renderWizard({ isEventModalOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the form when isEventModalOpen is true', () => {
    renderWizard({ isEventModalOpen: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('dispatches closeEventModal when close button is clicked', async () => {
    const user = userEvent.setup();
    const store = makeStore({ isEventModalOpen: true });
    render(
      <Provider store={store}>
        <EventWizard />
      </Provider>
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(store.getState().ui.isEventModalOpen).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/features/create-event/ui/EventWizard.test.tsx
```

Expected: FAIL — `EventWizard` module does not exist yet.

---

## Task 5: Create EventWizard.tsx

**Files:**
- Create: `src/features/create-event/ui/EventWizard.tsx`

- [ ] **Step 1: Create the component**

Full content of `src/features/create-event/ui/EventWizard.tsx`:

```tsx
'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventModal } from '@/entities/calendar';
import { createEventThunk, updateEventThunk } from '@/entities/event';
import { Button } from '@/shared/ui/Button';
import dayjs from '@/shared/lib/dayjs';
import { EventForm } from './EventForm';
import { EventFormData } from '../model/types';
import styles from './EventWizard.module.css';

const COLOR_DOTS = [
  { cls: styles.colorDotPurple, label: 'Purple' },
  { cls: styles.colorDotPink,   label: 'Pink' },
  { cls: styles.colorDotGreen,  label: 'Green' },
  { cls: styles.colorDotOrange, label: 'Orange' },
  { cls: styles.colorDotBlue,   label: 'Blue' },
];

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const FORM_ID = 'event-wizard-form';

export const EventWizard: React.FC<{ guildId?: string; isDayView?: boolean }> = ({
  guildId: propGuildId,
  isDayView,
}) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isEventModalOpen);
  const selectedDate = useAppSelector((state) => state.ui.selectedDate);
  const editingEvent = useAppSelector((state) => state.ui.editingEvent);
  const currentGuildId = useAppSelector((state) => state.guild.currentGuildId);

  const activeGuildId = currentGuildId || propGuildId;

  const t = useTranslations('Event');
  const commonT = useTranslations('Common');

  const handleClose = () => {
    dispatch(closeEventModal());
  };

  const handleSubmit = (data: EventFormData) => {
    if (!activeGuildId) {
      toast.error(t('error'));
      return;
    }

    if (editingEvent) {
      dispatch(updateEventThunk({ id: editingEvent.id, event: data })).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          toast.success(t('successUpdated'));
        } else {
          toast.error(t('error'));
        }
      });
    } else {
      dispatch(createEventThunk({ ...data, guild_id: activeGuildId })).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          toast.success(t('successCreated'));
        } else {
          toast.error(t('error'));
        }
      });
    }
    handleClose();
  };

  const initialData = useMemo(() => {
    if (editingEvent) return editingEvent;
    if (selectedDate) return { date: dayjs(selectedDate).format('YYYY-MM-DD') };
    return undefined;
  }, [editingEvent, selectedDate]);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className={styles.overlay} aria-describedby={undefined}>
          <div className={styles.header}>
            <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
              <X size={20} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className={styles.title}>
              {editingEvent ? t('editTitle') : t('createTitle')}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <div className={styles.column}>
              <p className={styles.columnTitle}>Main</p>
              {isOpen && (
                <EventForm
                  key={editingEvent?.id || selectedDate || 'new'}
                  initialData={initialData}
                  onSubmit={handleSubmit}
                  onCancel={handleClose}
                  submitLabel={editingEvent ? commonT('save') : t('submit')}
                  isDayView={isDayView}
                  isEdit={!!editingEvent}
                  hideActions
                  formId={FORM_ID}
                />
              )}
            </div>

            <div className={styles.column}>
              <p className={styles.columnTitle}>Additional</p>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>Event icon</span>
                <div className={styles.stubField}>Choose icon…</div>
              </div>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>Color</span>
                <div className={styles.colorDots}>
                  {COLOR_DOTS.map(({ cls, label }) => (
                    <div key={label} className={`${styles.colorDot} ${cls}`} />
                  ))}
                </div>
              </div>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>Repeat on days</span>
                <div className={styles.dayToggles}>
                  {DAY_LABELS.map((d) => (
                    <div key={d} className={styles.dayToggle}>{d}</div>
                  ))}
                </div>
              </div>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>Invited users</span>
                <div className={styles.stubField}>Add members…</div>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button type="submit" variant="primary" form={FORM_ID}>
              {editingEvent ? commonT('save') : t('submit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm run test:run -- src/features/create-event/ui/EventWizard.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 3: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/create-event/ui/EventWizard.tsx src/features/create-event/ui/EventWizard.test.tsx
git commit -m "feat(event-wizard): add EventWizard full-screen component"
```

---

## Task 6: Wire up EventWizard at call sites and remove EventModal

**Files:**
- Modify: `src/features/create-event/index.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/day/[date]/page.tsx`
- Delete: `src/features/create-event/ui/EventModal.tsx`

- [ ] **Step 1: Update the feature public API**

Full content of `src/features/create-event/index.ts`:

```ts
export { EventWizard } from './ui/EventWizard';
```

- [ ] **Step 2: Update src/app/page.tsx**

Change the import and usage:

```tsx
import { EventWizard } from '@/features/create-event';
```

Replace `<EventModal />` with:

```tsx
<EventWizard />
```

- [ ] **Step 3: Update src/app/day/[date]/page.tsx**

Change the import and usage:

```tsx
import { EventWizard } from '@/features/create-event';
```

Replace `<EventModal isDayView />` with:

```tsx
<EventWizard isDayView />
```

- [ ] **Step 4: Delete EventModal.tsx**

```bash
git rm src/features/create-event/ui/EventModal.tsx
```

- [ ] **Step 5: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 6: Run build to verify no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/create-event/index.ts src/app/page.tsx src/app/day/[date]/page.tsx
git commit -m "feat(event-wizard): wire EventWizard at call sites, remove EventModal"
```
