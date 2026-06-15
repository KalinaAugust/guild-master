# Guild Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `/announcements` page where guild admins post markdown wall-posts that every member can comment on and react to (👍 👎 ❤️ 🤔 💩), with pinning.

**Architecture:** Mirror the existing `guild-chat` page. New `entities/announcement` owns three Supabase tables (`announcements`, `announcement_comments`, `announcement_reactions`) plus RTK Query endpoints injected on `baseApi`; route handlers under `src/app/api/guilds/[id]/announcements/...` are the transport layer. UI lives in `features/guild-announcement` (card + wizard) composed by `widgets/guild-announcements`. Markdown renders through a new domain-agnostic `shared/ui/Markdown` using `marked` + the existing `dompurify`.

**Tech Stack:** Next.js 16 App Router, React 19, Redux Toolkit + RTK Query, Supabase (RLS), CSS Modules, next-intl, vitest + @testing-library/react, `marked`.

**Reference files (read before starting):**
- Spec: `docs/superpowers/specs/2026-06-15-guild-announcements-design.md`
- Entity/API pattern: `src/entities/poll/api/{pollApi,createPoll,getGuildPolls,mapPollRow}.ts`
- Routes pattern: `src/app/api/guilds/[id]/polls/route.ts` and `.../[pollId]/route.ts`
- Auth helpers: `src/shared/api/guildAuth.ts`, `src/shared/api/supabase/server.ts`
- UI patterns: `src/features/guild-poll/ui/{PollCard,PollWizard}.tsx`, `src/widgets/guild-chat/ui/GuildChat.tsx`, `src/app/guild-chat/page.tsx`
- Reuse: `shared/ui/{WizardDialog,MessageComposer,UserAvatar,ProfileLink,Button,Input,Switch,FormField,Tabs,ConfirmModal,Panel,Tooltip}`, `features/select-guild`, `widgets/upcoming-events`, `entities/user` (`resolveDisplayName`)

**Baseline note:** `master` already has 3 pre-existing `tsc` errors and 2 `lint:fsd` "insignificant-slice" warnings (documented). Ignore those when verifying — only new failures matter.

---

## File Structure

**Create:**
- `src/shared/ui/Markdown/{Markdown.tsx,Markdown.module.css,Markdown.test.tsx,index.ts}`
- `src/entities/announcement/model/{types.ts,reactions.ts,reactions.test.ts}`
- `src/entities/announcement/api/{mapAnnouncementRow.ts,mapAnnouncementRow.test.ts,getGuildAnnouncements.ts,createAnnouncement.ts,updateAnnouncement.ts,deleteAnnouncement.ts,setPinned.ts,getAnnouncementComments.ts,addAnnouncementComment.ts,deleteAnnouncementComment.ts,toggleReaction.ts,announcementApi.ts}`
- `src/entities/announcement/index.ts`
- `src/app/api/guilds/[id]/announcements/route.ts`
- `src/app/api/guilds/[id]/announcements/[announcementId]/route.ts`
- `src/app/api/guilds/[id]/announcements/[announcementId]/comments/route.ts`
- `src/app/api/guilds/[id]/announcements/[announcementId]/comments/[commentId]/route.ts`
- `src/app/api/guilds/[id]/announcements/[announcementId]/reactions/route.ts`
- `src/features/guild-announcement/ui/{AnnouncementWizard.tsx,AnnouncementWizard.module.css,ReactionBar.tsx,ReactionBar.module.css,AnnouncementComments.tsx,AnnouncementComments.module.css,AnnouncementCard.tsx,AnnouncementCard.module.css}`
- `src/features/guild-announcement/index.ts`
- `src/widgets/guild-announcements/ui/{GuildAnnouncements.tsx,GuildAnnouncements.module.css,AnnouncementsSkeleton.tsx}`
- `src/widgets/guild-announcements/index.ts`
- `src/app/announcements/{page.tsx,AnnouncementsPage.module.css}`

**Modify:**
- `src/shared/api/baseApi.ts` — add `'Announcement'` tag
- `src/widgets/sidebar/model/navItems.ts` — add nav item
- `messages/en.json`, `messages/ru.json` — add `Announcements` namespace + `Common.announcements`
- `src/shared/api/supabase/types.ts` — add the three new tables (regenerated)
- `package.json` — add `marked` dependency

---

## Task 1: Database migration + types

**Files:**
- Apply migration via Supabase MCP (`mcp__supabase__apply_migration`)
- Regenerate: `src/shared/api/supabase/types.ts`

Per project convention there is no Supabase CLI — DDL is applied through the Supabase MCP and types are regenerated through the MCP. Guild roles use `guild_members.role` values `'OWNER' | 'ADMIN' | 'MEMBER'`. RLS uses existing SECURITY DEFINER helpers `is_member_of(target_guild_id uuid)` and `has_guild_role(target_guild_id uuid, target_roles text[])`.

- [ ] **Step 1: Apply the migration**

Call `mcp__supabase__apply_migration` with name `create_announcements` and this SQL:

```sql
-- announcements: guild wall posts (admins/owner author)
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  content text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index announcements_guild_id_idx on public.announcements(guild_id);

create table public.announcement_comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index announcement_comments_announcement_id_idx on public.announcement_comments(announcement_id);

create table public.announcement_reactions (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  type text not null check (type in ('like','dislike','heart','doubt','poop')),
  created_at timestamptz not null default now(),
  unique (announcement_id, user_id, type)
);
create index announcement_reactions_announcement_id_idx on public.announcement_reactions(announcement_id);

-- RLS
alter table public.announcements enable row level security;
alter table public.announcement_comments enable row level security;
alter table public.announcement_reactions enable row level security;

-- announcements: members read; admins/owner write
create policy "announcements_select" on public.announcements
  for select using (public.is_member_of(guild_id));
create policy "announcements_insert" on public.announcements
  for insert with check (public.has_guild_role(guild_id, array['ADMIN','OWNER']));
create policy "announcements_update" on public.announcements
  for update using (public.has_guild_role(guild_id, array['ADMIN','OWNER']));
create policy "announcements_delete" on public.announcements
  for delete using (public.has_guild_role(guild_id, array['ADMIN','OWNER']));

-- comments: members read/insert (own), author or admin delete
create policy "announcement_comments_select" on public.announcement_comments
  for select using (
    public.is_member_of((select a.guild_id from public.announcements a where a.id = announcement_id))
  );
create policy "announcement_comments_insert" on public.announcement_comments
  for insert with check (
    user_id = auth.uid()
    and public.is_member_of((select a.guild_id from public.announcements a where a.id = announcement_id))
  );
create policy "announcement_comments_delete" on public.announcement_comments
  for delete using (
    user_id = auth.uid()
    or public.has_guild_role(
      (select a.guild_id from public.announcements a where a.id = announcement_id),
      array['ADMIN','OWNER']
    )
  );

-- reactions: members read; own rows insert/delete
create policy "announcement_reactions_select" on public.announcement_reactions
  for select using (
    public.is_member_of((select a.guild_id from public.announcements a where a.id = announcement_id))
  );
create policy "announcement_reactions_insert" on public.announcement_reactions
  for insert with check (
    user_id = auth.uid()
    and public.is_member_of((select a.guild_id from public.announcements a where a.id = announcement_id))
  );
create policy "announcement_reactions_delete" on public.announcement_reactions
  for delete using (user_id = auth.uid());
```

- [ ] **Step 2: Regenerate types**

Call `mcp__supabase__generate_typescript_types` and overwrite `src/shared/api/supabase/types.ts` with the result. Verify the file now contains `announcements:`, `announcement_comments:`, and `announcement_reactions:` table definitions.

- [ ] **Step 3: Verify advisors**

Call `mcp__supabase__get_advisors` with type `security`. Expected: no new "RLS disabled" or "policy" errors for the three new tables. If any appear, fix the migration before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat(announcements): add announcements DB schema and RLS"
```

---

## Task 2: Markdown shared component

**Files:**
- Create: `src/shared/ui/Markdown/Markdown.tsx`
- Create: `src/shared/ui/Markdown/Markdown.module.css`
- Create: `src/shared/ui/Markdown/Markdown.test.tsx`
- Create: `src/shared/ui/Markdown/index.ts`
- Modify: `package.json` (add `marked`)

- [ ] **Step 1: Install marked**

```bash
pnpm add marked
```

Expected: `marked` appears under `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing test**

```tsx
// src/shared/ui/Markdown/Markdown.test.tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders bold markdown as <strong>', () => {
    const { container } = render(<Markdown source="**hi**" />);
    expect(container.querySelector('strong')?.textContent).toBe('hi');
  });

  it('strips script tags (sanitization)', () => {
    const { container } = render(<Markdown source={'ok\n\n<script>alert(1)</script>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('ok');
  });

  it('renders links with the href preserved', () => {
    const { container } = render(<Markdown source="[x](https://example.com)" />);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test:run src/shared/ui/Markdown/Markdown.test.tsx`
Expected: FAIL — cannot find module `./Markdown`.

- [ ] **Step 4: Write the component**

```tsx
// src/shared/ui/Markdown/Markdown.tsx
'use client';

import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import styles from './Markdown.module.css';

interface MarkdownProps {
  source: string;
  className?: string;
}

/**
 * Renders markdown as sanitized HTML. Sanitization needs a DOM, so on the server
 * (SSR pass) we render nothing — announcement content is always fetched and shown
 * client-side, so there is no visible flash.
 */
export const Markdown: React.FC<MarkdownProps> = ({ source, className }) => {
  const html = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const raw = marked.parse(source ?? '', { async: false, breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
  }, [source]);

  return (
    <div
      className={[styles.markdown, className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
```

