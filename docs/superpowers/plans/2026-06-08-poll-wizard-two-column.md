# Two-Column Poll Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `PollWizard` into a two-column wizard — left: title, description, Telegram-style answer options; right: three settings toggles — UI-only, submit stays a stub.

**Architecture:** Reuse the shared `WizardDialog`/`WizardColumn` shell already used by Event/Guild wizards. Answer-option growth logic lives in a pure, tested helper in `features/guild-poll/model/options.ts`; a controlled `PollOptionsField` sub-component renders the list. `PollWizard` owns all form state.

**Tech Stack:** React 19, TypeScript, CSS Modules, next-intl, Radix (Switch/Form), Vitest + Testing Library.

---

### Task 1: Options helper (pure logic, TDD)

**Files:**
- Create: `src/features/guild-poll/model/options.ts`
- Test: `src/features/guild-poll/model/options.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/guild-poll/model/options.test.ts
import { describe, it, expect } from 'vitest';
import { MIN_POLL_OPTIONS, MAX_POLL_OPTIONS, ensureTrailingSlot, countFilled } from './options';

describe('poll options helper', () => {
  it('exposes 2 and 10 as min/max', () => {
    expect(MIN_POLL_OPTIONS).toBe(2);
    expect(MAX_POLL_OPTIONS).toBe(10);
  });

  it('appends an empty trailing slot when the last entry is non-empty', () => {
    expect(ensureTrailingSlot(['A'])).toEqual(['A', '']);
  });

  it('keeps a single trailing empty slot without adding more', () => {
    expect(ensureTrailingSlot(['A', ''])).toEqual(['A', '']);
  });

  it('does not exceed the max cap and drops the trailing slot at cap', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `O${i}`);
    expect(ensureTrailingSlot(ten)).toEqual(ten);
    expect(ensureTrailingSlot([...ten, ''])).toEqual(ten);
  });

  it('counts only non-empty (trimmed) entries', () => {
    expect(countFilled(['A', '  ', 'B', ''])).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/guild-poll/model/options.test.ts`
Expected: FAIL — module `./options` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/guild-poll/model/options.ts
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 10;

/** Number of options with non-whitespace content. */
export const countFilled = (options: string[]): number =>
  options.filter((o) => o.trim() !== '').length;

/**
 * Telegram-style growth: keep exactly one trailing empty "add option" slot
 * while under the cap; never exceed MAX_POLL_OPTIONS entries.
 */
export const ensureTrailingSlot = (options: string[]): string[] => {
  if (options.length >= MAX_POLL_OPTIONS) return options.slice(0, MAX_POLL_OPTIONS);
  const last = options[options.length - 1];
  if (last === undefined || last.trim() !== '') return [...options, ''];
  return options;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/guild-poll/model/options.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/guild-poll/model/options.ts src/features/guild-poll/model/options.test.ts
git commit -m "feat(guild-poll): add poll options growth helper"
```

---

### Task 2: i18n keys

**Files:**
- Modify: `messages/en.json` (GuildPoll namespace)
- Modify: `messages/ru.json` (GuildPoll namespace)

- [ ] **Step 1: Add keys to both files**

Add these keys inside the existing `GuildPoll` object in `messages/en.json`:

```json
"optionsLabel": "Answer options",
"optionPlaceholder": "Option {index}",
"addOptionPlaceholder": "Add an option",
"removeOption": "Remove option",
"settingsLabel": "Settings",
"anonymousLabel": "Anonymous poll",
"multipleLabel": "Multiple answers",
"customLabel": "Custom answer"
```

And in `messages/ru.json`:

```json
"optionsLabel": "Варианты ответа",
"optionPlaceholder": "Вариант {index}",
"addOptionPlaceholder": "Добавить вариант",
"removeOption": "Удалить вариант",
"settingsLabel": "Настройки",
"anonymousLabel": "Анонимный опрос",
"multipleLabel": "Несколько ответов",
"customLabel": "Свой вариант ответа"
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json')); JSON.parse(require('fs').readFileSync('messages/ru.json')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "i18n(guild-poll): add poll wizard options & settings keys"
```

---

### Task 3: PollOptionsField component

**Files:**
- Create: `src/features/guild-poll/ui/PollOptionsField.tsx`
- Create: `src/features/guild-poll/ui/PollOptionsField.module.css`
- Test: `src/features/guild-poll/ui/PollOptionsField.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/guild-poll/ui/PollOptionsField.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PollOptionsField } from './PollOptionsField';

