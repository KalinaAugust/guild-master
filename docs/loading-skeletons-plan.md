# Spec: Loading skeletons & Suspense across the app

Status: **planned** (next up). Scope: profile redesign follow-up.

## 1. Goal

Replace blank/spinner loading gaps with **layout-shaped skeletons** so every
screen shows its structure immediately and swaps in real data without jank.
Two delivery mechanisms, chosen per data source:

- **Server data (SSR `await`)** → route-level `loading.tsx` (App Router
  streaming): the shell + skeleton stream first, content hydrates when the
  server fetch resolves.
- **Client data (RTK Query)** → component-level skeletons gated on
  `isLoading`. `loading.tsx` cannot cover these — the data loads after
  hydration.

Most screens have **both layers**: the page server-fetches auth + seed data
(loading.tsx), then a client widget fetches the rest via RTK Query (component
skeleton). They are complementary, not redundant.

### Core Web Vitals note

Improves **FCP** and **perceived LCP** (shell ships before data). **Not** a
TTFB lever (TTFB = server-response start, unaffected by data streaming). Skeleton
boxes must match real element sizes to avoid **CLS**.

## 2. Building blocks

- Primitive exists: `src/shared/ui/Skeleton` — shimmer block, `circle` prop,
  honours `prefers-reduced-motion`. Reuse everywhere.
- Promote a shape to a shared component only when reused across ≥2 slices.
  Candidates: `EventCardSkeleton` (day view + upcoming + calendar popovers),
  `ListRowSkeleton` (members, guild list, comments).
- a11y: wrap skeleton groups in a container with `aria-busy="true"`; individual
  blocks are `aria-hidden`.

## 3. Audit — every data surface

Legend — Layer: **S** = server `loading.tsx`, **C** = client `isLoading`.

| Surface | Layer | Data | Current state | Action |
|---|---|---|---|---|
| `app/profile/[publicId]/page` | S | profile + common guilds (9 awaits), fully server-rendered | no loading.tsx | **loading.tsx** — sidebar + ProfileBlock skeletons |
| `app/events/[id]/page` | S | auth + access check | no loading.tsx | loading.tsx — event shell |
| `app/guilds/[id]/page` | S | auth + guild + membership | no loading.tsx | loading.tsx — guild header shell |
| `app/day/[date]/page` | S | auth + active guild | no loading.tsx | loading.tsx — day header + list shell |
| `app/guilds/page` | S | auth | no loading.tsx | loading.tsx — list shell (low) |
| `app/guild-chat/page` | S | auth + guilds + seed events | no loading.tsx | loading.tsx — header + composer shell |
| `app/(home) page` | S | auth + guilds + seed events | no loading.tsx | loading.tsx — calendar shell (low) |
| `app/profile/page` | — | redirect only | n/a | none |
| `widgets/guild-chat` | C | messages + polls | **done** (`MessagesSkeleton`/`PollsSkeleton`) | ✅ |
| `widgets/calendar` (`CalendarGrid`) | C | events | **no loading state** | skeleton month grid (cells shimmer) |
| `widgets/upcoming-events` (`UpcomingEventsStrip`, `NextEventBlock`) | C | upcoming events | **no loading state** | strip of `EventCardSkeleton` |
| `widgets/sidebar` | C | guild/nav data | **no loading state** | skeleton nav rows |
| `widgets/guild-members` (`GuildMembersSection`) | C | members (isLoading used, nothing rendered) | no visible skeleton | `ListRowSkeleton` × N (avatar + name) |
| `widgets/day-events` (`DayEventsList`) | C | events | **Spinner** | replace with `EventCardSkeleton` rows |
| `features/event-detail` (`EventDetailContent`) | C | event + participants (10 isLoading) | no visible skeleton | detail header + participant rows skeleton |
| `features/event-detail` (`CommentsTab`) | C | comments | isLoading, no skeleton | comment row skeletons |
| `features/guild-detail` (`GuildDetailContent`) | C | guild detail | isLoading, no skeleton | guild header + sections skeleton |
| `features/manage-guilds` (`GuildManagePage`) | C | guilds | **Spinner** | replace with guild `ListRowSkeleton` |
| `features/event-detail` (`EventTabs`) | C | tab content | n/a (UI state) | none |
| `features/create-event` (`EventWizard`) | C | `isLoading` = submit mutation | n/a | none (mutation, not load) |
| `features/notification-panel` (`NotificationBell`) | C | unread count badge | none | none (badge, no layout to hold) |

## 4. Skeleton designs (per target)

- **profile/[publicId] loading.tsx** — two-column: sidebar (avatar circle, name
  line, alias line, button block, social-icon row) + content column of N
  `ProfileBlock`-shaped panels (icon tile + title line + body lines). Mirror
  `OwnProfile`/public layout exactly for zero CLS.
- **EventCardSkeleton** (shared) — match `EventCard`: icon tile + title line +
  desc line + right-side meta (time + participants). Used by day-events,
  upcoming strip, calendar popovers.
- **ListRowSkeleton** (shared) — avatar circle + name line (+ optional trailing
  pill). Used by guild members, manage-guilds list.
- **CalendarGrid skeleton** — 7×N grid of shimmer day cells; weekday header row
  static. Keep exact cell dimensions.
- **EventDetailContent skeleton** — header (title + meta), tab bar, body block;
  participant list = `ListRowSkeleton` × 4.
- **CommentsTab skeleton** — `ListRowSkeleton` × 3 with a 2-line body each.
- **GuildDetailContent skeleton** — guild avatar + name + description lines +
  member section (`ListRowSkeleton` × N).

## 5. Phasing

1. **P1 (highest value):** `profile/[publicId]/loading.tsx`; convert existing
   Spinners → skeletons (`DayEventsList`, `GuildManagePage`); shared
   `EventCardSkeleton` + `ListRowSkeleton`.
2. **P2:** client widgets with no loading state — `CalendarGrid`,
   `UpcomingEventsStrip`, `GuildMembersSection`, `EventDetailContent`,
   `GuildDetailContent`, `CommentsTab`.
3. **P3:** remaining `loading.tsx` shells (events, guilds/[id], day, guilds,
   guild-chat, home); `Sidebar`.

## 6. Conventions

- Skeleton outer size ≈ real element (avoid CLS); verify by toggling network
  throttle.
- Co-locate route skeletons as `loading.tsx` + local `*.module.css`; shared
  shapes live in `src/shared/ui` (Skeleton-based) — domain-agnostic only.
- No business logic / no data hooks in `loading.tsx`; pure presentational.
- Reuse `Skeleton`; do not hand-roll shimmer per component.
- Keep mutation `isLoading` (submit buttons) on `Button isLoading` — out of
  scope here.

## 7. Acceptance criteria

- Every surface in §3 marked "Action" renders a layout-matched skeleton during
  load; no raw Spinner remains on data-list screens.
- No visible CLS when skeleton → content swaps (manual throttled check).
- `prefers-reduced-motion` disables shimmer (inherited from `Skeleton`).
- Existing widget tests still pass; add render tests asserting skeleton appears
  when the relevant query returns `isLoading: true`.

## 8. Non-goals / open questions

- Granular nested `<Suspense>` inside server pages — start route-level; add
  inner boundaries later only where a page has independent slow/fast sections.
- Skeleton timing/min-display (avoid flash on fast loads) — decide whether to
  add a small delay; default: none.
- Whether to skeletonise `Sidebar`/home calendar (low traffic-visible benefit).