```css
/* src/shared/ui/Markdown/Markdown.module.css */
.markdown {
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.markdown > :first-child { margin-top: 0; }
.markdown > :last-child { margin-bottom: 0; }
.markdown p { margin: 0 0 0.6rem; }
.markdown h1, .markdown h2, .markdown h3 { margin: 0.8rem 0 0.4rem; line-height: 1.25; }
.markdown ul, .markdown ol { margin: 0 0 0.6rem; padding-left: 1.25rem; }
.markdown a { color: var(--color-accent); text-decoration: underline; }
.markdown code {
  background: rgba(255, 255, 255, 0.08);
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-size: 0.9em;
}
.markdown pre {
  background: rgba(0, 0, 0, 0.25);
  padding: 0.75rem;
  border-radius: 8px;
  overflow-x: auto;
}
.markdown blockquote {
  margin: 0 0 0.6rem;
  padding-left: 0.75rem;
  border-left: 3px solid var(--color-border);
  color: var(--color-text-muted);
}
```

```ts
// src/shared/ui/Markdown/index.ts
export { Markdown } from './Markdown';
```

Note: `var(--color-text)`, `--color-accent`, `--color-text-muted`, `--color-border` — confirm names against `src/app/globals.css`/`docs/design-system.md` and substitute the actual tokens used by the project before finalizing this CSS.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:run src/shared/ui/Markdown/Markdown.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/shared/ui/Markdown
git commit -m "feat(ui): add sanitized Markdown renderer"
```

---

## Task 3: Entity model types + reaction logic

**Files:**
- Create: `src/entities/announcement/model/types.ts`
- Create: `src/entities/announcement/model/reactions.ts`
- Create: `src/entities/announcement/model/reactions.test.ts`

- [ ] **Step 1: Write the types**

```ts
// src/entities/announcement/model/types.ts
export type ReactionType = 'like' | 'dislike' | 'heart' | 'doubt' | 'poop';

export const REACTION_TYPES: ReactionType[] = ['like', 'dislike', 'heart', 'doubt', 'poop'];

export interface ReactionSummary {
  type: ReactionType;
  count: number;
  /** Whether the current user has reacted with this type. */
  reacted: boolean;
}

export interface AnnouncementProfile {
  publicId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  alias: string | null;
  displayAsAlias: boolean;
  icon: string | null;
}

export interface AnnouncementComment {
  id: string;
  announcementId: string;
  userId: string;
  body: string;
  createdAt: string;
  /** Current user may delete this comment (author or guild admin/owner). */
  canDelete: boolean;
  profile: AnnouncementProfile;
}

export interface Announcement {
  id: string;
  guildId: string;
  createdBy: string | null;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: AnnouncementProfile;
  reactions: ReactionSummary[];
  commentCount: number;
  /** Current user may edit/pin/delete (author or guild admin/owner). */
  canManage: boolean;
}

/** List query result: the feed plus whether the viewer may create posts. */
export interface GuildAnnouncementsResult {
  announcements: Announcement[];
  canCreate: boolean;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  isPinned: boolean;
}

export interface UpdateAnnouncementInput {
  title: string;
  content: string;
}
```

- [ ] **Step 2: Write the failing reaction test**

```ts
// src/entities/announcement/model/reactions.test.ts
import { describe, it, expect } from 'vitest';
import { applyOptimisticReaction } from './reactions';
import type { Announcement } from './types';

const make = (): Announcement => ({
  id: 'a1', guildId: 'g1', createdBy: 'u1', title: 't', content: 'c',
  isPinned: false, createdAt: 'now', updatedAt: 'now',
  author: { publicId: null, fullName: null, avatarUrl: null, alias: null, displayAsAlias: false, icon: null },
  reactions: [
    { type: 'like', count: 2, reacted: false },
    { type: 'heart', count: 1, reacted: true },
  ],
  commentCount: 0, canManage: false,
});

