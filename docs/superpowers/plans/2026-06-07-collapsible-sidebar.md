# Collapsible Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a left navigation rail that is collapsed (icons only) by default and expands on mouse hover to reveal text labels, overlaying page content.

**Architecture:** New FSD widget `widgets/sidebar`. Pure CSS hover-driven expansion (no JS state). The widget is a client component only to read `usePathname()` for active-item highlighting. Layout is restructured so the sidebar is `position: fixed` full-height on the left and the Header+content column is offset by the rail width.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Modules, lucide-react, next-intl, Vitest + Testing Library.

> **Commit policy:** This project's CLAUDE.md forbids commits unless the user explicitly asks. Do NOT run `git commit` during execution. The user will commit at the end.

---

### Task 1: Sidebar nav model

**Files:**
- Create: `src/widgets/sidebar/model/navItems.ts`

- [ ] **Step 1: Create the nav items model**

```ts
import { Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  /** Full next-intl key, resolved via the root translator, e.g. "Guild.title". */
  labelKey: string;
  /** Optional numeric badge; unused for now, kept for future items. */
  badge?: number;
}

export const navItems: NavItem[] = [
  { href: '/guilds', icon: Users, labelKey: 'Guild.title' },
];
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors). `LucideIcon` is exported by `lucide-react`.

---

### Task 2: SidebarItem component

**Files:**
- Create: `src/widgets/sidebar/ui/SidebarItem.tsx`
- Create: `src/widgets/sidebar/ui/Sidebar.module.css`

- [ ] **Step 1: Create the CSS module with the item styles**

```css
/* src/widgets/sidebar/ui/Sidebar.module.css */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100dvh;
  width: var(--rail-width);
  overflow: hidden;
  transition: width 200ms ease;
  z-index: 200;
  display: flex;
  flex-direction: column;
  padding: calc(var(--header-height) + 0.5rem) 0 1rem;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.sidebar:hover {
  width: 260px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 48px;
  padding: 0 calc((var(--rail-width) - 22px) / 2);
  text-decoration: none;
  color: inherit;
  white-space: nowrap;
  border-radius: 0 12px 12px 0;
  transition: background-color 150ms ease;
}

.item:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.active {
  background-color: rgba(147, 197, 253, 0.15);
}

.icon {
  flex-shrink: 0;
}

.label {
  opacity: 0;
  transition: opacity 150ms ease;
}

.sidebar:hover .label {
  opacity: 1;
}

.badge {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #93c5fd;
  color: #0b1120;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  opacity: 0;
  transition: opacity 150ms ease;
}

.sidebar:hover .badge {
  opacity: 1;
}
```

- [ ] **Step 2: Create the SidebarItem component**

```tsx
// src/widgets/sidebar/ui/SidebarItem.tsx
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
}

export const SidebarItem = ({ href, icon: Icon, label, active, badge }: SidebarItemProps) => (
  <Link href={href} className={`${styles.item} ${active ? styles.active : ''}`}>
    <Icon size={22} className={styles.icon} />
    <span className={styles.label}>{label}</span>
    {badge ? <span className={styles.badge}>{badge}</span> : null}
  </Link>
);
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

---

### Task 3: Sidebar component (with tests)

**Files:**
- Create: `src/widgets/sidebar/ui/Sidebar.tsx`
- Test: `src/widgets/sidebar/ui/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/widgets/sidebar/ui/Sidebar.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePathname } from 'next/navigation';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/');
  });

  it('renders a nav item label for each configured item', () => {
    render(<Sidebar />);
    // labelKey "Guild.title" is echoed back by the mocked translator
    expect(screen.getByText('Guild.title')).toBeInTheDocument();
  });

  it('links the guilds item to /guilds', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /Guild.title/ })).toHaveAttribute('href', '/guilds');
  });

  it('marks the item active when the pathname matches its href', () => {
    vi.mocked(usePathname).mockReturnValue('/guilds');
    const { container } = render(<Sidebar />);
    expect(container.querySelector('a[class*="active"]')).not.toBeNull();
  });

  it('does not mark the item active on an unrelated pathname', () => {
    vi.mocked(usePathname).mockReturnValue('/profile');
    const { container } = render(<Sidebar />);
    expect(container.querySelector('a[class*="active"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/widgets/sidebar/ui/Sidebar.test.tsx`
Expected: FAIL — cannot resolve `./Sidebar` (module not yet created).

- [ ] **Step 3: Implement the Sidebar component**

