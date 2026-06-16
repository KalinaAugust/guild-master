# Call to Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Call to Action page where any guild member posts a rally with a target participant count; when enough members press "Want", a calendar event is auto-created with them as participants.

**Architecture:** Mirror the Announcements vertical slice. New `entities/call-to-action` (types + data layer + RTK Query), `features/call-to-action` (create modal + form + "Want" button), `widgets/call-to-action-board` (page composition), `app/call-to-action` route + API handlers. Launch logic lives in an atomic Supabase RPC `toggle_call_to_action_interest`.

**Tech Stack:** Next.js 16 App Router, React 19, Redux Toolkit + RTK Query, Supabase (Postgres + RLS + RPC), CSS Modules, next-intl, Vitest.

Reference patterns to copy verbatim where possible:
- API slice: `src/entities/announcement/api/announcementApi.ts`
- Data layer: `src/entities/announcement/api/getGuildAnnouncements.ts`, `createAnnouncement.ts`, `mapAnnouncementRow.ts`
- Route handler: `src/app/api/guilds/[id]/announcements/route.ts`
- Widget: `src/widgets/guild-announcements/ui/GuildAnnouncements.tsx`
- Page: `src/app/announcements/page.tsx`
- Create modal: `src/features/guild-announcement/ui/AnnouncementModal.tsx`
- Form fields: `src/features/create-event/ui/EventForm.tsx`

---

## File Structure

**Database (Supabase MCP migration + hand-edited types):**
- `call_to_actions` table, `call_to_action_interests` table, RLS policies
- RPC `create_call_to_action(...)` (insert CTA + creator interest atomically)
- RPC `toggle_call_to_action_interest(p_cta_id uuid)` (toggle + auto-launch)
- `src/shared/api/supabase/types.ts` — hand-add the two tables + two functions

**entities/call-to-action:**
- `model/types.ts`
- `api/mapCallToActionRow.ts`
- `api/getCallToActions.ts`
- `api/createCallToAction.ts`
- `api/toggleInterest.ts`
- `api/deleteCallToAction.ts`
- `api/callToActionApi.ts`
- `ui/CallToActionCard.tsx` + `.module.css`
- `index.ts`

**features/call-to-action:**
- `model/schema.ts` + `model/schema.test.ts`
- `ui/CreateCallToActionModal.tsx` + `.module.css`
- `ui/CallToActionForm.tsx` + `.module.css`
- `index.ts`

**widgets/call-to-action-board:**
- `ui/CallToActionBoard.tsx` + `.module.css`
- `ui/CallToActionSkeleton.tsx`
- `index.ts`

**app:**
- `src/app/call-to-action/page.tsx` + `CallToActionPage.module.css`
- `src/app/api/guilds/[id]/call-to-actions/route.ts` (GET, POST)
- `src/app/api/guilds/[id]/call-to-actions/[ctaId]/route.ts` (DELETE)
- `src/app/api/guilds/[id]/call-to-actions/[ctaId]/interest/route.ts` (POST)

**Shared edits:**
- `src/shared/api/baseApi.ts` — add `'CallToAction'` tag
- `src/widgets/sidebar/model/navItems.ts` — nav item
- `messages/en.json`, `messages/ru.json` — `CallToAction` namespace + `Common.callToAction`
- `src/app/layout.tsx` — add `'CallToAction'` to `requiredNamespaces`

---

## Task 1: Database schema + RLS + RPCs

**Files:** Supabase migration (via MCP `apply_migration`), then `src/shared/api/supabase/types.ts` (hand-edit).

- [ ] **Step 1: Apply migration** `call_to_actions`

```sql
create table public.call_to_actions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null,
  event_date timestamptz not null,
  target_count int not null check (target_count >= 1),
  event_id uuid references public.events(id) on delete set null,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.call_to_actions enable row level security;

create table public.call_to_action_interests (
  id uuid primary key default gen_random_uuid(),
  cta_id uuid not null references public.call_to_actions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (cta_id, user_id)
);
alter table public.call_to_action_interests enable row level security;
```

- [ ] **Step 2: RLS policies** (members read; any member inserts CTA; author/admin manage; own interests)

