# Call to Action — Design Spec

Date: 2026-06-16
Status: Approved

## Summary

A new **Call to Action** page lets any guild member post a rally ("call") for an
activity, similar in look to Announcements. Instead of selecting participants up
front (as in event creation), the creator sets a **target participant count**.
Members who want to join press a **"Want" ("Хочу")** button on the card. When the
number of interested members reaches the target, an event is **automatically
created in the calendar** with all interested members added as participants. A
Call to Action is always one-off — no recurrence.

## Decisions (from brainstorming)

1. **Who can create:** any guild member (not restricted to ADMIN/OWNER, unlike
   announcements). The "New action" button is visible to all members.
2. **Launch trigger:** automatic when interested count reaches `target_count`.
3. **Card after launch:** stays in the feed marked "Launched", linking to the
   created calendar event.
4. **Event date/time:** set at CTA creation (reusing the event form fields);
   carried over verbatim into the created event.
5. **Creator counts as the first "Want":** counter starts at 1; the creator is
   included as a participant of the launched event.
6. **"Want" is a toggle:** a member may cancel their "Want" until the CTA is
   launched. After launch it is locked.

## Reuse Approach

FSD forbids cross-imports between features, so the new create-CTA feature cannot
import `EventForm` from `features/create-event`. We build a **dedicated form** in
the new feature that visually mirrors `EventForm`, reusing `shared/ui`
primitives (Input, Select) and the activity-type config from `entities/event`
(entities may be imported by features). The existing event feature is left
untouched (strict scope — no refactor of working code).

## Architecture (FSD)

### `entities/call-to-action`
- `model/types.ts` — `CallToAction`, `CallToActionInterest`, input/result types.
- `api/callToActionApi.ts` — RTK Query endpoints injected on `baseApi`:
  - `useGetCallToActionsQuery(guildId)` — feed + `canCreate` flag + viewer's
    interest state per card.
  - `useCreateCallToActionMutation`.
  - `useToggleInterestMutation` — calls the RPC; invalidates `Events` tag so the
    calendar/upcoming strip refresh when a launch happens.
  - `useDeleteCallToActionMutation`.
- `ui/CallToActionCard` — presentational card (entity-level, mirrors
  `entities/event/ui/EventCard`).

### `features/call-to-action`
- `ui/CreateCallToActionModal` — `WizardDialog` + the dedicated form.
- `model/schema.ts` — zod schema: `title`, `date`, `time`, `type`,
  `description`, `targetCount` (int ≥ 1).
- "Want" button logic wired onto the card (toggle interest via the entity
  mutation).

### `widgets/call-to-action-board`
- Composes the page block: `GuildSelect` + "New action" button + feed of cards +
  the create modal. Mirror of `widgets/guild-announcements`.

### `app/call-to-action/page.tsx`
- Server page mirroring `app/announcements/page.tsx`: resolves user + guilds,
  redirects to `/guilds` if none, picks the default guild, renders the board
  widget. Does **not** render `UpcomingEventsStrip` — the page shows only the
  Call to Action board.

### `widgets/sidebar/model/navItems.ts`
- New nav item placed directly under "Announcements" (e.g. icon `Swords` or
  `Flame`, label key `Common.callToAction`).

## Data Model (Supabase)

Two new tables + one RPC. All tables use RLS.

### `call_to_actions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `guild_id` | uuid FK → guilds | |
| `created_by` | uuid FK → profiles | |
| `title` | text | |
| `description` | text | |
| `type` | text | event activity type enum value |
| `event_date` | timestamptz | planned date + time |
| `target_count` | int | ≥ 1 |
| `event_id` | uuid FK → events, nullable | set on launch |
| `launched_at` | timestamptz, nullable | set on launch |
| `created_at` | timestamptz default now() | |
| `updated_at` | timestamptz default now() | |

RLS: select for guild members; insert by any guild member; update/delete by the
author or ADMIN/OWNER (`has_guild_role`).

### `call_to_action_interests`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `cta_id` | uuid FK → call_to_actions, cascade | |
| `user_id` | uuid FK → profiles | |
| `created_at` | timestamptz default now() | |

Constraint: `unique(cta_id, user_id)`.
RLS: select for guild members; insert/delete own rows only.

### RPC `toggle_call_to_action_interest(cta_id uuid)`
Atomic operation (avoids launch race conditions):
1. If the caller already has an interest row and the CTA is **not** launched →
   delete it (cancel "Want").
2. Else (no row) → insert the interest row.
3. After an insert, if `count(interests) >= target_count` and `event_id IS NULL`:
   - Insert a row into `events` using the CTA's `title`, `description`, `type`,
     `event_date`, `guild_id`, `created_by = call_to_actions.created_by`.
   - Copy every interested `user_id` into `event_participants` with
     `status = 'confirmed'`.
   - Set `call_to_actions.event_id` and `launched_at`.
4. Deleting an interest is rejected once the CTA is launched.

Returns the updated CTA state (interest count, viewer interest flag, launched
state, event_id).

On CTA creation, the creator's interest row is inserted immediately (counter
starts at 1).

## User Flows

1. **Create:** any member → "New action" → modal (event-style form without
   recurrence and without member selection, plus a target-count field) → CTA
   inserted + creator's interest auto-added (count = 1).
2. **Want / un-want:** toggle via RPC; can be removed until launch.
3. **Launch:** reaching the target makes the RPC create the calendar event with
   all interested members as participants; the card flips to "Launched" with a
   link to the event; the `Events` cache tag is invalidated so the calendar and
   upcoming strip refresh.
4. **Card content:** title, description, type, date/time, progress `N / target`,
   and the "Want"/"Unwant" button — replaced by "Launched" + event link after
   launch.

## i18n

New namespace `CallToAction` (plus a `Common.callToAction` label for the sidebar).
The namespace must be added to `requiredNamespaces` in `layout.tsx`, otherwise
client components throw `MISSING_MESSAGE`.

## Testing

Mirror existing patterns:
- Form zod schema unit tests (`features/call-to-action/model/schema.test.ts`).
- API/route handler tests covering the RPC toggle + launch behavior
  (threshold reached, un-want, locked after launch).
- `CallToActionCard` component tests (want / unwant / launched states).
- `call-to-action-board` widget test (guild select, create button visibility,
  empty state).

## Out of Scope

- Recurrence for Call to Action (always one-off, by design).
- Notifications on launch (can be a follow-up; reuse the notifications system).
- Editing a launched CTA.
