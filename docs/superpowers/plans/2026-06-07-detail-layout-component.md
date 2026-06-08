# DetailLayout Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the shared full-screen "detail" frame (fixed container + header + two-column body + optional footer) from `GuildDetailContent` and `EventDetailContent` into a reusable `shared/ui/DetailLayout`, and shorten the frame header from 64px to 48px.

**Architecture:** New presentational `shared/ui/DetailLayout` with slot props (`backHref`, `backLabel`, `title`, `left`, `right`, `footer?`, `rightClassName?`). The frame CSS moves into its module. Both features render `DetailLayout`, passing their column/footer content as slots; their CSS modules keep only content-specific rules. Loading/error early-returns keep a small local `.stateContainer`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Modules, next/link, lucide-react, Vitest + Testing Library.

> **Commit policy:** This project's CLAUDE.md forbids commits unless the user explicitly asks. Do NOT run `git commit` during execution. The user commits at the end.

---

### Task 1: Create the DetailLayout component (TDD)

**Files:**
- Create: `src/shared/ui/DetailLayout/DetailLayout.test.tsx`
- Create: `src/shared/ui/DetailLayout/DetailLayout.tsx`
- Create: `src/shared/ui/DetailLayout/DetailLayout.module.css`
- Create: `src/shared/ui/DetailLayout/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/ui/DetailLayout/DetailLayout.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DetailLayout } from './DetailLayout';

const base = {
  backHref: '/guilds',
  backLabel: 'Back to guilds',
  title: 'My Guild',
  left: <p>left content</p>,
  right: <p>right content</p>,
};

describe('DetailLayout', () => {
  it('renders the title', () => {
    render(<DetailLayout {...base} />);
    expect(screen.getByRole('heading', { name: 'My Guild' })).toBeInTheDocument();
  });

  it('renders the back link with the given href and label', () => {
    render(<DetailLayout {...base} />);
    expect(screen.getByRole('link', { name: /Back to guilds/ })).toHaveAttribute('href', '/guilds');
  });

  it('renders the left and right slot content', () => {
    render(<DetailLayout {...base} />);
    expect(screen.getByText('left content')).toBeInTheDocument();
    expect(screen.getByText('right content')).toBeInTheDocument();
  });

  it('does not render a footer when the footer prop is omitted', () => {
    const { container } = render(<DetailLayout {...base} />);
    expect(container.querySelector('[class*="footer"]')).toBeNull();
  });

  it('renders the footer when provided', () => {
    render(<DetailLayout {...base} footer={<button>Edit</button>} />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/shared/ui/DetailLayout/DetailLayout.test.tsx`
Expected: FAIL — cannot resolve `./DetailLayout`.

- [ ] **Step 3: Create the CSS module**

```css
/* src/shared/ui/DetailLayout/DetailLayout.module.css */
.container {
  position: fixed;
  top: var(--header-height);
  left: var(--rail-width);
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 24px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
  position: relative;
}

.backLink {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  z-index: 1;
}

.backLink:hover {
  color: var(--text-primary);
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent-yellow);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}

.body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.body::-webkit-scrollbar { width: 6px; }
.body::-webkit-scrollbar-track { background: transparent; }
.body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}
.body::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.28); }

.column {
  padding: 20px;
}

.column:first-child {
  border-right: 1px solid var(--glass-border);
}

.columnRight {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .body {
    grid-template-columns: 1fr;
  }

  .column:first-child {
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
  }

  .columnRight {
    display: block;
    overflow: visible;
  }

  .title {
    max-width: 50%;
  }
}
```

- [ ] **Step 4: Create the component**