```sql
-- helper predicate inline: membership of caller in the CTA's guild
create policy "cta_select_members" on public.call_to_actions
  for select using (
    exists (select 1 from public.guild_members m
            where m.guild_id = call_to_actions.guild_id and m.user_id = auth.uid())
  );
create policy "cta_insert_members" on public.call_to_actions
  for insert with check (
    created_by = auth.uid() and exists (
      select 1 from public.guild_members m
      where m.guild_id = call_to_actions.guild_id and m.user_id = auth.uid())
  );
create policy "cta_update_owner_admin" on public.call_to_actions
  for update using (
    created_by = auth.uid() or public.has_guild_role(guild_id, auth.uid(), array['ADMIN','OWNER'])
  );
create policy "cta_delete_owner_admin" on public.call_to_actions
  for delete using (
    created_by = auth.uid() or public.has_guild_role(guild_id, auth.uid(), array['ADMIN','OWNER'])
  );

create policy "ctai_select_members" on public.call_to_action_interests
  for select using (
    exists (select 1 from public.call_to_actions c
            join public.guild_members m on m.guild_id = c.guild_id
            where c.id = call_to_action_interests.cta_id and m.user_id = auth.uid())
  );
create policy "ctai_insert_own" on public.call_to_action_interests
  for insert with check (user_id = auth.uid());
create policy "ctai_delete_own" on public.call_to_action_interests
  for delete using (user_id = auth.uid());
```

NOTE: verify `has_guild_role` signature first via `list_migrations`/`execute_sql` (the project already uses `has_guild_role` for announcements). If its signature differs, adapt the predicate to match the existing one.

- [ ] **Step 3: RPC `create_call_to_action`** (SECURITY DEFINER, inserts CTA + creator interest)

```sql
create or replace function public.create_call_to_action(
  p_guild_id uuid, p_title text, p_description text, p_type text,
  p_event_date timestamptz, p_target_count int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from guild_members m where m.guild_id = p_guild_id and m.user_id = v_uid)
    then raise exception 'Not a guild member'; end if;
  insert into call_to_actions (guild_id, created_by, title, description, type, event_date, target_count)
    values (p_guild_id, v_uid, p_title, p_description, p_type, p_event_date, greatest(p_target_count, 1))
    returning id into v_id;
  insert into call_to_action_interests (cta_id, user_id) values (v_id, v_uid);
  -- target_count = 1 → launch immediately
  perform public._maybe_launch_cta(v_id);
  return v_id;
end; $$;
```

- [ ] **Step 4: RPC `_maybe_launch_cta`** (internal: launch when threshold met)

```sql
create or replace function public._maybe_launch_cta(p_cta_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c record; v_count int; v_event_id uuid;
begin
  select * into c from call_to_actions where id = p_cta_id for update;
  if c.event_id is not null then return; end if;
  select count(*) into v_count from call_to_action_interests where cta_id = p_cta_id;
  if v_count < c.target_count then return; end if;
  insert into events (guild_id, title, description, type, event_date, created_by, week_days)
    values (c.guild_id, c.title, c.description, c.type, c.event_date, c.created_by, '{}')
    returning id into v_event_id;
  insert into event_participants (event_id, user_id, status)
    select v_event_id, user_id, 'confirmed' from call_to_action_interests where cta_id = p_cta_id;
  update call_to_actions set event_id = v_event_id, launched_at = now(), updated_at = now()
    where id = p_cta_id;
end; $$;
```

- [ ] **Step 5: RPC `toggle_call_to_action_interest`** (toggle + maybe launch)

```sql
create or replace function public.toggle_call_to_action_interest(p_cta_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); c record; v_has boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into c from call_to_actions where id = p_cta_id;
  if c.id is null then raise exception 'Not found'; end if;
  if not exists (select 1 from guild_members m where m.guild_id = c.guild_id and m.user_id = v_uid)
    then raise exception 'Not a guild member'; end if;
  select exists(select 1 from call_to_action_interests where cta_id = p_cta_id and user_id = v_uid) into v_has;
  if v_has then
    if c.event_id is not null then raise exception 'Already launched'; end if;
    delete from call_to_action_interests where cta_id = p_cta_id and user_id = v_uid;
  else
    insert into call_to_action_interests (cta_id, user_id) values (p_cta_id, v_uid)
      on conflict do nothing;
    perform public._maybe_launch_cta(p_cta_id);
  end if;
end; $$;
```

- [ ] **Step 6: Hand-edit `src/shared/api/supabase/types.ts`** — add `call_to_actions` and `call_to_action_interests` to `Tables`, and `create_call_to_action` + `toggle_call_to_action_interest` to `Functions`, mirroring an existing table's `Row/Insert/Update/Relationships` shape. (Per project memory: no CLI typegen; hand-edit.)

- [ ] **Step 7: Verify advisors** — run `get_advisors` (security) and confirm no new RLS-missing warnings for the two tables.

---

## Task 2: baseApi tag

