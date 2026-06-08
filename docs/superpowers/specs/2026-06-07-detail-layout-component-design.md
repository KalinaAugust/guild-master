# DetailLayout Component — Design

## Summary

The guild-detail and event-detail pages share an identical full-screen "detail"
frame: a fixed container, a header (back link + centered title), a two-column
scrollable body, and an optional footer with actions. The frame markup and CSS
are currently duplicated across `GuildDetailContent` and `EventDetailContent`.

Extract the frame into a reusable, presentational `shared/ui/DetailLayout`
component and migrate both features to it. Also shorten the header from 64px to
48px to match the app's slim header.

## Goals

- One reusable frame component, no duplication of the container/header/body/footer
  shell or its responsive/scrollbar CSS.
- Header height reduced to 48px.
- Both existing features render identically after migration (no visual/behavior
  regression beyond the intended header height change).

## Non-goals

- Extracting content-level primitives (`infoGroup`, `label`, `description`,
  `empty`, `value`, `statusBadge`, `typeHero*`, `participantList`) — these stay in
  the features.
- Extracting `skeleton` / `pulse` — loading states are rendered inside the slot
  content, so these classes stay in the features (slot content must not depend on
  the frame's classes).
- The `day/[date]` page — it uses a different layout (only a back link, no
  two-column frame) and is not a consumer.

## FSD placement

`shared/ui/DetailLayout` — a pure presentational layout shell with no business
logic, consumed by multiple features → belongs in `shared/ui`.

Files:
- `src/shared/ui/DetailLayout/DetailLayout.tsx`
- `src/shared/ui/DetailLayout/DetailLayout.module.css`
- `src/shared/ui/DetailLayout/DetailLayout.test.tsx`
- `src/shared/ui/DetailLayout/index.ts` → `export { DetailLayout } from './DetailLayout';`

## API (slot props)

```ts
import type { ReactNode } from 'react';

interface DetailLayoutProps {
  backHref: string;
  backLabel: string;
  title: string;
  left: ReactNode;
  right: ReactNode;
  /** Optional — some states render no footer. */
  footer?: ReactNode;
  /** Modifier class applied to the right column (e.g. event-detail's tab padding). */
  rightClassName?: string;
}
```

`rightClassName` exists because `EventDetailContent` conditionally applies
`columnRightTabs` (a `padding-top` tweak) to the right column itself, which the
frame owns. The feature passes its own CSS-module class through this prop.

## Markup

```tsx
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
```

## CSS moved into `DetailLayout.module.css`

Move the shared frame rules (currently identical in both feature modules):

- `.container` — `position: fixed; top: var(--header-height); left: var(--rail-width); right: 0; bottom: 0; display: flex; flex-direction: column; overflow: hidden;`
- `.header` — flex row, `height: 48px` (was 64px), `padding: 0 24px`, bottom border, `position: relative`, `flex-shrink: 0`
- `.backLink` (+ `:hover`)
- `.title` — absolutely centered, accent-yellow, ellipsis, `max-width: 60%`
- `.body` — `flex: 1`, 2-column grid, `overflow-y: auto`, thin scrollbar (incl. `-webkit-scrollbar*` rules)
- `.column`, `.column:first-child` (right border), `.columnRight` (flex column, `min-height: 0`, overflow hidden)
- `.footer` — flex end, gap, `padding: 20px 32px`, top border, `flex-shrink: 0`
- `@media (max-width: 768px)` — body → single column, first column bottom border instead of right, `.columnRight` → block/visible, `.title` max-width 50%

## Feature migration

- `GuildDetailContent.tsx`: render `<DetailLayout backHref="/guilds" backLabel={t('backToGuilds')} title={guild.name} left={…} right={…} footer={…} />`.
- `EventDetailContent.tsx`: same, passing `rightClassName={canReadComments ? styles.columnRightTabs : undefined}`.
- Remove the migrated rules from `GuildDetailContent.module.css` and
  `EventDetailContent.module.css`; keep only content-specific rules
  (`infoGroup`, `label`, `value`, `description`, `empty`, `statusBadge*`,
  `signInText`, `memberCount`, `infoGroupGrow`, `typeHero*`, `dateTime`,
  `participantList*`, `requestsGroup`, `requestSentBadge*`, `actionButton`,
  `addSelfButton`, `columnRightTabs`, `skeleton`, `pulse`).

## Loading / error states

Both features have early-return states (loading skeleton, error/empty) that today
wrap content in `styles.container`. Decision: each feature keeps a small local
`.stateContainer` rule in its own CSS module — the same fixed positioning as the
frame's container — used only by these early returns. The back link/title are not
meaningfully available then, so reusing `DetailLayout` is not worthwhile; the
~6 lines of positioning are isolated and acceptable. `skeleton`/`pulse` stay in
the features and render inside `.stateContainer`. Current look must be preserved.

## Testing

- New `DetailLayout.test.tsx`:
  - renders the title text
  - renders the back link with the given `href` and label
  - renders `left` and `right` slot content
  - does not render a footer when `footer` is omitted; renders it when provided
- Existing guild-detail / event-detail tests must remain green.
- `pnpm build`, `pnpm lint`, `pnpm lint:fsd` pass.
```