```tsx
// src/shared/ui/DetailLayout/DetailLayout.tsx
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import styles from './DetailLayout.module.css';

interface DetailLayoutProps {
  backHref: string;
  backLabel: string;
  title: string;
  left: ReactNode;
  right: ReactNode;
  /** Optional — some states render no footer. */
  footer?: ReactNode;
  /** Modifier class applied to the right column (e.g. a feature's tab padding). */
  rightClassName?: string;
}

export const DetailLayout = ({
  backHref,
  backLabel,
  title,
  left,
  right,
  footer,
  rightClassName,
}: DetailLayoutProps) => (
  <div className={styles.container}>
    <div className={styles.header}>
      <Link href={backHref} className={styles.backLink}>
        <ChevronLeft size={20} />
        {backLabel}
      </Link>
      <h1 className={styles.title}>{title}</h1>
    </div>

    <div className={styles.body}>
      <div className={styles.column}>{left}</div>
      <div className={`${styles.column} ${styles.columnRight}${rightClassName ? ` ${rightClassName}` : ''}`}>
        {right}
      </div>
    </div>

    {footer && <div className={styles.footer}>{footer}</div>}
  </div>
);
```

- [ ] **Step 5: Create the barrel**

```ts
// src/shared/ui/DetailLayout/index.ts
export { DetailLayout } from './DetailLayout';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm exec vitest run src/shared/ui/DetailLayout/DetailLayout.test.tsx`
Expected: PASS — 5 tests green.

---

### Task 2: Migrate GuildDetailContent to DetailLayout

**Files:**
- Modify: `src/features/guild-detail/ui/GuildDetailContent.tsx`
- Modify: `src/features/guild-detail/ui/GuildDetailContent.module.css`

- [ ] **Step 1: Import DetailLayout**

In `GuildDetailContent.tsx`, add to the imports (near the other `@/shared/ui` imports):

```tsx
import { DetailLayout } from '@/shared/ui/DetailLayout';
```

- [ ] **Step 2: Point the loading/error early returns at a local state container**

Replace the two early-return blocks (currently using `styles.container`):

```tsx
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!guild) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Guild not found</p>
      </div>
    );
  }
```

with the same markup but using `styles.stateContainer`:

```tsx
  if (isLoading) {
    return (
      <div className={styles.stateContainer}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!guild) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.empty}>Guild not found</p>
      </div>
    );
  }
```

- [ ] **Step 3: Replace the main return with DetailLayout**

The current main `return ( <div className={styles.container}> … </div> )` block (the header, the two `styles.column` divs inside `styles.body`, the three conditional `styles.footer` blocks, and the trailing `<ConfirmModal>`) becomes a fragment containing `DetailLayout` plus the modal. Move the **existing inner JSX unchanged** into the slots:

- `left` = the exact children currently inside the first `<div className={styles.column}>…</div>` (the description `infoGroup` and the owner `infoGroup`).
- `right` = the exact children currently inside `<div className={`${styles.column} ${styles.columnRight}`}>…</div>` (the owner/member/pending/guest blocks).
- `footer` = the single applicable action, folded into one expression (replacing the three separate `styles.footer` blocks).

```tsx
  return (
    <>
      <DetailLayout
        backHref="/guilds"
        backLabel={t('backToGuilds')}
        title={guild.name}
        left={
          <>
            {/* existing first-column children, moved verbatim */}
          </>
        }
        right={
          <>
            {/* existing right-column (columnRight) children, moved verbatim */}
          </>
        }
        footer={
          membershipStatus === 'owner' ? (
            <Button type="button" variant="primary" onClick={handleEdit}>
              {commonT('edit')}
            </Button>
          ) : showApplyFooter ? (
            <Button type="button" variant="primary" onClick={handleApply} isLoading={isSubmitting}>
              {t('applyToJoin')}
            </Button>
          ) : membershipStatus === 'member' ? (
            <Button type="button" variant="danger" onClick={() => setIsLeaveConfirmOpen(true)}>
              {t('leaveGuild')}
            </Button>
          ) : undefined
        }
      />

      <ConfirmModal
        isOpen={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={handleLeave}
        title={t('leaveConfirmTitle')}
        description={t('leaveConfirmDescription')}
      />
      {/* keep any other trailing JSX (e.g. additional ConfirmModal props/lines) exactly as it was */}
    </>
  );
```

