# Move Polls from Guild Chat to Announcements

**Date:** 2026-06-19
**Status:** Approved

## Goal

Relocate the guild polls panel (the right-hand column) from the `/guild-chat`
page to the `/announcements` page. The polls design and behavior stay
identical — only the host widget changes. After the move, the chat page becomes
a single-column message thread.

## Background

Polls currently live in the `GuildChat` widget
(`src/widgets/guild-chat/ui/GuildChat.tsx`): a two-column body where the left
column is the message thread + composer and the right column is an `aside` of
`PollCard`s. The header is split by a vertical divider — guild select on the
left, the "New poll" button on the right above the polls column. Poll creation
is open to **any** guild member.

The `GuildAnnouncements` widget
(`src/widgets/guild-announcements/ui/GuildAnnouncements.tsx`) is currently a
single-column feed. The "New announcement" button in its header is gated to
`ADMIN`/`OWNER` via `canCreate`.

Polls are backed by `features/guild-poll` (`PollCard`, `PollWizard`) and
`entities/poll` (`useGetGuildPollsQuery`). Both layers are strictly below
`widgets`, so either widget may import them — no FSD violation.

## Decisions

- **Poll creation permission:** unchanged — any guild member can create a poll.
  The "New poll" button is always visible, independent of the announcements
  `canCreate` (ADMIN/OWNER) gate.
- **Chat page:** polls are removed entirely. The chat becomes single-column.
- **Header layout on announcements:** mirror the chat — split header with a
  vertical divider. Left section: `GuildSelect` + "New announcement" (ADMIN/OWNER
  only). Right section (above the polls column): "New poll" (all members).

## Changes

### 1. `GuildAnnouncements` widget (receiver)

`src/widgets/guild-announcements/ui/GuildAnnouncements.tsx`:

- Add imports: `PollCard`, `PollWizard` from `@/features/guild-poll`;
  `useGetGuildPollsQuery` from `@/entities/poll`; `PollsSkeleton` from the local
  `./AnnouncementsSkeleton`.
- Add `useTranslations('GuildPoll')` for the poll-side copy (`newPoll`,
  `emptyPolls`).
- Add `useGetGuildPollsQuery(activeGuildId ?? '', { skip: !activeGuildId })`.
- Add `isPollWizardOpen` state.
- Restructure JSX to mirror the chat layout:
  - **Header** split into two sections with a vertical divider: feed side
    (`GuildSelect` + conditional "New announcement"), polls side ("New poll"
    button, always shown).
  - **Body** becomes a flex row: `.feed` (announcement list) on the left,
    `aside.polls` (poll cards) on the right. Polls loading shows `PollsSkeleton`;
    empty shows `GuildPoll.emptyPolls`.
  - Render `PollWizard` (guarded by `activeGuildId`) alongside the existing
    `AnnouncementModal`.

### 2. `GuildChat` widget (source)

`src/widgets/guild-chat/ui/GuildChat.tsx`:

- Remove poll imports (`PollCard`, `PollWizard`, `useGetGuildPollsQuery`,
  `PollsSkeleton`) and the `pollT` translations hook.
- Remove `isPollWizardOpen` state and the `polls` / `isPollsLoading` query.
- Remove the "New poll" header section, the `aside.polls` column, and the
  `PollWizard` render.
- Header collapses to a single section (guild select); body collapses to the
  single chat column.

### 3. Polls skeleton (FSD-safe move)

`PollsSkeleton` lives in `widgets/guild-chat/ui/ChatSkeletons.tsx`. A widget may
not import another widget's internals, so the announcements widget cannot reuse
it. Therefore:

- Move `PollsSkeleton` (and its helper `PollCardSkeleton`) plus the related CSS
  classes into the announcements widget — add them to
  `AnnouncementsSkeleton.tsx` and `GuildAnnouncements.module.css`.
- Remove `PollsSkeleton`, `PollCardSkeleton`, and the now-unused poll CSS from
  `ChatSkeletons.tsx` / `ChatSkeletons.module.css`.

### 4. CSS

- `GuildAnnouncements.module.css`: add the split header (divider + sections),
  the two-column `.body` / `.feed` / `.polls` layout, the polls scrollbar
  styling, and the `@media (max-width: 960px)` stacking — ported from the chat
  module.
- `GuildChat.module.css`: remove `.headerPolls`, `.polls` (+ scrollbar rules)
  and their responsive overrides; simplify `.header` / `.body` to a single
  column.

### 5. Out of scope / unchanged

- API routes (`/api/guilds/[id]/polls`), `entities/poll`, `features/guild-poll`,
  and the database schema — untouched.
- i18n: the `GuildPoll` namespace is already registered in
  `requiredNamespaces` (`src/app/layout.tsx:50`); no new keys are needed.

## Testing

- `GuildChat.test.tsx`: update/remove any assertions that expect polls or the
  "New poll" button in the chat widget.
- Add/extend coverage so the announcements widget renders poll cards and the
  "New poll" button (following the existing chat test patterns).
- `pnpm test:run`, `pnpm lint`, and `pnpm lint:fsd` must pass (modulo the known
  baseline failures).

## Open Questions

None.