**Files:** Modify `src/shared/api/baseApi.ts`.

- [ ] **Step 1:** Add `'CallToAction'` to the `tagTypes` array.
- [ ] **Step 2: Commit** `feat(cta): db schema, rpc, and CallToAction api tag`.

---

## Task 3: Entity types

**Files:** Create `src/entities/call-to-action/model/types.ts`.

- [ ] **Step 1:** Define types.

```ts
import type { ActivityType } from '@/shared/types';

export interface CtaAuthor {
  publicId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  alias: string | null;
  displayAsAlias: boolean;
  icon: string | null;
}

export interface CallToAction {
  id: string;
  guildId: string;
  createdBy: string | null;
  title: string;
  description: string;
  type: ActivityType;
  eventDate: string;      // ISO timestamptz
  targetCount: number;
  interestedCount: number;
  /** Whether the current user has pressed "Want". */
  interested: boolean;
  eventId: string | null; // set once launched
  launchedAt: string | null;
  createdAt: string;
  author: CtaAuthor;
  /** Current user may delete (author or guild admin/owner). */
  canManage: boolean;
}

export interface CallToActionsResult {
  callToActions: CallToAction[];
  canCreate: boolean;     // any guild member → true
}

export interface CreateCallToActionInput {
  title: string;
  description: string;
  type: ActivityType;
  date: string;           // YYYY-MM-DD
  time: string;           // HH:mm
  targetCount: number;
}
```

---

## Task 4: Entity data layer (row mapper + queries)

**Files:** Create `src/entities/call-to-action/api/mapCallToActionRow.ts`, `getCallToActions.ts`, `createCallToAction.ts`, `toggleInterest.ts`, `deleteCallToAction.ts`.

- [ ] **Step 1: `mapCallToActionRow.ts`** — `CTA_SELECT` constant + `buildCallToAction(row, userId, canManage)`, mirroring `mapAnnouncementRow.ts`.

```ts
import type { ActivityType } from '@/shared/types';
import type { CallToAction, CtaAuthor } from '../model/types';

const PROFILE_FIELDS = 'public_id, full_name, avatar_url, alias, display_as_alias, icon';

export const CTA_SELECT =
  `id, guild_id, created_by, title, description, type, event_date, target_count, ` +
  `event_id, launched_at, created_at, ` +
  `profiles(${PROFILE_FIELDS}), ` +
  `call_to_action_interests(user_id)`;

interface ProfileRow {
  public_id: string | null; full_name: string | null; avatar_url: string | null;
  alias: string | null; display_as_alias: boolean | null; icon: string | null;
}
export interface CallToActionRow {
  id: string; guild_id: string; created_by: string | null; title: string;
  description: string; type: string; event_date: string; target_count: number;
  event_id: string | null; launched_at: string | null; created_at: string;
  profiles: ProfileRow | null;
  call_to_action_interests: { user_id: string }[] | null;
}

const mapAuthor = (p: ProfileRow | null): CtaAuthor => ({
  publicId: p?.public_id ?? null, fullName: p?.full_name ?? null,
  avatarUrl: p?.avatar_url ?? null, alias: p?.alias ?? null,
  displayAsAlias: p?.display_as_alias ?? false, icon: p?.icon ?? null,
});

export const buildCallToAction = (
  row: CallToActionRow, currentUserId: string | null, canManage: boolean,
): CallToAction => {
  const interests = row.call_to_action_interests ?? [];
  return {
    id: row.id, guildId: row.guild_id, createdBy: row.created_by,
    title: row.title, description: row.description, type: row.type as ActivityType,
    eventDate: row.event_date, targetCount: row.target_count,
    interestedCount: interests.length,
    interested: !!currentUserId && interests.some((i) => i.user_id === currentUserId),
    eventId: row.event_id, launchedAt: row.launched_at, createdAt: row.created_at,
    author: mapAuthor(row.profiles), canManage,
  };
};
```

- [ ] **Step 2: `getCallToActions.ts`** — mirror `getGuildAnnouncements.ts`: `resolveCaller`, `isManager`, `canManage`, list query ordered by `launched_at nulls first, created_at desc`, plus `getCallToActionById`. `canCreate` = caller is a guild member (userId non-null AND has membership row). Re-use the membership lookup from `resolveCaller` (returns role only for members) — treat "role !== null OR membership exists" as member. Implement `resolveCaller` to also return `isMember: boolean`.

