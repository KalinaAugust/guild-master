# Move Polls to Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relocate the guild polls panel (right-hand column) from the `/guild-chat` page to the `/announcements` page, leaving the chat single-column.

**Architecture:** Both `GuildChat` and `GuildAnnouncements` are `widgets`-layer composition components. Polls come from `features/guild-poll` (`PollCard`, `PollWizard`) and `entities/poll` (`useGetGuildPollsQuery`) — both strictly below `widgets`, so either widget may import them. The polls loading skeleton is widget-private, so it is duplicated into the announcements widget rather than imported across widgets (FSD forbids widget→widget imports). The announcements layout is restructured to mirror the chat's split header + two-column body.

**Tech Stack:** Next.js 16 (App Router), React 19, Redux Toolkit + RTK Query, CSS Modules, next-intl, Vitest + Testing Library.

## Global Constraints

- FSD layer rules: import only downward (`widgets → features → entities → shared`); no same-layer cross-imports; import slices only through their `index.ts` barrel.
- i18n: all user-facing strings via `next-intl`. The `GuildPoll` namespace (`newPoll`, `emptyPolls`) is already registered in `requiredNamespaces` (`src/app/layout.tsx:50`) — no new keys needed.
- Styling: CSS Modules only; no inline styles. `backdrop-filter` keeps both `-webkit-` and standard prefixes; drop prefixes for `transform`/`transition`/`border-radius`/etc.
- Poll creation is open to **any** guild member (the "New poll" button is always visible, independent of the announcements `canCreate` ADMIN/OWNER gate).
- Known baseline failures to ignore when verifying: `tsc` (3 errors) and `lint:fsd` (2 insignificant-slice) on master.

---

### Task 1: Add the polls panel to the announcements widget

**Files:**
- Modify: `src/widgets/guild-announcements/ui/GuildAnnouncements.tsx`
- Modify: `src/widgets/guild-announcements/ui/AnnouncementsSkeleton.tsx`
- Modify: `src/widgets/guild-announcements/ui/GuildAnnouncements.module.css`
- Modify: `src/app/announcements/AnnouncementsPage.module.css`
- Test: `src/widgets/guild-announcements/ui/GuildAnnouncements.test.tsx` (create)

**Interfaces:**
- Consumes from `@/features/guild-poll`: `PollCard` (props `{ poll: Poll; guildId: string }`), `PollWizard` (props `{ open: boolean; onClose: () => void; guildId: string }`).
- Consumes from `@/entities/poll`: `useGetGuildPollsQuery(guildId: string, opts)` → `{ data?: Poll[]; isLoading: boolean }`.
- Produces: a local `PollsSkeleton` React component exported from `./AnnouncementsSkeleton` (no props).

- [ ] **Step 1: Write the failing test**

Create `src/widgets/guild-announcements/ui/GuildAnnouncements.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildAnnouncements } from './GuildAnnouncements';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/features/select-guild', () => ({
  useGuildSelection: () => ({ activeGuildId: 'g1', guildOptions: [], handleGuildChange: vi.fn() }),
  GuildSelect: () => <div data-testid="guild-select" />,
}));

vi.mock('@/entities/announcement', () => ({
  useGetGuildAnnouncementsQuery: () => ({ data: { announcements: [], canCreate: true }, isLoading: false }),
  useMarkAnnouncementsReadMutation: () => [vi.fn()],
}));

vi.mock('@/features/guild-announcement', () => ({
  AnnouncementCard: () => <div data-testid="announcement-card" />,
  AnnouncementModal: () => <div data-testid="announcement-modal" />,
}));

vi.mock('@/entities/poll', () => ({
  useGetGuildPollsQuery: () => ({ data: [{ id: 'p1' }], isLoading: false }),
}));

vi.mock('@/features/guild-poll', () => ({
  PollCard: () => <div data-testid="poll-card" />,
  PollWizard: () => <div data-testid="poll-wizard" />,
}));

const guilds = [{ id: 'g1', name: 'Test', avatarUrl: null }] as never;

beforeEach(() => vi.clearAllMocks());

describe('GuildAnnouncements', () => {
  it('renders the New poll button and poll cards in the right column', () => {
    render(<GuildAnnouncements guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.getByText('newPoll')).toBeInTheDocument();
    expect(screen.getByTestId('poll-card')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/widgets/guild-announcements/ui/GuildAnnouncements.test.tsx`
Expected: FAIL — "newPoll" text not found (polls not yet rendered in the widget).