Note: the right column previously had no `rightClassName`; do not pass one here.

- [ ] **Step 4: Remove the migrated rules from `GuildDetailContent.module.css`**

Delete these selectors entirely (now owned by `DetailLayout.module.css`): `.container`, `.header`, `.backLink`, `.backLink:hover`, `.title`, `.body`, `.body::-webkit-scrollbar`, `.body::-webkit-scrollbar-track`, `.body::-webkit-scrollbar-thumb`, `.body::-webkit-scrollbar-thumb:hover`, `.column`, `.column:first-child`, `.columnRight`, `.footer`. In the `@media (max-width: 768px)` block, delete the `.body`, `.column:first-child`, `.columnRight`, and `.title` rules; KEEP the `.infoGroupGrow { flex: none; }` rule.

Add a local state container used by the early returns:

```css
.stateContainer {
  position: fixed;
  top: var(--header-height);
  left: var(--rail-width);
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

KEEP all content-specific rules: `.infoGroup`, `.infoGroupGrow`, `.label`, `.value`, `.description`, `.memberCount`, `.statusBadge`, `.statusMember`, `.statusPending`, `.signInText`, `.empty`, `.skeleton`, `.pulse` keyframes.

- [ ] **Step 5: Type-check and run guild-detail tests**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors (pre-existing errors in `EventWizard.test.tsx` / `EventDetailContent.test.tsx` for stale `UIState` may remain; none should reference guild-detail).

Run: `pnpm exec vitest run src/features/guild-detail`
Expected: PASS.

---

### Task 3: Migrate EventDetailContent to DetailLayout

**Files:**
- Modify: `src/features/event-detail/ui/EventDetailContent.tsx`
- Modify: `src/features/event-detail/ui/EventDetailContent.module.css`

- [ ] **Step 1: Import DetailLayout**

In `EventDetailContent.tsx`, add near the other `@/shared/ui` imports:

```tsx
import { DetailLayout } from '@/shared/ui/DetailLayout';
```

- [ ] **Step 2: Point the loading/error early returns at a local state container**

Replace the two early-return blocks that use `styles.container`:

```tsx
  if (isEventLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>{eventT('error')}</p>
      </div>
    );
  }
```

with `styles.stateContainer`:

```tsx
  if (isEventLoading) {
    return (
      <div className={styles.stateContainer}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.empty}>{eventT('error')}</p>
      </div>
    );
  }
```

- [ ] **Step 3: Replace the main return with DetailLayout**

The main `return ( <div className={styles.container}> … </div> )` (header, the two columns inside `styles.body`, the conditional `isCreator` `styles.footer`, and the two trailing `<ConfirmModal>` elements) becomes a fragment with `DetailLayout` plus the modals. Move the **existing inner JSX unchanged** into the slots. The right column keeps its conditional tab padding via `rightClassName`:

```tsx
  return (
    <>
      <DetailLayout
        backHref={`/day/${event.date}?guildId=${data.guildId}`}
        backLabel={commonT('backToDay')}
        title={event.title}
        rightClassName={canReadComments ? styles.columnRightTabs : undefined}
        left={
          <>
            {/* existing first-column children, moved verbatim (type, dateTime, description groups) */}
          </>
        }
        right={
          <>
            {/* existing right-column (columnRight) children, moved verbatim
               (requestsGroup, actionButton, requestSentBadge, EventTabs/participantsBlock) */}
          </>
        }
        footer={
          isCreator ? (
            <>
              <Button type="button" variant="secondary" onClick={() => setDeleteModalOpen(true)}>
                {commonT('delete')}
              </Button>
              <Button type="button" variant="primary" onClick={handleEdit}>
                {commonT('edit')}
              </Button>
            </>
          ) : undefined
        }
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={commonT('delete')}
        description={commonT('confirmDelete')}
        confirmLabel={commonT('delete')}
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onConfirm={handleLeave}
        title={t('leave')}
        description={t('confirmLeave')}
        confirmLabel={t('leave')}
        isLoading={isLeaving}
      />
    </>
  );