```ts
import { createClient } from '@/shared/api/supabase/server';
import type { CallToAction, CallToActionsResult } from '../model/types';
import { CTA_SELECT, buildCallToAction, type CallToActionRow } from './mapCallToActionRow';

const MANAGER_ROLES = ['ADMIN', 'OWNER'];

export const resolveCaller = async (
  supabase: Awaited<ReturnType<typeof createClient>>, guildId: string,
): Promise<{ userId: string | null; role: string | null; isMember: boolean }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null, isMember: false };
  const { data: membership } = await supabase
    .from('guild_members').select('role')
    .eq('guild_id', guildId).eq('user_id', user.id).maybeSingle();
  return { userId: user.id, role: membership?.role ?? null, isMember: !!membership };
};

const canManage = (createdBy: string | null, userId: string | null, role: string | null) =>
  (!!userId && createdBy === userId) || MANAGER_ROLES.includes(role ?? '');

export const getCallToActions = async (guildId: string): Promise<CallToActionsResult> => {
  const supabase = await createClient();
  const { userId, role, isMember } = await resolveCaller(supabase, guildId);
  const { data, error } = await supabase
    .from('call_to_actions').select(CTA_SELECT).eq('guild_id', guildId)
    .order('launched_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  const callToActions = ((data ?? []) as unknown as CallToActionRow[])
    .map((row) => buildCallToAction(row, userId, canManage(row.created_by, userId, role)));
  return { callToActions, canCreate: isMember };
};

export const getCallToActionById = async (id: string): Promise<CallToAction> => {
  const supabase = await createClient();
  const { data: head, error: headErr } = await supabase
    .from('call_to_actions').select('guild_id').eq('id', id).single();
  if (headErr) throw headErr;
  const { userId, role } = await resolveCaller(supabase, head.guild_id);
  const { data, error } = await supabase
    .from('call_to_actions').select(CTA_SELECT).eq('id', id).single();
  if (error) throw error;
  const row = data as unknown as CallToActionRow;
  return buildCallToAction(row, userId, canManage(row.created_by, userId, role));
};
```

- [ ] **Step 3: `createCallToAction.ts`** — validate (title non-empty ≤120, targetCount ≥1, date/time present), call RPC `create_call_to_action`, then return `getCallToActionById(newId)`.

```ts
import { createClient } from '@/shared/api/supabase/server';
import type { CallToAction, CreateCallToActionInput } from '../model/types';
import { getCallToActionById } from './getCallToActions';

export class InvalidCallToActionError extends Error {}

export const createCallToAction = async (
  guildId: string, input: CreateCallToActionInput,
): Promise<CallToAction> => {
  const supabase = await createClient();
  const title = input.title.trim();
  if (!title) throw new InvalidCallToActionError('Title is empty');
  if (title.length > 120) throw new InvalidCallToActionError('Title is too long');
  if (!Number.isInteger(input.targetCount) || input.targetCount < 1)
    throw new InvalidCallToActionError('Invalid target count');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time))
    throw new InvalidCallToActionError('Invalid date/time');

  const { data, error } = await supabase.rpc('create_call_to_action', {
    p_guild_id: guildId, p_title: title, p_description: input.description.trim(),
    p_type: input.type, p_event_date: `${input.date}T${input.time}:00`,
    p_target_count: input.targetCount,
  });
  if (error) throw error;
  return getCallToActionById(data as string);
};
```

- [ ] **Step 4: `toggleInterest.ts`** — call RPC `toggle_call_to_action_interest`, return refreshed CTA via `getCallToActionById`.

```ts
import { createClient } from '@/shared/api/supabase/server';
import type { CallToAction } from '../model/types';
import { getCallToActionById } from './getCallToActions';

export const toggleInterest = async (ctaId: string): Promise<CallToAction> => {
  const supabase = await createClient();
  const { error } = await supabase.rpc('toggle_call_to_action_interest', { p_cta_id: ctaId });
  if (error) throw error;
  return getCallToActionById(ctaId);
};
```

- [ ] **Step 5: `deleteCallToAction.ts`** — delete by id (RLS enforces author/admin).

```ts
import { createClient } from '@/shared/api/supabase/server';

export const deleteCallToAction = async (id: string): Promise<void> => {
  const supabase = await createClient();
  const { error } = await supabase.from('call_to_actions').delete().eq('id', id);
  if (error) throw error;
};
```

---

## Task 5: Entity RTK Query API + index

**Files:** Create `src/entities/call-to-action/api/callToActionApi.ts`, `src/entities/call-to-action/index.ts`.

- [ ] **Step 1: `callToActionApi.ts`** — inject endpoints. `toggleInterest` invalidates both `CallToAction` list tag AND `Event` (calendar refresh on launch).