- [ ] **Step 3: Add `PollsSkeleton` to the announcements skeleton module**

Replace the contents of `src/widgets/guild-announcements/ui/AnnouncementsSkeleton.tsx` with:

```tsx
import React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import styles from './GuildAnnouncements.module.css';

/** Placeholder cards shown while the announcement feed is loading. */
export const AnnouncementsSkeleton: React.FC = () => (
  <div className={styles.skeletonList} aria-busy="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className={styles.skeletonCard}>
        <Skeleton className={styles.skTitle} />
        <Skeleton className={styles.skBody} />
        <Skeleton className={styles.skMeta} />
      </div>
    ))}
  </div>
);

const PollCardSkeleton: React.FC = () => (
  <div className={styles.pollCardSkeleton}>
    <Skeleton className={styles.pollTitle} />
    <Skeleton className={styles.pollOption} />
    <Skeleton className={styles.pollOption} />
    <Skeleton className={styles.pollOption} />
    <Skeleton className={styles.pollFooter} />
  </div>
);

/** Placeholder cards shown while guild polls are loading. */
export const PollsSkeleton: React.FC = () => (
  <div className={styles.pollsSkeleton} aria-busy="true">
    <PollCardSkeleton />
    <PollCardSkeleton />
  </div>
);
```

- [ ] **Step 4: Rewrite the announcements widget to add the polls column**

Replace the contents of `src/widgets/guild-announcements/ui/GuildAnnouncements.tsx` with:

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Panel } from '@/shared/ui/Panel';
import { Button } from '@/shared/ui/Button';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import { AnnouncementCard, AnnouncementModal } from '@/features/guild-announcement';
import { PollCard, PollWizard } from '@/features/guild-poll';
import { useGetGuildPollsQuery } from '@/entities/poll';
import {
  useGetGuildAnnouncementsQuery,
  useMarkAnnouncementsReadMutation,
  type Announcement,
  type AnnouncementComment,
} from '@/entities/announcement';
import type { Guild } from '@/entities/guild';
import { AnnouncementsSkeleton, PollsSkeleton } from './AnnouncementsSkeleton';
import styles from './GuildAnnouncements.module.css';

interface GuildAnnouncementsProps {
  guilds: Guild[];
  userId?: string;
  viewerProfile?: AnnouncementComment['profile'];
  initialGuildId?: string;
}

export const GuildAnnouncements: React.FC<GuildAnnouncementsProps> = ({
  guilds,
  userId,
  viewerProfile,
  initialGuildId,
}) => {
  const t = useTranslations('Announcements');
  const pollT = useTranslations('GuildPoll');
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds, initialGuildId, userId);

  const { data, isLoading } = useGetGuildAnnouncementsQuery(activeGuildId ?? '', { skip: !activeGuildId });
  const announcements = data?.announcements ?? [];
  const canCreate = data?.canCreate ?? false;

  const { data: polls = [], isLoading: isPollsLoading } = useGetGuildPollsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });

  // Opening the feed clears the sidebar unread dot for the active guild.
  const [markRead] = useMarkAnnouncementsReadMutation();
  useEffect(() => {
    if (activeGuildId) markRead(activeGuildId);
  }, [activeGuildId, markRead]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string; content: string } | null>(null);
  const [isPollWizardOpen, setIsPollWizardOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (a: Announcement) => {
    setEditing({ id: a.id, title: a.title, content: a.content });
    setModalOpen(true);
  };

  return (
    <Panel className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerFeed}>
          <div className={styles.guildSelect}>
            <GuildSelect value={activeGuildId ?? ''} onValueChange={handleGuildChange} options={guildOptions} />
          </div>
          {canCreate && (
            <Button type="button" variant="primary" className={styles.newButton} onClick={openCreate} icon={<Plus size={18} strokeWidth={3} />}>
              {t('newAnnouncement')}
            </Button>
          )}
        </div>
        <div className={styles.headerPolls}>
          <Button
            type="button"
            variant="primary"
            className={styles.newPollButton}
            onClick={() => setIsPollWizardOpen(true)}
            icon={<Plus size={18} strokeWidth={3} />}
          >
            {pollT('newPoll')}
          </Button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.feed}>
          {isLoading && <AnnouncementsSkeleton />}
          {!isLoading && announcements.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
          {!isLoading &&
            announcements.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                guildId={activeGuildId!}
                userId={userId}
                viewerProfile={viewerProfile}
                onEdit={openEdit}
              />
            ))}
        </div>

        <aside className={styles.polls}>
          {activeGuildId && isPollsLoading && <PollsSkeleton />}
          {activeGuildId && !isPollsLoading && polls.length === 0 && (
            <p className={styles.empty}>{pollT('emptyPolls')}</p>
          )}
          {activeGuildId &&
            !isPollsLoading &&
            polls.map((poll) => <PollCard key={poll.id} poll={poll} guildId={activeGuildId} />)}
        </aside>
      </div>

      {activeGuildId && (
        <AnnouncementModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          guildId={activeGuildId}
          editing={editing}
        />
      )}
      {activeGuildId && (
        <PollWizard
          open={isPollWizardOpen}
          onClose={() => setIsPollWizardOpen(false)}
          guildId={activeGuildId}
        />
      )}
    </Panel>
  );
};
```

- [ ] **Step 5: Rewrite the announcements widget CSS for the split header + two-column body**

Replace the contents of `src/widgets/guild-announcements/ui/GuildAnnouncements.module.css` with:

```css
.panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.header {
  display: flex;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 24px;
  margin-bottom: 24px;
}

