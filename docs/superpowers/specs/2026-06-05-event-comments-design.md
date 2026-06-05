# Event Comments — Design Spec

**Date:** 2026-06-05
**Status:** Approved (pending spec review)

## Goal

Add a comment thread to the event detail page. Comments let event members coordinate. Access is gated by participation status.

## Scope (v1)

- Flat list of comments (no threads/replies), chat-style order (oldest top, newest bottom).
- Author can edit and delete their own comment; "edited" marker shown when applicable.
- No realtime; freshness via polling (mirrors notifications).
- No reactions, no mentions, no attachments.

## Access Rules

| Action | Who |
|---|---|
| Read | Event creator **OR** participant with status `pending` / `confirmed` |
| Write (create) | Event creator **OR** participant with status `confirmed` |
| Edit / Delete | Comment author only (own comments) |

- `declined` participants and non-participants: no access, **Comments tab not rendered**.
- A `pending` participant sees the feed but, instead of the input, a prompt: "Confirm participation to write comments".

## Data Model

New table `event_comments`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `event_id` | uuid | FK → `events(id)` on delete cascade |
| `user_id` | uuid | FK → `profiles(id)` on delete cascade |
| `body` | text | not null, non-empty after trim, max 2000 chars |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

- "Edited" = `updated_at - created_at > 2 seconds`.
- Index on `(event_id, created_at)`.

## RLS Policies

RLS is the single access gate; route handlers rely on it (per `src/CLAUDE.md` authorization model).

- **SELECT:** `auth.uid() = (select created_by from events where id = event_id)`
  **OR** exists row in `event_participants` where `event_id = event_comments.event_id` and `user_id = auth.uid()` and `status in ('pending','confirmed')`.
- **INSERT:** `user_id = auth.uid()`
  **AND** (`auth.uid() = events.created_by` **OR** participant with `status = 'confirmed'`).
- **UPDATE:** `user_id = auth.uid()` (USING + WITH CHECK).
- **DELETE:** `user_id = auth.uid()`.

## Migration

- New directory `supabase/migrations/`.
- File `supabase/migrations/<timestamp>_event_comments.sql`: `create table`, index, `enable row level security`, the four policies above.
- Applied manually by the user in Supabase; the SQL file is the source of truth in the repo.

## Transport — Route Handlers

- `GET    /api/events/[id]/comments` — list; join `profiles(full_name, avatar_url)`; sort `created_at asc`.
- `POST   /api/events/[id]/comments` — `requireUser`; body `{ body }`; insert with `user_id = session user`.
- `PATCH  /api/events/[id]/comments/[commentId]` — `requireUser`; body `{ body }`; set `updated_at = now()`.
- `DELETE /api/events/[id]/comments/[commentId]` — `requireUser`.

Data functions mirror `getEventParticipants.ts` style (camelCase mapping, user-session Supabase client). Validation: trim body, reject empty, enforce 2000-char max → 400.

## FSD Placement

### `entities/comment` (data layer)

- `model/types.ts` — `EventComment { id, eventId, userId, body, createdAt, updatedAt, profile: { fullName, avatarUrl } }`.
- `api/commentApi.ts` — `baseApi.injectEndpoints`:
  - `getComments(eventId)` → query, `providesTags: [{ type: 'Comment', id: 'LIST' }]`.
  - `addComment({ eventId, body })`, `updateComment({ eventId, commentId, body })`, `deleteComment({ eventId, commentId })` → mutations, `invalidatesTags: [{ type: 'Comment', id: 'LIST' }]`.
- Register `Comment` in baseApi `tagTypes`.
- `index.ts` barrel exports types + hooks.

### `features/event-detail` (UI layer)

UI lives here (not a separate feature) because the Comments tab is composed alongside the existing participants list, and feature→feature imports are forbidden.

- `ui/EventTabs.tsx` — tab switcher "Participants / Comments" (local `useState`), wraps the right column content. Rendered only when viewer can read comments (creator or pending/confirmed participant); otherwise the participants list renders without tabs.
- `ui/CommentsTab.tsx` — owns `useGetCommentsQuery(eventId, { pollingInterval: 60_000, refetchOnFocus: true, skipPollingIfUnfocused: true })`; renders feed + input/prompt; autoscroll to bottom on own send.
- `ui/CommentItem.tsx` — avatar, name, relative time (dayjs), "edited" marker; for own comment: inline edit + delete (via shared `ConfirmModal`).
- `ui/CommentInput.tsx` — textarea + "Send" for creator/confirmed; otherwise the "confirm participation" prompt.
- `EventDetailContent.tsx` — compute `canReadComments` / `canWriteComments`; replace the bare participants block with `EventTabs`.

All strings via `next-intl` (`EventComments` namespace). CSS Modules only; no inline styles.

## UI Behavior

- Feed order: oldest top, newest bottom.
- Edit is inline (field replaces comment text); delete confirmed via `ConfirmModal`.
- No optimistic updates — after a mutation, tag invalidation triggers refetch (mirrors notifications).
- Loading/empty states mirror existing participants block (`skeleton`, `empty`).

## Testing

Mirror existing patterns; run `npm run test:run`.

- Unit per data function (`getComments`, `addComment`, `updateComment`, `deleteComment`) with `supabaseMock`.
- Route-handler tests for each method (success + error/validation).
- Component tests: `CommentsTab` (renders by permission: confirmed → input, pending → prompt), `CommentItem` (own → edit/delete visible; other → hidden; "edited" marker).

## Out of Scope

Threads/replies, reactions, mentions, attachments, realtime/WebSocket, typing indicators, pagination (load all for v1).