```ts
import { baseApi } from '@/shared/api/baseApi';
import type {
  CallToAction, CallToActionsResult, CreateCallToActionInput,
} from '../model/types';

const listTag = (guildId: string) => [{ type: 'CallToAction' as const, id: `LIST-${guildId}` }];

const replaceInList = (guildId: string, updated: CallToAction) =>
  callToActionApi.util.updateQueryData('getCallToActions', guildId, (draft) => {
    const idx = draft.callToActions.findIndex((c) => c.id === updated.id);
    if (idx !== -1) draft.callToActions[idx] = updated;
  });

export const callToActionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCallToActions: builder.query<CallToActionsResult, string>({
      query: (guildId) => `guilds/${guildId}/call-to-actions`,
      providesTags: (_, __, guildId) => listTag(guildId),
    }),
    createCallToAction: builder.mutation<CallToAction, { guildId: string; input: CreateCallToActionInput }>({
      query: ({ guildId, input }) => ({
        url: `guilds/${guildId}/call-to-actions`, method: 'POST', body: input,
      }),
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),
    toggleCallToActionInterest: builder.mutation<CallToAction, { guildId: string; ctaId: string }>({
      query: ({ guildId, ctaId }) => ({
        url: `guilds/${guildId}/call-to-actions/${ctaId}/interest`, method: 'POST',
      }),
      // A launch may create a calendar event → refresh events too.
      invalidatesTags: () => ['Event'],
      async onQueryStarted({ guildId }, { dispatch, queryFulfilled }) {
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(replaceInList(guildId, updated));
        } catch { /* surfaced via toast */ }
      },
    }),
    deleteCallToAction: builder.mutation<{ deleted: boolean }, { guildId: string; ctaId: string }>({
      query: ({ guildId, ctaId }) => ({
        url: `guilds/${guildId}/call-to-actions/${ctaId}`, method: 'DELETE',
      }),
      async onQueryStarted({ guildId, ctaId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          callToActionApi.util.updateQueryData('getCallToActions', guildId, (draft) => {
            const idx = draft.callToActions.findIndex((c) => c.id === ctaId);
            if (idx !== -1) draft.callToActions.splice(idx, 1);
          }),
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCallToActionsQuery, useCreateCallToActionMutation,
  useToggleCallToActionInterestMutation, useDeleteCallToActionMutation,
} = callToActionApi;
```

- [ ] **Step 2: `index.ts`** — export types + hooks (and `CallToActionCard` after Task 6).

```ts
export type {
  CallToAction, CallToActionsResult, CreateCallToActionInput, CtaAuthor,
} from './model/types';
export {
  useGetCallToActionsQuery, useCreateCallToActionMutation,
  useToggleCallToActionInterestMutation, useDeleteCallToActionMutation,
} from './api/callToActionApi';
export { CallToActionCard } from './ui/CallToActionCard';
```

- [ ] **Step 3: Commit** `feat(cta): entity data layer and rtk query api`.

---

## Task 6: CallToActionCard (entity UI)

**Files:** Create `src/entities/call-to-action/ui/CallToActionCard.tsx` + `.module.css`.

Card shows: activity-type icon (`typeIcons` from `entities/event`), title, description, formatted date/time (dayjs), progress `interestedCount / targetCount`, author. Footer: a "Want"/"Wanted" toggle button (calls `onToggleInterest`) when not launched; a "Launched" badge + link to `/events/{eventId}` when launched; a delete button when `canManage`. Button disabled while a toggle is in flight.

- [ ] **Step 1:** Implement the card. Props:

```ts
interface CallToActionCardProps {
  cta: CallToAction;
  onToggleInterest: (ctaId: string) => void;
  onDelete?: (ctaId: string) => void;
  isToggling?: boolean;
}
```

Use `useTranslations('CallToAction')`, `typeIcons` from `@/entities/event`, `dayjs` from `@/shared/lib/dayjs`, `Button` from `@/shared/ui/Button`, `Link` from `next/link`. Style strictly via the CSS module (glassmorphism per design-system). No inline styles.

- [ ] **Step 2:** Write `.module.css` mirroring `EventCard.module.css` look (card, iconWrapper, content, header, title, meta, progress, footer, launchedBadge).

- [ ] **Step 3: Commit** `feat(cta): CallToActionCard`.

---

## Task 7: Create form schema (+ test)

**Files:** Create `src/features/call-to-action/model/schema.ts`, `schema.test.ts`.

