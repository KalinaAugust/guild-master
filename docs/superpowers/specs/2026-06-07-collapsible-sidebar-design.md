# Collapsible Sidebar — Design

## Summary

A left navigation rail that is collapsed by default (icons only) and expands on
mouse hover to a wider panel showing text labels next to each icon. Built with
the existing stack (Next.js App Router, FSD, CSS Modules, lucide-react). No Radix
component is needed — this is a layout widget, not a modal.

## Goals

- Collapsed icon rail, always visible on the left, full viewport height.
- On hover the rail expands and reveals labels; collapses again on mouse leave.
- Expansion is an **overlay**: it floats above the page content; content does not
  reflow.
- Activation is **hover only** (no pin, no click-to-toggle, no keyboard expand for
  this iteration). On touch/narrow screens the rail stays collapsed and tapping an
  item navigates.

## Non-goals (this iteration)

- Nested/expandable sub-items, grouped sections with headings.
- Pinned/locked-open state and its persistence.
- Keyboard-driven expansion / `:focus-within`.
- Mobile burger menu.

Badges are not used yet, but the item component is built with an optional badge
prop so future items (e.g. unread counts) need no rework.

## Layout & geometry

- **Sidebar**: `position: fixed; left: 0; top: 0; height: 100dvh`. Collapsed width
  `--rail-width` (~72px), expanded width ~260px. Width transitions on `:hover`.
  `z-index` above page content.
- **Right column** (Header + content): offset by `margin-left: var(--rail-width)`,
  so the rail is always visible and "props up" the Header from the left.
- **Header**: changed from `position: sticky` to a normal in-flow element — it is
  now just the top of the page and scrolls with content.
- **Overlay behavior (variant a)**: because the sidebar is full height, the
  expanded panel floats over the left edge of the page including the left part of
  the Header (the logo). This is accepted for this iteration.

## FSD structure

New widget `widgets/sidebar`:

- `ui/Sidebar.tsx` — `'use client'`. Renders `<nav>` with the item list. Determines
  the active item via `usePathname()` from `next/navigation`.
- `ui/SidebarItem.tsx` — one item: lucide icon + label + optional badge. Label is
  hidden (opacity 0, non-wrapping) when collapsed, fades in when the rail is
  expanded. Active item gets a highlighted style.
- `ui/Sidebar.module.css` — all width/animation/overlay/active styling. No inline
  styles.
- `model/navItems.ts` — array of `{ href, icon, labelKey, badge? }`.
  Initial content: a single item
  `{ href: '/guilds', icon: Users, labelKey: 'Guild.title' }`.
- `index.ts` — public barrel exporting `Sidebar`.

## Data, i18n, state

- **No server data, no RTK Query, no Redux.** Pure presentational + routing.
- **i18n**: labels resolved via `next-intl` `useTranslations` using the existing
  `Guild` namespace (`Guild.title`). `Guild` is already in the `requiredNamespaces`
  list in `layout.tsx`, so it is available client-side — no change needed there.
- **Active state**: derived from `usePathname()` — an item is active when the
  pathname starts with its `href`.

## Files touched

- `src/app/layout.tsx` — render `<Sidebar />`; wrap `<Header />` + `.content` in a
  right-column container offset by the rail width.
- `src/app/Layout.module.css` — add the right-column / offset rule.
- `src/widgets/header/ui/Header.module.css` — remove `position: sticky; top: 0`.
- `src/widgets/sidebar/**` — new widget (files above).

## CSS sketch

```css
/* Sidebar.module.css */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100dvh;
  width: var(--rail-width);
  overflow: hidden;
  transition: width 200ms ease;
  z-index: 200;
}
.sidebar:hover { width: 260px; }

.label {
  opacity: 0;
  white-space: nowrap;
  transition: opacity 150ms ease;
}
.sidebar:hover .label { opacity: 1; }
```

`--rail-width` is defined as a CSS variable (globals or layout) and reused by the
right-column offset.

## Testing

- Component renders the nav with the configured items (label text present).
- Active item gets the active class when `usePathname()` matches its `href`.
- (CSS-driven hover/overlay is visual; verified by the user in the browser, per
  project convention — no browser automation by the agent.)
```