describe('applyOptimisticReaction', () => {
  it('adds a reaction when not yet reacted', () => {
    const a = make();
    applyOptimisticReaction(a, 'like');
    expect(a.reactions.find((r) => r.type === 'like')).toMatchObject({ count: 3, reacted: true });
  });

  it('removes a reaction when already reacted', () => {
    const a = make();
    applyOptimisticReaction(a, 'heart');
    expect(a.reactions.find((r) => r.type === 'heart')).toMatchObject({ count: 0, reacted: false });
  });

  it('does nothing for an unknown type bucket', () => {
    const a = make();
    a.reactions = [{ type: 'like', count: 0, reacted: false }];
    applyOptimisticReaction(a, 'poop');
    expect(a.reactions).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test:run src/entities/announcement/model/reactions.test.ts`
Expected: FAIL — cannot find module `./reactions`.

- [ ] **Step 4: Write the implementation**

```ts
// src/entities/announcement/model/reactions.ts
import type { Announcement, ReactionType } from './types';

/** Toggles the current user's reaction of `type` in place (optimistic update). */
export const applyOptimisticReaction = (announcement: Announcement, type: ReactionType): void => {
  const bucket = announcement.reactions.find((r) => r.type === type);
  if (!bucket) return;
  if (bucket.reacted) {
    bucket.reacted = false;
    bucket.count = Math.max(0, bucket.count - 1);
  } else {
    bucket.reacted = true;
    bucket.count += 1;
  }
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:run src/entities/announcement/model/reactions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/entities/announcement/model
git commit -m "feat(announcements): add domain types and reaction toggle logic"
```

---

## Task 4: Row mappers

**Files:**
- Create: `src/entities/announcement/api/mapAnnouncementRow.ts`
- Create: `src/entities/announcement/api/mapAnnouncementRow.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/entities/announcement/api/mapAnnouncementRow.test.ts
import { describe, it, expect } from 'vitest';
import { buildAnnouncement, type AnnouncementRow } from './mapAnnouncementRow';

const row: AnnouncementRow = {
  id: 'a1', guild_id: 'g1', created_by: 'u1', title: 'Title', content: '**hi**',
  is_pinned: true, created_at: 't0', updated_at: 't1',
  profiles: { public_id: 'p1', full_name: 'Neo', avatar_url: null, alias: null, display_as_alias: false, icon: null },
  announcement_reactions: [
    { type: 'like', user_id: 'u2' },
    { type: 'like', user_id: 'me' },
    { type: 'heart', user_id: 'u2' },
  ],
  announcement_comments: [{ id: 'c1' }, { id: 'c2' }],
};

describe('buildAnnouncement', () => {
  it('maps fields, aggregates reactions and marks the viewer reaction', () => {
    const a = buildAnnouncement(row, 'me', true);
    expect(a).toMatchObject({ id: 'a1', title: 'Title', isPinned: true, commentCount: 2, canManage: true });
    expect(a.author.fullName).toBe('Neo');
    expect(a.reactions.find((r) => r.type === 'like')).toMatchObject({ count: 2, reacted: true });
    expect(a.reactions.find((r) => r.type === 'heart')).toMatchObject({ count: 1, reacted: false });
    expect(a.reactions.find((r) => r.type === 'poop')).toMatchObject({ count: 0, reacted: false });
    expect(a.reactions).toHaveLength(5);
  });

  it('marks no reaction for anonymous viewer', () => {
    const a = buildAnnouncement(row, null, false);
    expect(a.reactions.every((r) => !r.reacted)).toBe(true);
    expect(a.canManage).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/entities/announcement/api/mapAnnouncementRow.test.ts`
Expected: FAIL — cannot find module `./mapAnnouncementRow`.

- [ ] **Step 3: Write the mappers**

```ts
// src/entities/announcement/api/mapAnnouncementRow.ts
import type {
  Announcement,
  AnnouncementComment,
  AnnouncementProfile,
  ReactionSummary,
} from '../model/types';
import { REACTION_TYPES } from '../model/types';

const PROFILE_FIELDS = 'public_id, full_name, avatar_url, alias, display_as_alias, icon';

export const ANNOUNCEMENT_SELECT =
  `id, guild_id, created_by, title, content, is_pinned, created_at, updated_at, ` +
  `profiles(${PROFILE_FIELDS}), ` +
  `announcement_reactions(type, user_id), ` +
  `announcement_comments(id)`;

export const COMMENT_SELECT =
  `id, announcement_id, user_id, body, created_at, profiles(${PROFILE_FIELDS})`;

interface ProfileRow {
  public_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  alias: string | null;
  display_as_alias: boolean | null;
  icon: string | null;
}

export interface AnnouncementRow {
  id: string;
  guild_id: string;
  created_by: string | null;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  profiles: ProfileRow | null;
  announcement_reactions: { type: string; user_id: string }[] | null;
  announcement_comments: { id: string }[] | null;
}

export interface AnnouncementCommentRow {
  id: string;
  announcement_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: ProfileRow | null;
}

const mapProfile = (p: ProfileRow | null): AnnouncementProfile => ({
  publicId: p?.public_id ?? null,
  fullName: p?.full_name ?? null,
  avatarUrl: p?.avatar_url ?? null,
  alias: p?.alias ?? null,
  displayAsAlias: p?.display_as_alias ?? false,
  icon: p?.icon ?? null,
});

const buildReactions = (
  rows: { type: string; user_id: string }[],
  currentUserId: string | null,
): ReactionSummary[] =>
  REACTION_TYPES.map((type) => {
    const ofType = rows.filter((r) => r.type === type);
    return {
      type,
      count: ofType.length,
      reacted: !!currentUserId && ofType.some((r) => r.user_id === currentUserId),
    };
  });

export const buildAnnouncement = (
  row: AnnouncementRow,
  currentUserId: string | null,
  canManage: boolean,
): Announcement => ({
  id: row.id,
  guildId: row.guild_id,
  createdBy: row.created_by,
  title: row.title,
  content: row.content,
  isPinned: row.is_pinned,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: mapProfile(row.profiles),
  reactions: buildReactions(row.announcement_reactions ?? [], currentUserId),
  commentCount: (row.announcement_comments ?? []).length,
  canManage,
});

export const mapCommentRow = (row: AnnouncementCommentRow, canDelete: boolean): AnnouncementComment => ({
  id: row.id,
  announcementId: row.announcement_id,
  userId: row.user_id,
  body: row.body,
  createdAt: row.created_at,
  canDelete,
  profile: mapProfile(row.profiles),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/entities/announcement/api/mapAnnouncementRow.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/entities/announcement/api/mapAnnouncementRow.ts src/entities/announcement/api/mapAnnouncementRow.test.ts
git commit -m "feat(announcements): add row mappers"
```

---

## Task 5: Read transport (list + comments)

**Files:**
- Create: `src/entities/announcement/api/getGuildAnnouncements.ts`
- Create: `src/entities/announcement/api/getAnnouncementComments.ts`

These mirror `getGuildPolls.ts` (caller/role resolution). No unit tests — they are thin Supabase wrappers exercised via the routes; logic-bearing parts are covered by the mapper tests.

- [ ] **Step 1: Write the list reader**

```ts
// src/entities/announcement/api/getGuildAnnouncements.ts
import { createClient } from '@/shared/api/supabase/server';
import type { GuildAnnouncementsResult } from '../model/types';
import { ANNOUNCEMENT_SELECT, buildAnnouncement, type AnnouncementRow } from './mapAnnouncementRow';

const MANAGER_ROLES = ['ADMIN', 'OWNER'];

export const resolveCaller = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  guildId: string,
): Promise<{ userId: string | null; role: string | null }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null };
  const { data: membership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();
  return { userId: user.id, role: membership?.role ?? null };
};

export const isManager = (role: string | null): boolean => MANAGER_ROLES.includes(role ?? '');

const canManage = (createdBy: string | null, userId: string | null, role: string | null): boolean =>
  (!!userId && createdBy === userId) || isManager(role);

export const getGuildAnnouncements = async (guildId: string): Promise<GuildAnnouncementsResult> => {
  const supabase = await createClient();
  const { userId, role } = await resolveCaller(supabase, guildId);

  const { data, error } = await supabase
    .from('announcements')
    .select(ANNOUNCEMENT_SELECT)
    .eq('guild_id', guildId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;

  const announcements = ((data ?? []) as unknown as AnnouncementRow[]).map((row) =>
    buildAnnouncement(row, userId, canManage(row.created_by, userId, role)),
  );
  return { announcements, canCreate: isManager(role) };
};

/** Re-reads a single announcement (used after mutations) and maps it for the caller. */
export const getAnnouncementById = async (announcementId: string): Promise<import('../model/types').Announcement> => {
  const supabase = await createClient();
  const { data: head, error: headError } = await supabase
    .from('announcements')
    .select('guild_id')
    .eq('id', announcementId)
    .single();
  if (headError) throw headError;

  const { userId, role } = await resolveCaller(supabase, head.guild_id);
  const { data, error } = await supabase
    .from('announcements')
    .select(ANNOUNCEMENT_SELECT)
    .eq('id', announcementId)
    .single();
  if (error) throw error;

  const row = data as unknown as AnnouncementRow;
  return buildAnnouncement(row, userId, canManage(row.created_by, userId, role));
};
```

- [ ] **Step 2: Write the comments reader**

```ts
// src/entities/announcement/api/getAnnouncementComments.ts
import { createClient } from '@/shared/api/supabase/server';
import type { AnnouncementComment } from '../model/types';
import { COMMENT_SELECT, mapCommentRow, type AnnouncementCommentRow } from './mapAnnouncementRow';
import { resolveCaller, isManager } from './getGuildAnnouncements';

export const getAnnouncementComments = async (
  announcementId: string,
): Promise<AnnouncementComment[]> => {
  const supabase = await createClient();

  const { data: head, error: headError } = await supabase
    .from('announcements')
    .select('guild_id')
    .eq('id', announcementId)
    .single();
  if (headError) throw headError;

  const { userId, role } = await resolveCaller(supabase, head.guild_id);

  const { data, error } = await supabase
    .from('announcement_comments')
    .select(COMMENT_SELECT)
    .eq('announcement_id', announcementId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as AnnouncementCommentRow[]).map((row) =>
    mapCommentRow(row, (!!userId && row.user_id === userId) || isManager(role)),
  );
};
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors in `src/entities/announcement/**` (baseline has 3 unrelated errors).

- [ ] **Step 4: Commit**

```bash
git add src/entities/announcement/api/getGuildAnnouncements.ts src/entities/announcement/api/getAnnouncementComments.ts
git commit -m "feat(announcements): add list and comments read transport"
```

---

## Task 6: Write transport (mutations)

**Files:**
- Create: `src/entities/announcement/api/createAnnouncement.ts`
- Create: `src/entities/announcement/api/updateAnnouncement.ts`
- Create: `src/entities/announcement/api/setPinned.ts`
- Create: `src/entities/announcement/api/deleteAnnouncement.ts`
- Create: `src/entities/announcement/api/addAnnouncementComment.ts`
- Create: `src/entities/announcement/api/deleteAnnouncementComment.ts`
- Create: `src/entities/announcement/api/toggleReaction.ts`

- [ ] **Step 1: createAnnouncement**

```ts
// src/entities/announcement/api/createAnnouncement.ts
import { createClient } from '@/shared/api/supabase/server';
import type { Announcement, CreateAnnouncementInput } from '../model/types';
import { getAnnouncementById } from './getGuildAnnouncements';

const MAX_TITLE = 200;
const MAX_CONTENT = 10_000;

/** Thrown when announcement input is invalid (empty/too-long title or content). */
export class InvalidAnnouncementError extends Error {}

export const createAnnouncement = async (
  guildId: string,
  input: CreateAnnouncementInput,
): Promise<Announcement> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const title = input.title.trim();
  if (!title) throw new InvalidAnnouncementError('Title is empty');
  if (title.length > MAX_TITLE) throw new InvalidAnnouncementError('Title is too long');

  const content = input.content.trim();
  if (!content) throw new InvalidAnnouncementError('Content is empty');
  if (content.length > MAX_CONTENT) throw new InvalidAnnouncementError('Content is too long');

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      guild_id: guildId,
      created_by: user.id,
      title,
      content,
      is_pinned: input.isPinned,
    })
    .select('id')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Failed to create announcement');

  return getAnnouncementById(data.id);
};
```

- [ ] **Step 2: updateAnnouncement + setPinned + deleteAnnouncement**

```ts
// src/entities/announcement/api/updateAnnouncement.ts
import { createClient } from '@/shared/api/supabase/server';
import type { Announcement, UpdateAnnouncementInput } from '../model/types';
import { getAnnouncementById } from './getGuildAnnouncements';
import { InvalidAnnouncementError } from './createAnnouncement';

const MAX_TITLE = 200;
const MAX_CONTENT = 10_000;

export const updateAnnouncement = async (
  announcementId: string,
  input: UpdateAnnouncementInput,
): Promise<Announcement> => {
  const supabase = await createClient();

  const title = input.title.trim();
  if (!title) throw new InvalidAnnouncementError('Title is empty');
  if (title.length > MAX_TITLE) throw new InvalidAnnouncementError('Title is too long');

  const content = input.content.trim();
  if (!content) throw new InvalidAnnouncementError('Content is empty');
  if (content.length > MAX_CONTENT) throw new InvalidAnnouncementError('Content is too long');

  const { error } = await supabase
    .from('announcements')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', announcementId);
  if (error) throw error;

  return getAnnouncementById(announcementId);
};
```

```ts
// src/entities/announcement/api/setPinned.ts
import { createClient } from '@/shared/api/supabase/server';
import type { Announcement } from '../model/types';
import { getAnnouncementById } from './getGuildAnnouncements';

export const setPinned = async (announcementId: string, isPinned: boolean): Promise<Announcement> => {
  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .update({ is_pinned: isPinned })
    .eq('id', announcementId);
  if (error) throw error;
  return getAnnouncementById(announcementId);
};
```

```ts
// src/entities/announcement/api/deleteAnnouncement.ts
import { createClient } from '@/shared/api/supabase/server';

export const deleteAnnouncement = async (announcementId: string): Promise<{ deleted: boolean }> => {
  const supabase = await createClient();
  const { error } = await supabase.from('announcements').delete().eq('id', announcementId);
  if (error) throw error;
  return { deleted: true };
};
```

- [ ] **Step 3: comment mutations**

```ts
// src/entities/announcement/api/addAnnouncementComment.ts
import { createClient } from '@/shared/api/supabase/server';
import type { AnnouncementComment } from '../model/types';
import { COMMENT_SELECT, mapCommentRow, type AnnouncementCommentRow } from './mapAnnouncementRow';
import { InvalidAnnouncementError } from './createAnnouncement';

const MAX_COMMENT = 2000;

export const addAnnouncementComment = async (
  announcementId: string,
  body: string,
): Promise<AnnouncementComment> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidAnnouncementError('Comment is empty');
  if (trimmed.length > MAX_COMMENT) throw new InvalidAnnouncementError('Comment is too long');

  const { data, error } = await supabase
    .from('announcement_comments')
    .insert({ announcement_id: announcementId, user_id: user.id, body: trimmed })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  if (!data) throw new Error('Failed to create comment');

  // The author can always delete their own comment.
  return mapCommentRow(data as unknown as AnnouncementCommentRow, true);
};
```

```ts
// src/entities/announcement/api/deleteAnnouncementComment.ts
import { createClient } from '@/shared/api/supabase/server';

export const deleteAnnouncementComment = async (commentId: string): Promise<{ deleted: boolean }> => {
  const supabase = await createClient();
  const { error } = await supabase.from('announcement_comments').delete().eq('id', commentId);
  if (error) throw error;
  return { deleted: true };
};
```

- [ ] **Step 4: toggleReaction**

```ts
// src/entities/announcement/api/toggleReaction.ts
import { createClient } from '@/shared/api/supabase/server';
import type { Announcement, ReactionType } from '../model/types';
import { REACTION_TYPES } from '../model/types';
import { getAnnouncementById } from './getGuildAnnouncements';
import { InvalidAnnouncementError } from './createAnnouncement';

export const toggleReaction = async (
  announcementId: string,
  type: ReactionType,
): Promise<Announcement> => {
  if (!REACTION_TYPES.includes(type)) throw new InvalidAnnouncementError('Invalid reaction type');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Toggle: delete the existing (user, type) row, or insert it if absent.
  const { data: existing, error: selError } = await supabase
    .from('announcement_reactions')
    .select('id')
    .eq('announcement_id', announcementId)
    .eq('user_id', user.id)
    .eq('type', type)
    .maybeSingle();
  if (selError) throw selError;

  if (existing) {
    const { error } = await supabase.from('announcement_reactions').delete().eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('announcement_reactions')
      .insert({ announcement_id: announcementId, user_id: user.id, type });
    if (error) throw error;
  }

  return getAnnouncementById(announcementId);
};
```

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors in `src/entities/announcement/**`.

- [ ] **Step 6: Commit**

```bash
git add src/entities/announcement/api
git commit -m "feat(announcements): add write transport (CRUD, comments, reactions)"
```

---

## Task 7: RTK Query API + entity barrel

**Files:**
- Modify: `src/shared/api/baseApi.ts`
- Create: `src/entities/announcement/api/announcementApi.ts`
- Create: `src/entities/announcement/index.ts`

- [ ] **Step 1: Register the tag**

In `src/shared/api/baseApi.ts`, add `'Announcement'` and `'AnnouncementComment'` to `tagTypes`:

```ts
  tagTypes: ['Event', 'Participant', 'GuildMember', 'Guild', 'Notification', 'JoinRequest', 'EventJoinRequest', 'Comment', 'CommentRead', 'GuildMessage', 'GuildChatRead', 'Poll', 'Announcement', 'AnnouncementComment'],
```

- [ ] **Step 2: Write the API slice**

```ts
// src/entities/announcement/api/announcementApi.ts
import { baseApi } from '@/shared/api/baseApi';
import type {
  Announcement,
  AnnouncementComment,
  CreateAnnouncementInput,
  GuildAnnouncementsResult,
  ReactionType,
  UpdateAnnouncementInput,
} from '../model/types';
import { applyOptimisticReaction } from '../model/reactions';

const listTag = (guildId: string) => [{ type: 'Announcement' as const, id: `LIST-${guildId}` }];
const commentsTag = (announcementId: string) => [
  { type: 'AnnouncementComment' as const, id: `LIST-${announcementId}` },
];

/** Replaces a single announcement in the cached guild list with `updated`. */
const replaceInList = (guildId: string, updated: Announcement) =>
  announcementApi.util.updateQueryData('getGuildAnnouncements', guildId, (draft) => {
    const idx = draft.announcements.findIndex((a) => a.id === updated.id);
    if (idx !== -1) draft.announcements[idx] = updated;
  });

export const announcementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGuildAnnouncements: builder.query<GuildAnnouncementsResult, string>({
      query: (guildId) => `guilds/${guildId}/announcements`,
      providesTags: (_, __, guildId) => listTag(guildId),
    }),

    createAnnouncement: builder.mutation<Announcement, { guildId: string; input: CreateAnnouncementInput }>({
      query: ({ guildId, input }) => ({
        url: `guilds/${guildId}/announcements`,
        method: 'POST',
        body: input,
      }),
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),

    updateAnnouncement: builder.mutation<
      Announcement,
      { guildId: string; announcementId: string; input: UpdateAnnouncementInput }
    >({
      query: ({ guildId, announcementId, input }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}`,
        method: 'PATCH',
        body: input,
      }),
      async onQueryStarted({ guildId }, { dispatch, queryFulfilled }) {
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(replaceInList(guildId, updated));
        } catch {
          /* surfaced via toast in the card */
        }
      },
    }),

    setAnnouncementPinned: builder.mutation<
      Announcement,
      { guildId: string; announcementId: string; isPinned: boolean }
    >({
      query: ({ guildId, announcementId, isPinned }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}`,
        method: 'PATCH',
        body: { isPinned },
      }),
      // Re-pinning changes ordering, so invalidate to refetch the sorted list.
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),

    deleteAnnouncement: builder.mutation<{ deleted: boolean }, { guildId: string; announcementId: string }>({
      query: ({ guildId, announcementId }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ guildId, announcementId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          announcementApi.util.updateQueryData('getGuildAnnouncements', guildId, (draft) => {
            const idx = draft.announcements.findIndex((a) => a.id === announcementId);
            if (idx !== -1) draft.announcements.splice(idx, 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    toggleReaction: builder.mutation<
      Announcement,
      { guildId: string; announcementId: string; type: ReactionType }
    >({
      query: ({ guildId, announcementId, type }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}/reactions`,
        method: 'POST',
        body: { type },
      }),
      async onQueryStarted({ guildId, announcementId, type }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          announcementApi.util.updateQueryData('getGuildAnnouncements', guildId, (draft) => {
            const a = draft.announcements.find((x) => x.id === announcementId);
            if (a) applyOptimisticReaction(a, type);
          }),
        );
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(replaceInList(guildId, updated));
        } catch {
          patch.undo();
        }
      },
    }),

    getAnnouncementComments: builder.query<AnnouncementComment[], { guildId: string; announcementId: string }>({
      query: ({ guildId, announcementId }) => `guilds/${guildId}/announcements/${announcementId}/comments`,
      providesTags: (_, __, { announcementId }) => commentsTag(announcementId),
    }),

    addAnnouncementComment: builder.mutation<
      AnnouncementComment,
      {
        guildId: string;
        announcementId: string;
        body: string;
        author?: { userId: string; profile: AnnouncementComment['profile'] };
      }
    >({
      query: ({ guildId, announcementId, body }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}/comments`,
        method: 'POST',
        body: { body },
      }),
      async onQueryStarted({ guildId, announcementId, body, author }, { dispatch, queryFulfilled }) {
        let tempId: string | null = null;
        if (author) {
          tempId = `temp-${crypto.randomUUID()}`;
          const now = new Date().toISOString();
          const optimistic: AnnouncementComment = {
            id: tempId,
            announcementId,
            userId: author.userId,
            body,
            createdAt: now,
            canDelete: true,
            profile: author.profile,
          };
          dispatch(
            announcementApi.util.updateQueryData(
              'getAnnouncementComments',
              { guildId, announcementId },
              (draft) => { draft.push(optimistic); },
            ),
          );
        }
        // Bump the card's comment counter immediately.
        const countPatch = dispatch(
          announcementApi.util.updateQueryData('getGuildAnnouncements', guildId, (draft) => {
            const a = draft.announcements.find((x) => x.id === announcementId);
            if (a) a.commentCount += 1;
          }),
        );
        try {
          const { data: created } = await queryFulfilled;
          dispatch(
            announcementApi.util.updateQueryData(
              'getAnnouncementComments',
              { guildId, announcementId },
              (draft) => {
                const idx = tempId ? draft.findIndex((c) => c.id === tempId) : -1;
                if (idx !== -1) draft[idx] = created;
                else if (!draft.some((c) => c.id === created.id)) draft.push(created);
              },
            ),
          );
        } catch {
          countPatch.undo();
          if (tempId) {
            dispatch(
              announcementApi.util.updateQueryData(
                'getAnnouncementComments',
                { guildId, announcementId },
                (draft) => {
                  const idx = draft.findIndex((c) => c.id === tempId);
                  if (idx !== -1) draft.splice(idx, 1);
                },
              ),
            );
          }
        }
      },
    }),

    deleteAnnouncementComment: builder.mutation<
      { deleted: boolean },
      { guildId: string; announcementId: string; commentId: string }
    >({
      query: ({ guildId, announcementId, commentId }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}/comments/${commentId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ guildId, announcementId, commentId }, { dispatch, queryFulfilled }) {
        const listPatch = dispatch(
          announcementApi.util.updateQueryData(
            'getAnnouncementComments',
            { guildId, announcementId },
            (draft) => {
              const idx = draft.findIndex((c) => c.id === commentId);
              if (idx !== -1) draft.splice(idx, 1);
            },
          ),
        );
        const countPatch = dispatch(
          announcementApi.util.updateQueryData('getGuildAnnouncements', guildId, (draft) => {
            const a = draft.announcements.find((x) => x.id === announcementId);
            if (a) a.commentCount = Math.max(0, a.commentCount - 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          listPatch.undo();
          countPatch.undo();
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGuildAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useSetAnnouncementPinnedMutation,
  useDeleteAnnouncementMutation,
  useToggleReactionMutation,
  useGetAnnouncementCommentsQuery,
  useAddAnnouncementCommentMutation,
  useDeleteAnnouncementCommentMutation,
} = announcementApi;
```

- [ ] **Step 3: Write the barrel**

```ts
// src/entities/announcement/index.ts
export type {
  Announcement,
  AnnouncementComment,
  AnnouncementProfile,
  ReactionType,
  ReactionSummary,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  GuildAnnouncementsResult,
} from './model/types';
export { REACTION_TYPES } from './model/types';
export {
  useGetGuildAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useSetAnnouncementPinnedMutation,
  useDeleteAnnouncementMutation,
  useToggleReactionMutation,
  useGetAnnouncementCommentsQuery,
  useAddAnnouncementCommentMutation,
  useDeleteAnnouncementCommentMutation,
} from './api/announcementApi';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/baseApi.ts src/entities/announcement/api/announcementApi.ts src/entities/announcement/index.ts
git commit -m "feat(announcements): add RTK Query endpoints and entity barrel"
```

---

## Task 8: Route handlers

**Files:**
- Create: `src/app/api/guilds/[id]/announcements/route.ts`
- Create: `src/app/api/guilds/[id]/announcements/[announcementId]/route.ts`
- Create: `src/app/api/guilds/[id]/announcements/[announcementId]/comments/route.ts`
- Create: `src/app/api/guilds/[id]/announcements/[announcementId]/comments/[commentId]/route.ts`
- Create: `src/app/api/guilds/[id]/announcements/[announcementId]/reactions/route.ts`

Mirrors the polls routes. `requireGuildRole(supabase, guildId, userId, ['ADMIN','OWNER'])` gates announcement create/edit/pin/delete with a clean 403 (RLS is the backstop). Comments and reactions require auth only (RLS enforces membership).

- [ ] **Step 1: list route (GET/POST)**

```ts
// src/app/api/guilds/[id]/announcements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getGuildAnnouncements } from '@/entities/announcement/api/getGuildAnnouncements';
import { createAnnouncement, InvalidAnnouncementError } from '@/entities/announcement/api/createAnnouncement';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await getGuildAnnouncements(id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const forbidden = await requireGuildRole(auth.supabase, id, auth.user.id, ['ADMIN', 'OWNER']);
    if (forbidden) return forbidden;

    const body = await request.json();
    const announcement = await createAnnouncement(id, {
      title: String(body.title ?? ''),
      content: String(body.content ?? ''),
      isPinned: !!body.isPinned,
    });
    return NextResponse.json(announcement, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidAnnouncementError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}
```

- [ ] **Step 2: item route (PATCH/DELETE)**

```ts
// src/app/api/guilds/[id]/announcements/[announcementId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateAnnouncement } from '@/entities/announcement/api/updateAnnouncement';
import { setPinned } from '@/entities/announcement/api/setPinned';
import { deleteAnnouncement } from '@/entities/announcement/api/deleteAnnouncement';
import { InvalidAnnouncementError } from '@/entities/announcement/api/createAnnouncement';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id, announcementId } = await params;
    const forbidden = await requireGuildRole(auth.supabase, id, auth.user.id, ['ADMIN', 'OWNER']);
    if (forbidden) return forbidden;

    const body = await request.json();
    // Pin toggle when `isPinned` is present; otherwise an edit.
    const announcement =
      typeof body.isPinned === 'boolean'
        ? await setPinned(announcementId, body.isPinned)
        : await updateAnnouncement(announcementId, {
            title: String(body.title ?? ''),
            content: String(body.content ?? ''),
          });
    return NextResponse.json(announcement);
  } catch (e) {
    if (e instanceof InvalidAnnouncementError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id, announcementId } = await params;
    const forbidden = await requireGuildRole(auth.supabase, id, auth.user.id, ['ADMIN', 'OWNER']);
    if (forbidden) return forbidden;

    const result = await deleteAnnouncement(announcementId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}
```

- [ ] **Step 3: comments routes**

```ts
// src/app/api/guilds/[id]/announcements/[announcementId]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAnnouncementComments } from '@/entities/announcement/api/getAnnouncementComments';
import { addAnnouncementComment } from '@/entities/announcement/api/addAnnouncementComment';
import { InvalidAnnouncementError } from '@/entities/announcement/api/createAnnouncement';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  try {
    const { announcementId } = await params;
    const comments = await getAnnouncementComments(announcementId);
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { announcementId } = await params;
    const { body } = await request.json();
    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid comment body' }, { status: 400 });
    }
    const comment = await addAnnouncementComment(announcementId, body);
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidAnnouncementError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
```

```ts
// src/app/api/guilds/[id]/announcements/[announcementId]/comments/[commentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deleteAnnouncementComment } from '@/entities/announcement/api/deleteAnnouncementComment';
import { requireUser } from '@/shared/api/guildAuth';

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string; commentId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { commentId } = await params;
    // RLS enforces author-or-admin; a non-permitted delete affects 0 rows.
    await deleteAnnouncementComment(commentId);
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
```

- [ ] **Step 4: reactions route**

```ts
// src/app/api/guilds/[id]/announcements/[announcementId]/reactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { toggleReaction } from '@/entities/announcement/api/toggleReaction';
import { InvalidAnnouncementError } from '@/entities/announcement/api/createAnnouncement';
import { requireUser } from '@/shared/api/guildAuth';
import type { ReactionType } from '@/entities/announcement';
import { REACTION_TYPES } from '@/entities/announcement';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { announcementId } = await params;
    const { type } = await request.json();
    if (!REACTION_TYPES.includes(type as ReactionType)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
    }
    const announcement = await toggleReaction(announcementId, type as ReactionType);
    return NextResponse.json(announcement);
  } catch (e) {
    if (e instanceof InvalidAnnouncementError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/guilds/[id]/announcements"
git commit -m "feat(announcements): add route handlers"
```

---

## Task 9: i18n messages

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add the `Announcements` namespace + `Common.announcements` (en)**

In `messages/en.json`, add `"announcements": "Announcements"` to the `Common` object, and add a top-level `Announcements` namespace:

```json
"Announcements": {
  "newAnnouncement": "New announcement",
  "createTitle": "New announcement",
  "editTitle": "Edit announcement",
  "titleLabel": "Title",
  "titlePlaceholder": "Announcement title",
  "contentLabel": "Content",
  "contentPlaceholder": "Write your announcement… Markdown supported.",
  "write": "Write",
  "preview": "Preview",
  "previewEmpty": "Nothing to preview yet.",
  "pinLabel": "Pin to top",
  "publishButton": "Publish",
  "saveButton": "Save",
  "pinnedBadge": "Pinned",
  "pin": "Pin",
  "unpin": "Unpin",
  "editLabel": "Edit",
  "deleteLabel": "Delete",
  "confirmDelete": "Delete this announcement?",
  "edited": "edited",
  "empty": "No announcements yet.",
  "commentsCount": "{count, plural, =0 {No comments} one {# comment} other {# comments}}",
  "commentPlaceholder": "Write a comment…",
  "sendComment": "Send",
  "lockedPrompt": "Sign in to comment.",
  "deleteComment": "Delete comment",
  "reactions": {
    "like": "Like",
    "dislike": "Dislike",
    "heart": "Love",
    "doubt": "Doubt",
    "poop": "Poop"
  },
  "createError": "Failed to publish announcement",
  "updateError": "Failed to save announcement",
  "deleteError": "Failed to delete announcement",
  "reactError": "Failed to update reaction",
  "commentError": "Failed to send comment",
  "commentDeleteError": "Failed to delete comment"
}
```

- [ ] **Step 2: Add the Russian translations (ru)**

In `messages/ru.json`, add `"announcements": "Анонсы"` to `Common`, and:

```json
"Announcements": {
  "newAnnouncement": "Новый анонс",
  "createTitle": "Новый анонс",
  "editTitle": "Редактировать анонс",
  "titleLabel": "Заголовок",
  "titlePlaceholder": "Заголовок анонса",
  "contentLabel": "Содержание",
  "contentPlaceholder": "Напишите анонс… Поддерживается Markdown.",
  "write": "Текст",
  "preview": "Превью",
  "previewEmpty": "Пока нечего показать.",
  "pinLabel": "Закрепить сверху",
  "publishButton": "Опубликовать",
  "saveButton": "Сохранить",
  "pinnedBadge": "Закреплено",
  "pin": "Закрепить",
  "unpin": "Открепить",
  "editLabel": "Редактировать",
  "deleteLabel": "Удалить",
  "confirmDelete": "Удалить этот анонс?",
  "edited": "изменено",
  "empty": "Анонсов пока нет.",
  "commentsCount": "{count, plural, =0 {Нет комментариев} one {# комментарий} few {# комментария} many {# комментариев} other {# комментариев}}",
  "commentPlaceholder": "Написать комментарий…",
  "sendComment": "Отправить",
  "lockedPrompt": "Войдите, чтобы комментировать.",
  "deleteComment": "Удалить комментарий",
  "reactions": {
    "like": "Нравится",
    "dislike": "Не нравится",
    "heart": "Любовь",
    "doubt": "Сомнение",
    "poop": "Какашка"
  },
  "createError": "Не удалось опубликовать анонс",
  "updateError": "Не удалось сохранить анонс",
  "deleteError": "Не удалось удалить анонс",
  "reactError": "Не удалось изменить реакцию",
  "commentError": "Не удалось отправить комментарий",
  "commentDeleteError": "Не удалось удалить комментарий"
}
```

- [ ] **Step 3: Verify JSON validity**

Run: `node -e "require('./messages/en.json'); require('./messages/ru.json'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat(announcements): add i18n strings"
```

---

## Task 10: AnnouncementWizard (create/edit form)

**Files:**
- Create: `src/features/guild-announcement/ui/AnnouncementWizard.tsx`
- Create: `src/features/guild-announcement/ui/AnnouncementWizard.module.css`

Single-screen modal built on `WizardDialog`. Doubles as the edit form when `editing` is provided. Markdown editor has a Write/Preview toggle using the shared `Tabs` and `Markdown`.

- [ ] **Step 1: Write the component**

```tsx
// src/features/guild-announcement/ui/AnnouncementWizard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as Form from '@radix-ui/react-form';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Switch } from '@/shared/ui/Switch';
import { FormField } from '@/shared/ui/FormField';
import { WizardDialog, WizardColumn } from '@/shared/ui/WizardDialog';
import { Markdown } from '@/shared/ui/Markdown';
import {
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
} from '@/entities/announcement';
import styles from './AnnouncementWizard.module.css';

const FORM_ID = 'announcement-wizard-form';

interface AnnouncementWizardProps {
  open: boolean;
  onClose: () => void;
  guildId: string;
  /** When set, the wizard edits an existing announcement instead of creating one. */
  editing?: { id: string; title: string; content: string } | null;
}

export const AnnouncementWizard: React.FC<AnnouncementWizardProps> = ({
  open,
  onClose,
  guildId,
  editing,
}) => {
  const t = useTranslations('Announcements');
  const commonT = useTranslations('Common');
  const [createAnnouncement, { isLoading: isCreating }] = useCreateAnnouncementMutation();
  const [updateAnnouncement, { isLoading: isUpdating }] = useUpdateAnnouncementMutation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  // Load the edited values whenever the dialog opens for a given target.
  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? '');
      setContent(editing?.content ?? '');
      setIsPinned(false);
      setTab('write');
    }
  }, [open, editing]);

  const isLoading = isCreating || isUpdating;
  const isValid = title.trim() !== '' && content.trim() !== '';

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;
    try {
      if (editing) {
        await updateAnnouncement({
          guildId,
          announcementId: editing.id,
          input: { title, content },
        }).unwrap();
      } else {
        await createAnnouncement({ guildId, input: { title, content, isPinned } }).unwrap();
      }
      handleClose();
    } catch {
      toast.error(editing ? t('updateError') : t('createError'));
    }
  };

  return (
    <WizardDialog
      open={open}
      onClose={handleClose}
      title={editing ? t('editTitle') : t('createTitle')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {commonT('cancel')}
          </Button>
          <Button type="submit" variant="primary" form={FORM_ID} disabled={!isValid} isLoading={isLoading}>
            {editing ? t('saveButton') : t('publishButton')}
          </Button>
        </>
      }
    >
      <WizardColumn className={styles.column}>
        <Form.Root id={FORM_ID} onSubmit={handleSubmit} className={styles.form}>
          <FormField name="title" label={t('titleLabel')} className={styles.formGroup}>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              required
              autoFocus
              maxLength={200}
            />
          </FormField>

          <div className={styles.editorHead}>
            <span className={styles.editorLabel}>{t('contentLabel')}</span>
            <div className={styles.tabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'write'}
                className={`${styles.tab} ${tab === 'write' ? styles.tabActive : ''}`}
                onClick={() => setTab('write')}
              >
                {t('write')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'preview'}
                className={`${styles.tab} ${tab === 'preview' ? styles.tabActive : ''}`}
                onClick={() => setTab('preview')}
              >
                {t('preview')}
              </button>
            </div>
          </div>

          {tab === 'write' ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('contentPlaceholder')}
              className={styles.editor}
              rows={10}
              maxLength={10000}
            />
          ) : (
            <div className={styles.preview}>
              {content.trim() ? <Markdown source={content} /> : <p className={styles.previewEmpty}>{t('previewEmpty')}</p>}
            </div>
          )}

          {!editing && (
            <div className={styles.pinRow}>
              <span className={styles.pinLabel}>{t('pinLabel')}</span>
              <Switch checked={isPinned} onCheckedChange={setIsPinned} ariaLabel={t('pinLabel')} />
            </div>
          )}
        </Form.Root>
      </WizardColumn>
    </WizardDialog>
  );
};
```

- [ ] **Step 2: Write the CSS module**

```css
/* src/features/guild-announcement/ui/AnnouncementWizard.module.css */
.column { width: min(640px, 90vw); }
.form { display: flex; flex-direction: column; gap: 1rem; }
.formGroup { display: flex; flex-direction: column; gap: 0.4rem; }
.editorHead { display: flex; align-items: center; justify-content: space-between; }
.editorLabel { font-size: 0.85rem; color: var(--color-text-muted); }
.tabs { display: flex; gap: 0.25rem; }
.tab {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
}
.tabActive { background: rgba(255, 255, 255, 0.08); color: var(--color-text); }
.editor { min-height: 220px; resize: vertical; font-family: inherit; }
.preview {
  min-height: 220px;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.previewEmpty { color: var(--color-text-muted); margin: 0; }
.pinRow { display: flex; align-items: center; justify-content: space-between; }
.pinLabel { font-size: 0.9rem; }
```

(Confirm CSS variable names against the design system before finalizing.)

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors. (Barrel from Task 13 not required yet — this file imports only entity + shared.)

- [ ] **Step 4: Commit**

```bash
git add src/features/guild-announcement/ui/AnnouncementWizard.tsx src/features/guild-announcement/ui/AnnouncementWizard.module.css
git commit -m "feat(announcements): add create/edit wizard"
```

---

## Task 11: ReactionBar

**Files:**
- Create: `src/features/guild-announcement/ui/ReactionBar.tsx`
- Create: `src/features/guild-announcement/ui/ReactionBar.module.css`

- [ ] **Step 1: Write the component**

```tsx
// src/features/guild-announcement/ui/ReactionBar.tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useToggleReactionMutation, type ReactionSummary, type ReactionType } from '@/entities/announcement';
import styles from './ReactionBar.module.css';

const EMOJI: Record<ReactionType, string> = {
  like: '👍',
  dislike: '👎',
  heart: '❤️',
  doubt: '🤔',
  poop: '💩',
};

interface ReactionBarProps {
  guildId: string;
  announcementId: string;
  reactions: ReactionSummary[];
  canReact: boolean;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({ guildId, announcementId, reactions, canReact }) => {
  const t = useTranslations('Announcements');
  const [toggle] = useToggleReactionMutation();

  const handleClick = async (type: ReactionType) => {
    if (!canReact) return;
    try {
      await toggle({ guildId, announcementId, type }).unwrap();
    } catch {
      toast.error(t('reactError'));
    }
  };

  return (
    <div className={styles.bar}>
      {reactions.map((r) => (
        <Tooltip key={r.type} content={t(`reactions.${r.type}`)}>
          <button
            type="button"
            className={`${styles.reaction} ${r.reacted ? styles.active : ''}`}
            onClick={() => handleClick(r.type)}
            disabled={!canReact}
            aria-pressed={r.reacted}
            aria-label={t(`reactions.${r.type}`)}
          >
            <span className={styles.emoji} aria-hidden="true">{EMOJI[r.type]}</span>
            {r.count > 0 && <span className={styles.count}>{r.count}</span>}
          </button>
        </Tooltip>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Write the CSS module**

```css
/* src/features/guild-announcement/ui/ReactionBar.module.css */
.bar { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.reaction {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.reaction:hover:not(:disabled) { background: rgba(255, 255, 255, 0.09); }
.reaction:disabled { cursor: default; opacity: 0.7; }
.active { border-color: var(--color-accent); background: rgba(120, 130, 255, 0.18); }
.emoji { font-size: 1rem; line-height: 1; }
.count { font-variant-numeric: tabular-nums; min-width: 0.75rem; }
```

- [ ] **Step 3: Commit**

```bash
git add src/features/guild-announcement/ui/ReactionBar.tsx src/features/guild-announcement/ui/ReactionBar.module.css
git commit -m "feat(announcements): add reaction bar"
```

---

## Task 12: AnnouncementComments

**Files:**
- Create: `src/features/guild-announcement/ui/AnnouncementComments.tsx`
- Create: `src/features/guild-announcement/ui/AnnouncementComments.module.css`

Lazy-loads comments when expanded (`skip` until open). Reuses `MessageComposer` for input, `UserAvatar` + `ProfileLink` + `resolveDisplayName` for rows.

- [ ] **Step 1: Write the component**

```tsx
// src/features/guild-announcement/ui/AnnouncementComments.tsx
'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { MessageComposer } from '@/shared/ui/MessageComposer';
import { resolveDisplayName } from '@/entities/user';
import {
  useGetAnnouncementCommentsQuery,
  useAddAnnouncementCommentMutation,
  useDeleteAnnouncementCommentMutation,
  type AnnouncementComment,
} from '@/entities/announcement';
import styles from './AnnouncementComments.module.css';

interface AnnouncementCommentsProps {
  guildId: string;
  announcementId: string;
  userId?: string;
  viewerProfile?: AnnouncementComment['profile'];
}

export const AnnouncementComments: React.FC<AnnouncementCommentsProps> = ({
  guildId,
  announcementId,
  userId,
  viewerProfile,
}) => {
  const t = useTranslations('Announcements');
  const locale = useLocale();
  const { data: comments = [], isLoading } = useGetAnnouncementCommentsQuery({ guildId, announcementId });
  const [addComment, { isLoading: isAdding }] = useAddAnnouncementCommentMutation();
  const [deleteComment] = useDeleteAnnouncementCommentMutation();

  const handleSubmit = async (body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await addComment({
        guildId,
        announcementId,
        body: trimmed,
        author: userId && viewerProfile ? { userId, profile: viewerProfile } : undefined,
      }).unwrap();
    } catch {
      toast.error(t('commentError'));
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment({ guildId, announcementId, commentId }).unwrap();
    } catch {
      toast.error(t('commentDeleteError'));
    }
  };

  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {isLoading && <li className={styles.muted}>…</li>}
        {!isLoading &&
          comments.map((c) => (
            <li key={c.id} className={styles.row}>
              <ProfileLink publicId={c.profile.publicId} aria-label={resolveDisplayName(c.profile)}>
                <UserAvatar avatarUrl={c.profile.avatarUrl} name={resolveDisplayName(c.profile)} size="sm" />
              </ProfileLink>
              <div className={styles.bubble}>
                <div className={styles.meta}>
                  <ProfileLink publicId={c.profile.publicId} className={styles.author}>
                    {resolveDisplayName(c.profile)}
                  </ProfileLink>
                  <span className={styles.time}>{dayjs(c.createdAt).locale(locale).fromNow()}</span>
                  {c.canDelete && !c.id.startsWith('temp-') && (
                    <button
                      type="button"
                      className={styles.delete}
                      onClick={() => handleDelete(c.id)}
                      aria-label={t('deleteComment')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className={styles.body}>{c.body}</p>
              </div>
            </li>
          ))}
      </ul>

      <MessageComposer
        canWrite={!!userId}
        onSubmit={handleSubmit}
        isSubmitting={isAdding}
        placeholder={t('commentPlaceholder')}
        sendLabel={t('sendComment')}
        lockedPrompt={t('lockedPrompt')}
        maxLength={2000}
      />
    </div>
  );
};
```

Note: `resolveDisplayName` takes `{ fullName, alias, displayAsAlias }`. The `AnnouncementProfile` shape includes those fields, so passing `c.profile` works. If TS complains about extra fields, pass `{ fullName: c.profile.fullName, alias: c.profile.alias, displayAsAlias: c.profile.displayAsAlias }` explicitly (mirror `GuildChat.tsx`).

- [ ] **Step 2: Write the CSS module**

```css
/* src/features/guild-announcement/ui/AnnouncementComments.module.css */
.wrap { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.75rem; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.muted { color: var(--color-text-muted); }
.row { display: flex; gap: 0.5rem; }
.bubble {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 0.45rem 0.65rem;
}
.meta { display: flex; align-items: center; gap: 0.5rem; }
.author { font-weight: 600; font-size: 0.85rem; }
.time { font-size: 0.75rem; color: var(--color-text-muted); }
.delete {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: inline-flex;
}
.delete:hover { color: var(--color-danger, #ff6b6b); }
.body { margin: 0.2rem 0 0; font-size: 0.9rem; white-space: pre-wrap; overflow-wrap: anywhere; }
```

- [ ] **Step 3: Verify dayjs `fromNow` is available**

Run: `grep -n "relativeTime\|fromNow" src/shared/lib/dayjs.ts`
Expected: the `relativeTime` plugin is extended. If not present, replace `dayjs(c.createdAt).locale(locale).fromNow()` with `dayjs(c.createdAt).locale(locale).format('LLL')` and remove the dependency on `fromNow`.

- [ ] **Step 4: Commit**

```bash
git add src/features/guild-announcement/ui/AnnouncementComments.tsx src/features/guild-announcement/ui/AnnouncementComments.module.css
git commit -m "feat(announcements): add comments section"
```

---

## Task 13: AnnouncementCard + feature barrel

**Files:**
- Create: `src/features/guild-announcement/ui/AnnouncementCard.tsx`
- Create: `src/features/guild-announcement/ui/AnnouncementCard.module.css`
- Create: `src/features/guild-announcement/index.ts`

- [ ] **Step 1: Write the card**

```tsx
// src/features/guild-announcement/ui/AnnouncementCard.tsx
'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { toast } from 'sonner';
import { Pin, PinOff, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { Tooltip } from '@/shared/ui/Tooltip';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Markdown } from '@/shared/ui/Markdown';
import { resolveDisplayName } from '@/entities/user';
import {
  useSetAnnouncementPinnedMutation,
  useDeleteAnnouncementMutation,
  type Announcement,
  type AnnouncementComment,
} from '@/entities/announcement';
import { ReactionBar } from './ReactionBar';
import { AnnouncementComments } from './AnnouncementComments';
import styles from './AnnouncementCard.module.css';

interface AnnouncementCardProps {
  announcement: Announcement;
  guildId: string;
  userId?: string;
  viewerProfile?: AnnouncementComment['profile'];
  onEdit: (a: Announcement) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement: a,
  guildId,
  userId,
  viewerProfile,
  onEdit,
}) => {
  const t = useTranslations('Announcements');
  const locale = useLocale();
  const [setPinned] = useSetAnnouncementPinnedMutation();
  const [deleteAnnouncement, { isLoading: isDeleting }] = useDeleteAnnouncementMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const handlePinToggle = async () => {
    try {
      await setPinned({ guildId, announcementId: a.id, isPinned: !a.isPinned }).unwrap();
    } catch {
      toast.error(t('updateError'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAnnouncement({ guildId, announcementId: a.id }).unwrap();
    } catch {
      toast.error(t('deleteError'));
    }
  };

  return (
    <article className={`${styles.card} ${a.isPinned ? styles.pinned : ''}`}>
      <header className={styles.head}>
        <ProfileLink publicId={a.author.publicId} aria-label={resolveDisplayName(a.author)}>
          <UserAvatar avatarUrl={a.author.avatarUrl} name={resolveDisplayName(a.author)} size="md" />
        </ProfileLink>
        <div className={styles.headText}>
          <ProfileLink publicId={a.author.publicId} className={styles.author}>
            {resolveDisplayName(a.author)}
          </ProfileLink>
          <span className={styles.time}>
            {dayjs(a.createdAt).locale(locale).format('LLL')}
            {a.updatedAt !== a.createdAt && <span className={styles.edited}> · {t('edited')}</span>}
          </span>
        </div>

        {a.isPinned && (
          <span className={styles.pinnedBadge}>
            <Pin size={12} aria-hidden="true" />
            {t('pinnedBadge')}
          </span>
        )}

        {a.canManage && (
          <div className={styles.actions}>
            <Tooltip content={a.isPinned ? t('unpin') : t('pin')}>
              <button type="button" className={styles.action} onClick={handlePinToggle} aria-label={a.isPinned ? t('unpin') : t('pin')}>
                {a.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
            </Tooltip>
            <Tooltip content={t('editLabel')}>
              <button type="button" className={styles.action} onClick={() => onEdit(a)} aria-label={t('editLabel')}>
                <Pencil size={16} />
              </button>
            </Tooltip>
            <Tooltip content={t('deleteLabel')}>
              <button type="button" className={`${styles.action} ${styles.danger}`} onClick={() => setConfirmOpen(true)} aria-label={t('deleteLabel')}>
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        )}
      </header>

      <h3 className={styles.title}>{a.title}</h3>
      <Markdown source={a.content} className={styles.content} />

      <footer className={styles.foot}>
        <ReactionBar guildId={guildId} announcementId={a.id} reactions={a.reactions} canReact={!!userId} />
        <button type="button" className={styles.commentsToggle} onClick={() => setCommentsOpen((v) => !v)}>
          <MessageSquare size={16} />
          {t('commentsCount', { count: a.commentCount })}
        </button>
      </footer>

      {commentsOpen && (
        <AnnouncementComments guildId={guildId} announcementId={a.id} userId={userId} viewerProfile={viewerProfile} />
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('confirmDelete')}
        confirmLabel={t('deleteLabel')}
        isLoading={isDeleting}
      />
    </article>
  );
};
```

- [ ] **Step 2: Write the CSS module**

```css
/* src/features/guild-announcement/ui/AnnouncementCard.module.css */
.card {
  background: var(--glass-bg, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 1rem 1.1rem;
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.pinned { border-color: var(--color-accent); }
.head { display: flex; align-items: center; gap: 0.6rem; }
.headText { display: flex; flex-direction: column; min-width: 0; }
.author { font-weight: 600; font-size: 0.95rem; }
.time { font-size: 0.78rem; color: var(--color-text-muted); }
.edited { font-style: italic; }
.pinnedBadge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: var(--color-accent);
  margin-left: 0.4rem;
}
.actions { display: flex; gap: 0.2rem; margin-left: auto; }
.action {
  display: inline-flex;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  padding: 0.3rem;
  border-radius: 8px;
  cursor: pointer;
}
.action:hover { background: rgba(255, 255, 255, 0.08); color: var(--color-text); }
.danger:hover { color: var(--color-danger, #ff6b6b); }
.title { margin: 0; font-size: 1.15rem; line-height: 1.3; }
.content { }
.foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.25rem; }
.commentsToggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
}
.commentsToggle:hover { color: var(--color-text); }
```

- [ ] **Step 3: Write the feature barrel**

```ts
// src/features/guild-announcement/index.ts
export { AnnouncementCard } from './ui/AnnouncementCard';
export { AnnouncementWizard } from './ui/AnnouncementWizard';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/guild-announcement/ui/AnnouncementCard.tsx src/features/guild-announcement/ui/AnnouncementCard.module.css src/features/guild-announcement/index.ts
git commit -m "feat(announcements): add announcement card and feature barrel"
```

---

## Task 14: GuildAnnouncements widget

**Files:**
- Create: `src/widgets/guild-announcements/ui/GuildAnnouncements.tsx`
- Create: `src/widgets/guild-announcements/ui/GuildAnnouncements.module.css`
- Create: `src/widgets/guild-announcements/ui/AnnouncementsSkeleton.tsx`
- Create: `src/widgets/guild-announcements/index.ts`

- [ ] **Step 1: Write the skeleton**

```tsx
// src/widgets/guild-announcements/ui/AnnouncementsSkeleton.tsx
import React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import styles from './GuildAnnouncements.module.css';

export const AnnouncementsSkeleton: React.FC = () => (
  <div className={styles.skeletonList}>
    {[0, 1, 2].map((i) => (
      <div key={i} className={styles.skeletonCard}>
        <Skeleton width="40%" height={18} />
        <Skeleton width="100%" height={48} />
        <Skeleton width="30%" height={16} />
      </div>
    ))}
  </div>
);
```

Note: confirm `Skeleton`'s prop API (`width`/`height`) by reading `src/shared/ui/Skeleton`; adjust props if it differs (e.g. uses `className` sizing).

- [ ] **Step 2: Write the widget**

```tsx
// src/widgets/guild-announcements/ui/GuildAnnouncements.tsx
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Panel } from '@/shared/ui/Panel';
import { Button } from '@/shared/ui/Button';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import { AnnouncementCard, AnnouncementWizard } from '@/features/guild-announcement';
import { useGetGuildAnnouncementsQuery, type Announcement } from '@/entities/announcement';
import type { Guild } from '@/entities/guild';
import type { AnnouncementComment } from '@/entities/announcement';
import { AnnouncementsSkeleton } from './AnnouncementsSkeleton';
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
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds, initialGuildId, userId);

  const { data, isLoading } = useGetGuildAnnouncementsQuery(activeGuildId ?? '', { skip: !activeGuildId });
  const announcements = data?.announcements ?? [];
  const canCreate = data?.canCreate ?? false;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string; content: string } | null>(null);

  const openCreate = () => {
    setEditing(null);
    setWizardOpen(true);
  };
  const openEdit = (a: Announcement) => {
    setEditing({ id: a.id, title: a.title, content: a.content });
    setWizardOpen(true);
  };

  return (
    <Panel className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.guildSelect}>
          <GuildSelect value={activeGuildId} onValueChange={handleGuildChange} options={guildOptions} />
        </div>
        {canCreate && (
          <Button type="button" variant="secondary_glass" className={styles.newButton} onClick={openCreate}>
            <Plus size={16} />
            {t('newAnnouncement')}
          </Button>
        )}
      </div>

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

      {activeGuildId && (
        <AnnouncementWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          guildId={activeGuildId}
          editing={editing}
        />
      )}
    </Panel>
  );
};
```

- [ ] **Step 3: Write the CSS module**

```css
/* src/widgets/guild-announcements/ui/GuildAnnouncements.module.css */
.panel { display: flex; flex-direction: column; gap: 1rem; flex: 1; min-height: 0; }
.header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.guildSelect { min-width: 220px; }
.newButton { display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap; }
.feed {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-right: 0.25rem;
}
.empty { color: var(--color-text-muted); text-align: center; padding: 2rem 0; }
.skeletonList { display: flex; flex-direction: column; gap: 1rem; }
.skeletonCard {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 16px;
}
```

(Mirror `GuildChat.module.css` for the exact panel/header tokens; confirm `secondary_glass` button variant exists — it is used in `GuildChat.tsx`.)

- [ ] **Step 4: Write the barrel**

```ts
// src/widgets/guild-announcements/index.ts
export { GuildAnnouncements } from './ui/GuildAnnouncements';
```

- [ ] **Step 5: Typecheck + lint:fsd**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors.

Run: `pnpm lint:fsd`
Expected: no NEW violations for `widgets/guild-announcements`, `features/guild-announcement`, `entities/announcement` (baseline has 2 pre-existing `insignificant-slice` warnings).

- [ ] **Step 6: Commit**

```bash
git add src/widgets/guild-announcements
git commit -m "feat(announcements): add guild announcements widget"
```

---

## Task 15: Page

**Files:**
- Create: `src/app/announcements/page.tsx`
- Create: `src/app/announcements/AnnouncementsPage.module.css`

Mirror of `src/app/guild-chat/page.tsx`.

- [ ] **Step 1: Write the page**

```tsx
// src/app/announcements/page.tsx
import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { getUser } from '@/entities/user/api/getUser';
import { UpcomingEventsStrip } from '@/widgets/upcoming-events';
import { GuildAnnouncements } from '@/widgets/guild-announcements';
import { getServerEvents } from '@/entities/event/api/getEvents';
import styles from './AnnouncementsPage.module.css';

export default async function AnnouncementsPage() {
  const user = await getUser();
  const guilds = await getMyGuilds(user?.id);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const lastActiveGuildId = user?.profile?.lastActiveGuildId;
  const defaultGuildId =
    lastActiveGuildId && guilds.some((g) => g.id === lastActiveGuildId)
      ? lastActiveGuildId
      : guilds[0].id;
  const initialEvents = await getServerEvents(defaultGuildId);

  return (
    <main className={styles.main}>
      <UpcomingEventsStrip
        guilds={guilds}
        userId={user?.id}
        initialEvents={initialEvents}
        initialGuildId={defaultGuildId}
      />
      <GuildAnnouncements
        guilds={guilds}
        userId={user?.id}
        viewerProfile={
          user?.profile
            ? {
                publicId: user.profile.publicId,
                fullName: user.profile.fullName,
                avatarUrl: user.profile.avatarUrl,
                alias: user.profile.alias ?? null,
                displayAsAlias: user.profile.displayAsAlias ?? false,
                icon: user.profile.icon ?? null,
              }
            : undefined
        }
        initialGuildId={defaultGuildId}
      />
    </main>
  );
}
```

- [ ] **Step 2: Write the page CSS (copy of guild-chat page CSS)**

```css
/* src/app/announcements/AnnouncementsPage.module.css */
.main {
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 1rem;
}

@media (min-width: 961px) {
  .main {
    box-sizing: border-box;
    height: calc(100dvh - var(--header-height));
    display: flex;
    flex-direction: column;
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors. (Confirm `getUser` import path: `src/app/guild-chat/page.tsx` uses `@/entities/user/api/getUser` — reuse the same path.)

- [ ] **Step 4: Commit**

```bash
git add src/app/announcements
git commit -m "feat(announcements): add announcements page"
```

---

## Task 16: Sidebar navigation

**Files:**
- Modify: `src/widgets/sidebar/model/navItems.ts`

- [ ] **Step 1: Add the nav item**

Edit `src/widgets/sidebar/model/navItems.ts` — add `Megaphone` to the import and a nav entry after guild-chat:

```ts
import { Users, Calendar, MessagesSquare, Megaphone, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  badge?: number;
}

export const navItems: NavItem[] = [
  { href: '/', icon: Calendar, labelKey: 'Common.calendar' },
  { href: '/guild-chat', icon: MessagesSquare, labelKey: 'Common.guildChat' },
  { href: '/announcements', icon: Megaphone, labelKey: 'Common.announcements' },
  { href: '/guilds', icon: Users, labelKey: 'Guild.title' },
];
```

- [ ] **Step 2: Run sidebar tests**

Run: `pnpm test:run src/widgets/sidebar/ui/Sidebar.test.tsx`
Expected: PASS. If the test asserts an exact nav-item count, update that assertion to include the new item.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/sidebar/model/navItems.ts src/widgets/sidebar/ui/Sidebar.test.tsx
git commit -m "feat(announcements): add sidebar nav link"
```

---

## Task 17: Final verification

- [ ] **Step 1: Full test suite**

Run: `pnpm test:run`
Expected: all tests pass (no new failures vs. baseline).

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: only the 3 documented baseline errors remain; none in new files.

- [ ] **Step 3: Lint**

Run: `pnpm lint && pnpm lint:fsd`
Expected: no new ESLint errors; only the 2 documented baseline `insignificant-slice` warnings.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: the build succeeds and lists the `/announcements` route.

- [ ] **Step 5: Manual smoke (user-driven)**

Do NOT auto-launch the browser (project rule). Ask the user to run `pnpm dev` and verify: admin sees "New announcement", can publish markdown, pin/edit/delete; member can react and comment; guild switch reloads the feed.

---

## Self-Review Notes

- **Spec coverage:** schema (Task 1), markdown (Task 2), entity/types/reactions (Tasks 3–7), routes (Task 8), permissions via `requireGuildRole` + RLS + `canCreate`/`canManage` (Tasks 1, 5, 8, 14), wizard single-screen (Task 10), reactions UI 5 emoji (Task 11), comments add+delete no-edit (Tasks 5, 8, 12), card with pin/edit/delete + markdown (Task 13), widget with guild switch + next-event strip via page (Tasks 14–15), sidebar `Megaphone` (Task 16), i18n (Task 9), tests (Tasks 2–4). Out-of-scope items (unread badges, comment editing, comment generalization, who-reacted modal) are intentionally excluded.
- **Type consistency:** `getGuildAnnouncements` → `GuildAnnouncementsResult` ({ announcements, canCreate }); the query type, all optimistic `updateQueryData('getGuildAnnouncements', …)` draft accesses (`draft.announcements`), and the widget consumption all use that shape. `setPinned` (entity fn) ↔ `useSetAnnouncementPinnedMutation` (hook). `mapCommentRow(row, canDelete)` signature consistent across Tasks 4/5/6. `applyOptimisticReaction(a, type)` consistent Tasks 3/7.
- **Assumptions to confirm during execution (flagged inline):** CSS variable token names vs. design-system; `Skeleton` prop API; dayjs `relativeTime`/`fromNow`; `secondary_glass` button variant (already used in GuildChat); `resolveDisplayName` accepting the full profile object.