- [ ] **Step 1: Write failing test** `schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createCtaFormSchema } from './schema';

const msgs = { titleRequired: 'tr', dateRequired: 'dr', timeRequired: 'tir', targetMin: 'tm' };

describe('createCtaFormSchema', () => {
  const schema = createCtaFormSchema(msgs);
  it('accepts a valid payload', () => {
    expect(schema.safeParse({
      title: 'Raid', date: '2026-07-01', time: '19:00',
      type: 'raid', description: '', targetCount: 5,
    }).success).toBe(true);
  });
  it('rejects empty title', () => {
    const r = schema.safeParse({ title: '', date: '2026-07-01', time: '19:00', type: 'raid', description: '', targetCount: 5 });
    expect(r.success).toBe(false);
  });
  it('rejects targetCount below 1', () => {
    const r = schema.safeParse({ title: 'x', date: '2026-07-01', time: '19:00', type: 'raid', description: '', targetCount: 0 });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `pnpm test:run src/features/call-to-action/model/schema.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `schema.ts`**:

```ts
import { z } from 'zod';

export type CtaFormMessages = {
  titleRequired: string; dateRequired: string; timeRequired: string; targetMin: string;
};

export const createCtaFormSchema = (m: CtaFormMessages) =>
  z.object({
    title: z.string().min(1, m.titleRequired).max(120),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, m.dateRequired),
    time: z.string().regex(/^\d{2}:\d{2}$/, m.timeRequired),
    type: z.enum(['raid', 'game', 'meeting', 'other', 'dungeon', 'party', 'sport', 'dnd', 'boardgame']),
    description: z.string(),
    targetCount: z.coerce.number().int().min(1, m.targetMin),
  });

export type CtaFormData = z.infer<ReturnType<typeof createCtaFormSchema>>;
```

- [ ] **Step 4: Run** the test → PASS.
- [ ] **Step 5: Commit** `test(cta): form schema`.

---

## Task 8: CallToActionForm + CreateCallToActionModal

**Files:** Create `src/features/call-to-action/ui/CallToActionForm.tsx` + `.module.css`, `ui/CreateCallToActionModal.tsx` + `.module.css`, `index.ts`.

- [ ] **Step 1: `CallToActionForm.tsx`** — mirror `EventForm.tsx` (title, date, time, type Select, description Textarea) PLUS a numeric `targetCount` `Input` (`type="number"`, min 1). No recurrence, no member selection. Validate with `createCtaFormSchema`. Uses `useTranslations('CallToAction')` for its own labels and `Common.eventTypes.*` for type option labels. Exposes `formId` + `hideActions` like `EventForm`. `onSubmit(data: CtaFormData)`.

- [ ] **Step 2: `CreateCallToActionModal.tsx`** — `Modal` from `@/shared/ui/Modal` (same as `AnnouncementModal`) wrapping `CallToActionForm`; on submit calls `useCreateCallToActionMutation`, toast on error, close on success. Props: `{ open, onClose, guildId }`. Reset form via the render-phase `prevSession` pattern from `AnnouncementModal`.

- [ ] **Step 3: `index.ts`**:

```ts
export { CreateCallToActionModal } from './ui/CreateCallToActionModal';
```

- [ ] **Step 4: Commit** `feat(cta): create form and modal`.

---

## Task 9: Widget call-to-action-board

**Files:** Create `src/widgets/call-to-action-board/ui/CallToActionBoard.tsx` + `.module.css`, `ui/CallToActionSkeleton.tsx`, `index.ts`.

- [ ] **Step 1: `CallToActionBoard.tsx`** — mirror `GuildAnnouncements.tsx`: `Panel`, header with `GuildSelect` (`useGuildSelection` from `@/features/select-guild`) + "New action" `Button` (visible when `canCreate`), feed of `CallToActionCard` (from `@/entities/call-to-action`), `CreateCallToActionModal` (from `@/features/call-to-action`). Wire `useToggleCallToActionInterestMutation` and `useDeleteCallToActionMutation`; track the toggling ctaId in local state to pass `isToggling`. On launch (response `eventId` set) show a success toast `t('launchedToast')`.

Props:

```ts
interface CallToActionBoardProps {
  guilds: Guild[];
  userId?: string;
  initialGuildId?: string;
}
```

- [ ] **Step 2: `CallToActionSkeleton.tsx`** — copy `AnnouncementsSkeleton` structure.
- [ ] **Step 3: `.module.css`** — copy `GuildAnnouncements.module.css` (panel/header/feed/empty/skeleton).
- [ ] **Step 4: `index.ts`**:

```ts
export { CallToActionBoard } from './ui/CallToActionBoard';
```

- [ ] **Step 5: Commit** `feat(cta): call-to-action-board widget`.

---

## Task 10: Route handlers

**Files:** Create the three route files under `src/app/api/guilds/[id]/call-to-actions/`.

- [ ] **Step 1: `route.ts`** (GET list, POST create). Mirror announcements route, but POST gates on **guild membership** (any member), not ADMIN/OWNER — use `requireGuildRole(auth.supabase, id, auth.user.id, ['MEMBER','ADMIN','OWNER'])`.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCallToActions } from '@/entities/call-to-action/api/getCallToActions';
import { createCallToAction, InvalidCallToActionError } from '@/entities/call-to-action/api/createCallToAction';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await getCallToActions(id));
  } catch {
    return NextResponse.json({ error: 'Failed to fetch call to actions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const forbidden = await requireGuildRole(auth.supabase, id, auth.user.id, ['MEMBER', 'ADMIN', 'OWNER']);
    if (forbidden) return forbidden;
    const body = await request.json();
    const cta = await createCallToAction(id, {
      title: String(body.title ?? ''), description: String(body.description ?? ''),
      type: body.type, date: String(body.date ?? ''), time: String(body.time ?? ''),
      targetCount: Number(body.targetCount),
    });
    return NextResponse.json(cta, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidCallToActionError)
      return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: 'Failed to create call to action' }, { status: 500 });
  }
}
```

- [ ] **Step 2: `[ctaId]/route.ts`** (DELETE).

```ts
import { NextRequest, NextResponse } from 'next/server';
import { deleteCallToAction } from '@/entities/call-to-action/api/deleteCallToAction';
import { requireUser } from '@/shared/api/guildAuth';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; ctaId: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { ctaId } = await params;
    await deleteCallToAction(ctaId); // RLS enforces author/admin
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete call to action' }, { status: 500 });
  }
}
```

- [ ] **Step 3: `[ctaId]/interest/route.ts`** (POST toggle).

```ts
import { NextRequest, NextResponse } from 'next/server';
import { toggleInterest } from '@/entities/call-to-action/api/toggleInterest';
import { requireUser } from '@/shared/api/guildAuth';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string; ctaId: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { ctaId } = await params;
    return NextResponse.json(await toggleInterest(ctaId));
  } catch {
    return NextResponse.json({ error: 'Failed to toggle interest' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit** `feat(cta): api route handlers`.

---

## Task 11: Page + sidebar

**Files:** Create `src/app/call-to-action/page.tsx` + `CallToActionPage.module.css`; modify `src/widgets/sidebar/model/navItems.ts`.

- [ ] **Step 1: `page.tsx`** — mirror `announcements/page.tsx` but render only `CallToActionBoard` (no `UpcomingEventsStrip`).

```tsx
import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { getUser } from '@/entities/user/api/getUser';
import { CallToActionBoard } from '@/widgets/call-to-action-board';
import styles from './CallToActionPage.module.css';

export default async function CallToActionPage() {
  const user = await getUser();
  const guilds = await getMyGuilds(user?.id);
  if (guilds.length === 0) redirect('/guilds');
  const lastActiveGuildId = user?.profile?.lastActiveGuildId;
  const defaultGuildId =
    lastActiveGuildId && guilds.some((g) => g.id === lastActiveGuildId)
      ? lastActiveGuildId : guilds[0].id;
  return (
    <main className={styles.main}>
      <CallToActionBoard guilds={guilds} userId={user?.id} initialGuildId={defaultGuildId} />
    </main>
  );
}
```

- [ ] **Step 2: `CallToActionPage.module.css`** — copy `AnnouncementsPage.module.css`.
- [ ] **Step 3: `navItems.ts`** — add item under announcements, e.g.:

```ts
import { Users, Calendar, MessagesSquare, Megaphone, Swords, type LucideIcon } from 'lucide-react';
// ...
  { href: '/announcements', icon: Megaphone, labelKey: 'Common.announcements' },
  { href: '/call-to-action', icon: Swords, labelKey: 'Common.callToAction' },
  { href: '/guilds', icon: Users, labelKey: 'Guild.title' },
```

- [ ] **Step 4: Commit** `feat(cta): page and sidebar nav`.

---

## Task 12: i18n

**Files:** Modify `messages/en.json`, `messages/ru.json`, `src/app/layout.tsx`.

- [ ] **Step 1:** Add `Common.callToAction` ("Call to Action" / "Сбор") next to `announcements` in both files.
- [ ] **Step 2:** Add a `CallToAction` namespace to both files with keys used by the form/modal/card/widget:

```jsonc
"CallToAction": {
  "newAction": "New action",
  "createTitle": "New call to action",
  "titleLabel": "Title",
  "titlePlaceholder": "What are we rallying for?",
  "dateLabel": "Date",
  "timeLabel": "Time",
  "typeLabel": "Type",
  "descriptionPlaceholder": "Describe the activity…",
  "targetLabel": "Participants to launch",
  "targetPlaceholder": "e.g. 5",
  "wantButton": "I'm in",
  "wantedButton": "I'm in ✓",
  "progress": "{count} / {target}",
  "launchedBadge": "Launched",
  "openEvent": "Open event",
  "deleteLabel": "Delete",
  "confirmDelete": "Delete this call to action?",
  "empty": "No calls to action yet.",
  "publishButton": "Publish",
  "launchedToast": "Target reached — event created in the calendar!",
  "createError": "Failed to publish call to action",
  "toggleError": "Failed to update your participation",
  "deleteError": "Failed to delete call to action",
  "validation": {
    "titleRequired": "Title is required",
    "dateRequired": "Date is required",
    "timeRequired": "Time is required",
    "targetMin": "At least 1 participant"
  }
}
```

(Russian translations: `newAction`="Новый сбор", `wantButton`="Я в деле", `launchedBadge`="Запущено", etc.)

- [ ] **Step 3:** Add `'CallToAction'` to `requiredNamespaces` in `src/app/layout.tsx` (else `MISSING_MESSAGE`).
- [ ] **Step 4: Commit** `feat(cta): i18n namespace and nav label`.

---

## Task 13: Component tests

**Files:** Create `src/entities/call-to-action/ui/CallToActionCard.test.tsx`, `src/widgets/call-to-action-board/ui/CallToActionBoard.test.tsx`.

- [ ] **Step 1:** Card test — render with a not-launched CTA, assert progress text and that clicking the want button calls `onToggleInterest`; render a launched CTA, assert the "Launched" badge + event link appear and no want button. Mirror `EventCard.test.tsx` setup (NextIntl test provider).
- [ ] **Step 2:** Board test — mock `useGetCallToActionsQuery` to return `canCreate: true` and an empty list; assert the "New action" button renders and the empty state shows. Mirror `Sidebar.test.tsx` / announcements widget test mocking patterns.
- [ ] **Step 3: Run** `pnpm test:run` for both → PASS.
- [ ] **Step 4: Commit** `test(cta): card and board`.

---

## Task 14: Final verification

- [ ] **Step 1:** `pnpm test:run` — all pass.
- [ ] **Step 2:** `pnpm lint` — clean (ignore the 2 known baseline `insignificant-slice` fsd warnings per project memory).
- [ ] **Step 3:** `npx tsc --noEmit` — no NEW errors (3 pre-existing baseline errors per project memory are acceptable).
- [ ] **Step 4:** `pnpm build` — succeeds.
- [ ] **Step 5:** `get_advisors` (security) on Supabase — no new warnings for the new tables/functions.
- [ ] **Step 6:** Update `src/CLAUDE.md` Database Schema table with `call_to_actions` + `call_to_action_interests` rows and the two RPCs (CLAUDE.md hygiene rule).
- [ ] **Step 7: Commit** `docs(cta): update schema docs`.

---

## Self-Review Notes

- **Spec coverage:** any-member create (Task 1 RLS + Task 10 POST gate), auto-launch at threshold (Task 1 `_maybe_launch_cta`), card stays "Launched" with link (Task 6), date/time at creation (Task 7/8 form), creator counts as first interest (Task 1 `create_call_to_action`), want toggle cancelable until launch (Task 1 `toggle_*`), `Events` cache invalidation (Task 5), namespace registered (Task 12), no `UpcomingEventsStrip` (Task 11). All covered.
- **FSD:** entity imported by feature/widget (ok); widget composes feature + entity (ok); no feature→feature import (form is dedicated, not imported from create-event). `typeIcons`/`ACTIVITY_TYPES` come from `entities/event` (entity import — allowed).
- **Type consistency:** hook names (`useToggleCallToActionInterestMutation`), RPC names (`create_call_to_action`, `toggle_call_to_action_interest`, `_maybe_launch_cta`), and field names (`interestedCount`, `interested`, `eventId`, `targetCount`) are used consistently across tasks.
- **Open risk:** `has_guild_role` signature — verify against existing announcements policies before applying Task 1 Step 2.