const messages = {
  GuildPoll: {
    optionsLabel: 'Answer options',
    optionPlaceholder: 'Option {index}',
    addOptionPlaceholder: 'Add an option',
    removeOption: 'Remove option',
  },
};

const renderField = (value: string[], onChange = vi.fn()) => {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PollOptionsField value={value} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return onChange;
};

describe('PollOptionsField', () => {
  it('renders one input per option', () => {
    renderField(['A', 'B', '']);
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
  });

  it('grows a trailing slot when the last input gets text', () => {
    const onChange = renderField(['A', '']);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[1], { target: { value: 'B' } });
    expect(onChange).toHaveBeenCalledWith(['A', 'B', '']);
  });

  it('removes an option via its remove button', () => {
    const onChange = renderField(['A', 'B', '']);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove option' })[0]);
    expect(onChange).toHaveBeenCalledWith(['B', '']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/guild-poll/ui/PollOptionsField.test.tsx`
Expected: FAIL — module `./PollOptionsField` not found.

- [ ] **Step 3: Write the component**

```tsx
// src/features/guild-poll/ui/PollOptionsField.tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { ensureTrailingSlot } from '../model/options';
import styles from './PollOptionsField.module.css';

interface PollOptionsFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export const PollOptionsField: React.FC<PollOptionsFieldProps> = ({ value, onChange }) => {
  const t = useTranslations('GuildPoll');

  const handleChange = (index: number, next: string) => {
    onChange(ensureTrailingSlot(value.map((o, i) => (i === index ? next : o))));
  };

  const handleRemove = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange(ensureTrailingSlot(next.length ? next : ['']));
  };

  const lastIndex = value.length - 1;

  return (
    <div className={styles.field}>
      <span className={styles.label}>{t('optionsLabel')}</span>
      <ul className={styles.list}>
        {value.map((option, index) => {
          const isTrailingEmpty = index === lastIndex && option.trim() === '';
          return (
            <li key={index} className={styles.row}>
              <Input
                type="text"
                value={option}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder={
                  isTrailingEmpty
                    ? t('addOptionPlaceholder')
                    : t('optionPlaceholder', { index: index + 1 })
                }
                className={styles.input}
              />
              {!isTrailingEmpty && (
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => handleRemove(index)}
                  aria-label={t('removeOption')}
                >
                  <X size={16} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
```

```css
/* src/features/guild-poll/ui/PollOptionsField.module.css */
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

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input {
  flex: 1;
  min-width: 0;
}

.remove {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  padding: 6px;
  border-radius: 6px;
  flex-shrink: 0;
  transition: color 0.2s ease, background 0.2s ease;
}

.remove:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/guild-poll/ui/PollOptionsField.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/guild-poll/ui/PollOptionsField.tsx src/features/guild-poll/ui/PollOptionsField.module.css src/features/guild-poll/ui/PollOptionsField.test.tsx
git commit -m "feat(guild-poll): add Telegram-style PollOptionsField"
```

---

### Task 4: Extend PollWizard to two columns

**Files:**
- Modify: `src/features/guild-poll/ui/PollWizard.tsx` (full rewrite of body/state)
- Modify: `src/features/guild-poll/ui/PollWizard.module.css` (add settings styles)

- [ ] **Step 1: Rewrite PollWizard**

Replace the entire contents of `src/features/guild-poll/ui/PollWizard.tsx` with:

```tsx
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import * as Form from '@radix-ui/react-form';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Switch } from '@/shared/ui/Switch';
import { FormField } from '@/shared/ui/FormField';
import { WizardDialog, WizardColumn } from '@/shared/ui/WizardDialog';
import { countFilled, MIN_POLL_OPTIONS } from '../model/options';
import { PollOptionsField } from './PollOptionsField';
import styles from './PollWizard.module.css';

const FORM_ID = 'poll-wizard-form';

interface PollWizardProps {
  open: boolean;
  onClose: () => void;
}

export const PollWizard: React.FC<PollWizardProps> = ({ open, onClose }) => {
  const t = useTranslations('GuildPoll');
  const commonT = useTranslations('Common');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowCustom, setAllowCustom] = useState(false);

  const isValid = title.trim() !== '' && countFilled(options) >= MIN_POLL_OPTIONS;

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setOptions(['', '']);
    setIsAnonymous(false);
    setAllowMultiple(false);
    setAllowCustom(false);
    onClose();
  };

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!isValid) return;
    handleClose();
  };

  const settings: { key: string; label: string; checked: boolean; onChange: (v: boolean) => void }[] = [
    { key: 'anonymous', label: t('anonymousLabel'), checked: isAnonymous, onChange: setIsAnonymous },
    { key: 'multiple', label: t('multipleLabel'), checked: allowMultiple, onChange: setAllowMultiple },
    { key: 'custom', label: t('customLabel'), checked: allowCustom, onChange: setAllowCustom },
  ];

  return (
    <WizardDialog
      open={open}
      onClose={handleClose}
      title={t('createTitle')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {commonT('cancel')}
          </Button>
          <Button type="submit" variant="primary" form={FORM_ID} disabled={!isValid}>
            {t('createButton')}
          </Button>
        </>
      }
    >
      <WizardColumn>
        <Form.Root id={FORM_ID} onSubmit={handleSubmit} className={styles.form}>
          <FormField name="title" label={t('nameLabel')} className={styles.formGroup}>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('namePlaceholder')}
              required
              autoFocus
            />
          </FormField>
          <FormField name="description" label={t('descriptionLabel')} className={styles.formGroup}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
            />
          </FormField>
          <PollOptionsField value={options} onChange={setOptions} />
        </Form.Root>
      </WizardColumn>

      <WizardColumn>
        <span className={styles.settingsLabel}>{t('settingsLabel')}</span>
        <ul className={styles.settingsList}>
          {settings.map((s) => (
            <li key={s.key} className={styles.settingRow}>
              <span className={styles.settingLabel}>{s.label}</span>
              <Switch checked={s.checked} onCheckedChange={s.onChange} ariaLabel={s.label} />
            </li>
          ))}
        </ul>
      </WizardColumn>
    </WizardDialog>
  );
};
```

- [ ] **Step 2: Add settings styles**

Append to `src/features/guild-poll/ui/PollWizard.module.css`:

```css
.settingsLabel {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.settingsList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settingRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--glass-border);
}

.settingRow:last-child {
  border-bottom: none;
}

.settingLabel {
  font-size: 0.9375rem;
  color: var(--text-primary);
}
```

- [ ] **Step 3: Typecheck the feature**

Run: `npx tsc --noEmit`
Expected: no NEW errors under `src/features/guild-poll` (pre-existing test-mock errors in other files are unrelated).

- [ ] **Step 4: Commit**

```bash
git add src/features/guild-poll/ui/PollWizard.tsx src/features/guild-poll/ui/PollWizard.module.css
git commit -m "feat(guild-poll): two-column poll wizard with options & settings"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run feature tests**

Run: `npx vitest run src/features/guild-poll`
Expected: PASS (Task 1 + Task 3 suites).

- [ ] **Step 2: Lint changed files**

Run: `npx eslint src/features/guild-poll`
Expected: no errors.

- [ ] **Step 3: FSD check**

Run: `pnpm lint:fsd`
Expected: only the pre-existing `insignificant-slice` notes (filter-events, guild-poll); no import-direction or public-API violations.

- [ ] **Step 4: Confirm regression suites still pass**

Run: `npx vitest run src/widgets/guild-chat src/features/create-event/ui/EventWizard.test.tsx`
Expected: PASS.

---

## Notes for the engineer

- Do NOT add inline styles — CSS Modules only, design-system tokens only.
- Submit is intentionally a stub (no Supabase) per the spec — do not wire an API.
- `WizardColumn` auto-sizes columns to `1fr` each; two columns give the standard split.
- `Switch` is `@/shared/ui/Switch` with `checked` / `onCheckedChange` / `ariaLabel`.