```

Note: `participantsBlock` is a local `const` defined before the return — leave it where it is; it is referenced inside the `right` slot exactly as today.

- [ ] **Step 4: Remove the migrated rules from `EventDetailContent.module.css`**

Delete these selectors entirely (now owned by `DetailLayout.module.css`): `.container`, `.header`, `.backLink`, `.backLink:hover`, `.title`, `.body`, `.body::-webkit-scrollbar`, `.body::-webkit-scrollbar-track`, `.body::-webkit-scrollbar-thumb`, `.body::-webkit-scrollbar-thumb:hover`, `.column`, `.column:first-child`, `.columnRight`, `.footer`. In the `@media (max-width: 768px)` block, delete the `.body`, `.column:first-child`, `.columnRight`, and `.title` rules; KEEP the `.participantList { flex: none; max-height: 60vh; }` rule.

Add the local state container:

```css
.stateContainer {
  position: fixed;
  top: var(--header-height);
  left: var(--rail-width);
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

KEEP all content-specific rules: `.columnRightTabs`, `.infoGroup`, `.label`, `.typeHero*` (all variants), `.typeHeroIcon`, `.typeHeroLabel`, `.dateTime`, `.dateNum`, `.description`, `.empty`, `.participantList` (+ its scrollbar rules), `.skeleton`, `.pulse` keyframes, `.requestsGroup`, `.requestSentBadge`, `.requestSentLabel`, `.actionButton`, `.addSelfButton`.

- [ ] **Step 5: Type-check and run event-detail tests**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors beyond the known pre-existing ones.

Run: `pnpm exec vitest run src/features/event-detail`
Expected: PASS.

---

### Task 4: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test:run`
Expected: all tests pass, including the new `DetailLayout.test.tsx`.

- [ ] **Step 2: FSD lint**

Run: `pnpm lint:fsd`
Expected: no NEW violations. (`shared/ui/DetailLayout` imported from features is allowed; a pre-existing `fsd/insignificant-slice` finding on `src/features/filter-events` may remain and is unrelated.)

- [ ] **Step 3: ESLint**

Run: `pnpm lint`
Expected: no NEW errors from the touched files. (A pre-existing `no-explicit-any` in `src/app/layout.tsx` may remain and is unrelated.)

- [ ] **Step 4: Production build**

Run: `pnpm build`
Expected: compiles successfully.

> Do NOT commit. Report completion and let the user verify the detail pages in the browser (header now 48px; layout otherwise unchanged).

---

## Self-Review Notes

- **Spec coverage:** reusable frame in `shared/ui/DetailLayout` (Task 1) ✓; slot API with `footer?`/`rightClassName?` (Task 1) ✓; header 48px (Task 1 CSS) ✓; frame CSS moved, content/skeleton/pulse stay in features (Tasks 2–3 step 4) ✓; both features migrated (Tasks 2–3) ✓; loading/error use local `.stateContainer` (Tasks 2–3 step 2/4) ✓; `columnRightTabs` via `rightClassName` (Task 3 step 3) ✓; modals kept as fragment siblings (Tasks 2–3 step 3) ✓; DetailLayout test + suites green + lint/build (Tasks 1, 4) ✓; `day` page untouched (not in scope) ✓.
- **Placeholders:** the `{/* moved verbatim */}` comments are refactor move-instructions, not missing implementations — the source JSX exists in the files being edited. All new code (component, CSS, footer expressions, early returns) is shown in full.
- **Type consistency:** `DetailLayoutProps` fields (`backHref`, `backLabel`, `title`, `left`, `right`, `footer?`, `rightClassName?`) are used consistently in both migrations; `rightClassName` typed `string | undefined` matches `canReadComments ? styles.columnRightTabs : undefined`.