```tsx
// src/widgets/sidebar/ui/Sidebar.tsx
'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { navItems } from '../model/navItems';
import { SidebarItem } from './SidebarItem';
import styles from './Sidebar.module.css';

export const Sidebar = () => {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <nav className={styles.sidebar} aria-label="Main navigation">
      <ul className={styles.list}>
        {navItems.map((item) => (
          <li key={item.href}>
            <SidebarItem
              href={item.href}
              icon={item.icon}
              label={t(item.labelKey)}
              active={pathname.startsWith(item.href)}
              badge={item.badge}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/widgets/sidebar/ui/Sidebar.test.tsx`
Expected: PASS — all 4 tests green.

> Note: with `pathname.startsWith(item.href)` the home route `/` would match every path, but `/` is not in `navItems`, so the only item (`/guilds`) is active only under `/guilds*`. Keep this in mind when adding a future Home item.

---

### Task 4: Widget public API (barrel)

**Files:**
- Create: `src/widgets/sidebar/index.ts`

- [ ] **Step 1: Create the barrel**

```ts
export { Sidebar } from './ui/Sidebar';
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

---

### Task 5: Define the rail-width CSS variable

**Files:**
- Modify: `src/app/globals.css` (the `:root` block, around line 1)

- [ ] **Step 1: Add `--rail-width` next to the existing `--header-height`**

In the existing `:root { ... }` block that already contains `--header-height: 69px;`, add:

```css
  --rail-width: 72px;
```

- [ ] **Step 2: Verify the variable is present**

Run: `grep -n "rail-width" src/app/globals.css`
Expected: one line showing `--rail-width: 72px;`.

---

### Task 6: Make the Header a normal in-flow element

**Files:**
- Modify: `src/widgets/header/ui/Header.module.css` (the `.header` rule)

- [ ] **Step 1: Remove the sticky positioning**

In the `.header` rule, delete these three lines:

```css
  position: sticky;
  top: 0;
  z-index: 100;
```

Leave the rest of `.header` (height, padding, display, border, backdrop-filter) unchanged.

- [ ] **Step 2: Verify sticky is gone**

Run: `grep -n "sticky" src/widgets/header/ui/Header.module.css`
Expected: no output (no matches).

---

### Task 7: Integrate the sidebar into the root layout

**Files:**
- Modify: `src/app/layout.tsx` (the returned JSX, inside `<StoreProvider>`)
- Modify: `src/app/Layout.module.css`

- [ ] **Step 1: Add the right-column offset to Layout.module.css**

Current file content:

```css
.content {
  padding: 0 2rem;
}
```

Replace with:

```css
.appShell {
  margin-left: var(--rail-width);
}

.content {
  padding: 0 2rem;
}
```

- [ ] **Step 2: Import the Sidebar and wrap Header + content**

In `src/app/layout.tsx`, add the import near the other widget import:

```tsx
import { Sidebar } from "@/widgets/sidebar";
```

Then change the block inside `<StoreProvider>` from:

```tsx
            <Toaster position="top-right" richColors closeButton theme="dark" />
            <Header />
            <div className={styles.content}>
              {children}
            </div>
```

to:

```tsx
            <Toaster position="top-right" richColors closeButton theme="dark" />
            <Sidebar />
            <div className={styles.appShell}>
              <Header />
              <div className={styles.content}>
                {children}
              </div>
            </div>
```

- [ ] **Step 3: Type-check and lint FSD**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

Run: `pnpm lint:fsd`
Expected: PASS — `widgets/sidebar` imported from `app` layer is allowed; no cross-widget imports introduced.

---

### Task 8: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test:run`
Expected: PASS — all tests green, including the new `Sidebar.test.tsx`.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: PASS — no new errors.

- [ ] **Step 3: Production build**

Run: `pnpm build`
Expected: PASS — build completes; `widgets/sidebar` compiles, no client/server import leakage.

> Do NOT commit. Per project policy, the user commits manually. Report completion and let the user verify the hover behavior in the browser.

---

## Self-Review Notes

- **Spec coverage:** collapsed rail (Task 2 CSS) ✓; hover expand + label fade (Task 2 CSS) ✓; overlay/no reflow — fixed sidebar + offset column (Tasks 2, 7) ✓; hover-only, no JS state (Task 3 component) ✓; active via usePathname (Task 3) ✓; single `/guilds` item, `Users` icon, `Guild.title` label (Task 1) ✓; optional badge prop (Tasks 1, 2) ✓; Header de-stickied (Task 6) ✓; no Redux/RTK Query ✓; i18n via existing `Guild` namespace already in layout's `requiredNamespaces` (no layout namespace change needed) ✓.
- **Placeholders:** none — all steps contain concrete code/commands.
- **Type consistency:** `NavItem` fields (`href`, `icon`, `labelKey`, `badge`) match `SidebarItemProps` mapping in `Sidebar.tsx`; `LucideIcon` used consistently in Tasks 1–2.