.headerFeed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.headerPolls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 max(450px, 30%);
  padding-left: 24px;
  border-left: 1px solid var(--glass-border);
}

.guildSelect { min-width: 220px; }
.newButton { display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap; height: 45px; }
.newPollButton { height: 45px; gap: 8px; }

.body {
  display: flex;
  gap: 24px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.feed::-webkit-scrollbar { width: 6px; }
.feed::-webkit-scrollbar-track { background: transparent; }
.feed::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 3px; }
.feed::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.28); }

.polls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 0 0 max(450px, 30%);
  min-height: 0;
  overflow-y: auto;
  padding-left: 24px;
  border-left: 1px solid var(--glass-border);
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.polls::-webkit-scrollbar { width: 6px; }
.polls::-webkit-scrollbar-track { background: transparent; }
.polls::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 3px; }
.polls::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.28); }

.empty { color: var(--text-muted); text-align: center; padding: 2rem 0; }

.skeletonList { display: flex; flex-direction: column; gap: 1rem; }
.skeletonCard {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid var(--glass-border);
  border-radius: 16px;
}
.skTitle { width: 40%; height: 18px; }
.skBody { width: 100%; height: 48px; }
.skMeta { width: 30%; height: 16px; }

.pollsSkeleton { display: flex; flex-direction: column; gap: 16px; }
.pollCardSkeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 1.25rem;
  background: rgba(3, 13, 26, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.pollTitle { height: 18px; width: 70%; }
.pollOption { height: 38px; width: 100%; border-radius: 10px; }
.pollFooter { height: 14px; width: 40%; }

@media (max-width: 960px) {
  .headerFeed { flex: 1; }
  .headerPolls {
    flex: none;
    padding-left: 0;
    border-left: none;
  }
  .body { flex-direction: column; }
  .feed { flex: none; max-height: 60vh; }
  .polls {
    flex: none;
    width: 100%;
    height: auto;
    padding-left: 0;
    padding-top: 24px;
    border-left: none;
    border-top: 1px solid var(--glass-border);
  }
}
```

- [ ] **Step 6: Pin the announcements page to the viewport height on wide screens**

So the two-column layout fills the viewport like the chat page does. Replace the contents of `src/app/announcements/AnnouncementsPage.module.css` with:

```css
.main {
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 1rem;
}

/* On wide screens pin the page to the viewport height so the panel fills the
   space left after the header instead of leaving a large empty gap below. */
@media (min-width: 961px) {
  .main {
    box-sizing: border-box;
    height: calc(100dvh - var(--header-height));
    display: flex;
    flex-direction: column;
  }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm vitest run src/widgets/guild-announcements/ui/GuildAnnouncements.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/widgets/guild-announcements src/app/announcements/AnnouncementsPage.module.css
git commit -m "feat(announcements): add polls panel to the announcements page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Remove the polls panel from the chat widget

**Files:**
- Modify: `src/widgets/guild-chat/ui/GuildChat.tsx`
- Modify: `src/widgets/guild-chat/ui/ChatSkeletons.tsx`
- Modify: `src/widgets/guild-chat/ui/ChatSkeletons.module.css`
- Modify: `src/widgets/guild-chat/ui/GuildChat.module.css`
- Modify: `src/widgets/guild-chat/ui/GuildChat.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `GuildChat` no longer renders any poll UI; `ChatSkeletons` exports only `MessagesSkeleton`.

- [ ] **Step 1: Update the chat test to drop poll expectations and assert polls are gone**

Replace the contents of `src/widgets/guild-chat/ui/GuildChat.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildChat } from './GuildChat';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const mockAdd = vi.fn();
vi.mock('@/entities/guild-message', () => ({
  useGetGuildMessagesQuery: () => ({ data: [], isLoading: false }),
  useGetGuildChatReadStateQuery: () => ({ data: { lastReadAt: null } }),
  useAddGuildMessageMutation: () => [mockAdd, { isLoading: false }],
  useUpdateGuildMessageMutation: () => [vi.fn(), {}],
  useDeleteGuildMessageMutation: () => [vi.fn(), {}],
  useMarkGuildChatReadMutation: () => [vi.fn()],
}));

vi.mock('@/features/select-guild', () => ({
  useGuildSelection: () => ({ activeGuildId: 'g1', guildOptions: [], handleGuildChange: vi.fn() }),
  GuildSelect: () => <div data-testid="guild-select" />,
}));

const guilds = [{ id: 'g1', name: 'Test', avatarUrl: null }] as never;

beforeEach(() => vi.clearAllMocks());

describe('GuildChat', () => {
  it('renders the guild select and empty state', () => {
    render(<GuildChat guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.getByTestId('guild-select')).toBeInTheDocument();
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('renders the composer placeholder for a member', () => {
    render(<GuildChat guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.getByPlaceholderText('placeholder')).toBeInTheDocument();
  });

  it('does not render any poll UI', () => {
    render(<GuildChat guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.queryByText('newPoll')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/widgets/guild-chat/ui/GuildChat.test.tsx`
Expected: FAIL — the `@/entities/poll` / `@/features/guild-poll` mocks were removed but `GuildChat.tsx` still imports them, so the render throws (or the `newPoll` assertion fails because the button is still rendered).

- [ ] **Step 3: Remove poll wiring from the chat widget**

In `src/widgets/guild-chat/ui/GuildChat.tsx`:

Remove these imports:
```tsx
import { PollCard, PollWizard } from '@/features/guild-poll';
import { useGetGuildPollsQuery } from '@/entities/poll';
```

Change the skeleton import from:
```tsx
import { MessagesSkeleton, PollsSkeleton } from './ChatSkeletons';
```
to:
```tsx
import { MessagesSkeleton } from './ChatSkeletons';
```

Remove the `pollT` hook line:
```tsx
  const pollT = useTranslations('GuildPoll');
```

Remove the polls query:
```tsx
  const { data: polls = [], isLoading: isPollsLoading } = useGetGuildPollsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });
```

Remove the wizard state:
```tsx
  const [isPollWizardOpen, setIsPollWizardOpen] = useState(false);
```

Replace the whole header block:
```tsx
      <div className={styles.header}>
        <div className={styles.headerChat}>
          <div className={styles.guildSelect}>
            <GuildSelect value={activeGuildId} onValueChange={handleGuildSwitch} options={guildOptions} />
          </div>
        </div>
        <div className={styles.headerPolls}>
          <Button
            type="button"
            variant="primary"
            className={styles.newPollButton}
            onClick={() => setIsPollWizardOpen(true)}
            icon={<Plus size={18} strokeWidth={3} />}
          >
            {pollT('newPoll')}
          </Button>
        </div>
      </div>
```
with:
```tsx
      <div className={styles.header}>
        <div className={styles.guildSelect}>
          <GuildSelect value={activeGuildId} onValueChange={handleGuildSwitch} options={guildOptions} />
        </div>
      </div>
```

Remove the entire polls `aside` block:
```tsx
        <aside className={styles.polls}>
          {activeGuildId && isPollsLoading && <PollsSkeleton />}
          {activeGuildId && !isPollsLoading && polls.length === 0 && (
            <p className={styles.empty}>{pollT('emptyPolls')}</p>
          )}
          {activeGuildId &&
            !isPollsLoading &&
            polls.map((poll) => <PollCard key={poll.id} poll={poll} guildId={activeGuildId} />)}
        </aside>
```

Remove the wizard render at the end:
```tsx
      {activeGuildId && (
        <PollWizard
          open={isPollWizardOpen}
          onClose={() => setIsPollWizardOpen(false)}
          guildId={activeGuildId}
        />
      )}
```

Remove the now-unused `Button` and `Plus` imports if nothing else uses them (verify with a quick search — the chat composer uses `MessageComposer`, not `Button`, and `Plus` was only used by the New poll button):
```tsx
import { Plus } from 'lucide-react';
```
```tsx
import { Button } from '@/shared/ui/Button';
```

- [ ] **Step 4: Remove the poll skeletons from `ChatSkeletons.tsx`**

Replace the contents of `src/widgets/guild-chat/ui/ChatSkeletons.tsx` with:

```tsx
import React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import styles from './ChatSkeletons.module.css';

const MessageRowSkeleton: React.FC<{ own?: boolean }> = ({ own }) => (
  <div className={[styles.msgRow, own ? styles.own : ''].filter(Boolean).join(' ')}>
    {!own && <Skeleton circle className={styles.avatar} />}
    <div className={styles.bubble}>
      <Skeleton className={styles.line} />
      <Skeleton className={styles.lineShort} />
    </div>
  </div>
);

/** Placeholder rows shown while guild messages are loading. */
export const MessagesSkeleton: React.FC = () => (
  <div className={styles.messages} aria-busy="true">
    <MessageRowSkeleton />
    <MessageRowSkeleton own />
    <MessageRowSkeleton />
    <MessageRowSkeleton />
    <MessageRowSkeleton own />
  </div>
);
```

- [ ] **Step 5: Remove the poll skeleton CSS from `ChatSkeletons.module.css`**

Delete the `/* Polls */` section (the `.polls`, `.pollCard`, `.pollTitle`, `.pollOption`, `.pollFooter` rules) from `src/widgets/guild-chat/ui/ChatSkeletons.module.css`, leaving only the `/* Messages */` rules (`.messages` through `.lineShort`).

- [ ] **Step 6: Simplify the chat widget CSS to a single column**

In `src/widgets/guild-chat/ui/GuildChat.module.css`:

Replace the `.header` block and remove the `.headerChat`, `.headerPolls`, `.newPollButton` rules. Change:
```css
.header {
  display: flex;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 24px;
  margin-bottom: 24px;
}

.headerChat {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.headerPolls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 max(450px, 30%);
  padding-left: 24px;
  border-left: 1px solid var(--glass-border);
}

.newPollButton {
  height: 45px;
  gap: 8px;
}
```
to:
```css
.header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 24px;
  margin-bottom: 24px;
}
```

Remove the entire `.polls` block and its `::-webkit-scrollbar*` rules (the four rules after `.chat`).

In the `@media (max-width: 960px)` block, remove the `.headerChat`, `.headerPolls`, and `.polls` overrides, leaving only:
```css
@media (max-width: 960px) {
  .body { flex-direction: column; }
  .chat { height: auto; }
  .list { flex: none; max-height: 60vh; }
}
```

- [ ] **Step 7: Run the chat test to verify it passes**

Run: `pnpm vitest run src/widgets/guild-chat/ui/GuildChat.test.tsx`
Expected: PASS — all three tests green, including "does not render any poll UI".

- [ ] **Step 8: Commit**

```bash
git add src/widgets/guild-chat
git commit -m "refactor(guild-chat): remove polls panel (moved to announcements)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test:run`
Expected: PASS (no new failures beyond the known baseline).

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: clean (no errors introduced by the change).

- [ ] **Step 3: Run the FSD lint**

Run: `pnpm lint:fsd`
Expected: only the 2 known baseline `insignificant-slice` warnings — no new layer-violation errors.

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: only the 3 known baseline errors — none in the touched files.

---

## Self-Review

- **Spec coverage:**
  - Receiver widget (polls panel on announcements) → Task 1.
  - Source widget (remove polls from chat) → Task 2.
  - FSD-safe skeleton move (duplicate into announcements, drop from chat) → Task 1 Step 3 + Task 2 Steps 4–5.
  - CSS for both widgets → Task 1 Step 5 + Task 2 Step 6.
  - Poll permission unchanged (always-visible button) → Task 1 Step 4 (no `canCreate` gate on the poll button).
  - i18n: no new keys (`GuildPoll` already registered) → Global Constraints, verified at `layout.tsx:50`.
  - Tests updated → Task 1 Step 1, Task 2 Step 1.
  - Extra: announcements page viewport-height pin (not in spec but required for parity with chat) → Task 1 Step 6.
- **Placeholder scan:** no TBD/TODO; every code step shows complete code.
- **Type consistency:** `PollsSkeleton`, `useGetGuildPollsQuery`, `PollCard`, `PollWizard` signatures match the poll public APIs; `GuildAnnouncementsProps` unchanged.

## Open Questions

None.
