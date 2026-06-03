# Event Participation Request — Design

**Date:** 2026-06-03
**Status:** Approved

## Goal

Let a guild member apply to participate in an event they were not invited to.
On the event detail page, above the participant list, an eligible member sees an
**"Apply to participate"** button. The event creator reviews incoming applications
and approves or declines them.

## Approach

Mirror the existing guild join-request pattern (`guild_join_requests`) with a new
`event_join_requests` table. This keeps the security-critical `event_participants`
table untouched — its RLS only lets the creator INSERT, and only the row owner
UPDATE. Reusing the proven request → resolve → notify template avoids new RLS on
participants, leaves participant-count logic and `ParticipantItem` tests in place,
and keeps the change copy-adapt rather than invent.

## 1. Database (migration)

New table `event_join_requests`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `event_id` | uuid | FK → `events.id` |
| `user_id` | uuid | FK → `profiles.id` |
| `status` | text | `pending` \| `approved` \| `declined`, default `pending` |
| `created_at` | timestamptz | default `now()` |

RLS policies:
- **INSERT** — authenticated, for self (`user_id = auth.uid()`), and the user is a
  member of the event's guild (`EXISTS` join `events` → `guild_members`).
- **SELECT** — the event creator (`events.created_by = auth.uid()`) sees requests
  for their events; the applicant sees their own (`user_id = auth.uid()`).
- **UPDATE** — the event creator, to resolve (approve/decline).

## 2. Transport (route handlers)

- `POST /api/events/[id]/join-requests` — submit application.
  `requireUser`; validate: not the creator, not already a participant, no existing
  `pending` request for this event/user → insert request. Notify the creator via
  admin client (`type: 'event_join_request'`, `entity_type: 'event'`,
  `entity_id: eventId`).
- `GET /api/events/[id]/join-requests` — list `pending` requests with applicant
  profile (`full_name`, `avatar_url`). Creator only (inline `created_by` check).
- `PATCH /api/events/[id]/join-requests/[requestId]` — body `{ action: 'approve' | 'decline' }`.
  Creator only. On `approve`: insert into `event_participants`
  `{ event_id, user_id, status: 'confirmed' }` (duplicate-key treated as success),
  then mark request `approved`. On `decline`: mark request `declined`. Notify the
  applicant (`event_join_request_approved` / `event_join_request_declined`).

Authorization for GET/PATCH is an inline `event.created_by === user.id` check
(no `guildAuth` helper covers event ownership; keep it local to these handlers).

## 3. Data for the UI

Extend the `getEventParticipants` response with two viewer-scoped fields:
- `viewerIsGuildMember: boolean` — current user belongs to the event's guild.
- `viewerHasPendingRequest: boolean` — current user has a `pending` request.

Creator status is already derived client-side (`event.createdBy === currentUserId`).
One query then drives the apply-button visibility.

## 4. RTK Query (`features/event-detail/api/detailApi.ts`)

Add to `detailApi`:
- `useSubmitEventJoinRequestMutation` — `POST .../join-requests`.
- `useGetEventJoinRequestsQuery` — `GET .../join-requests`.
- `useResolveEventJoinRequestMutation` — `PATCH .../join-requests/[requestId]`.

New tag `EventJoinRequest` (id `LIST-<eventId>`). Submit invalidates the request
list and `Participant LIST-<eventId>`; resolve invalidates both as well so the
approved member appears in the participant list.

## 5. UI (`EventDetailContent`, right column, above the participant list)

- **Eligible member** (guild member, not a participant, no pending request, not the
  creator): show the **"Apply to participate"** button above the participant list.
  On success: toast + switch to a "request sent" state. Skip the join-request list
  query for this viewer.
- **Creator**: a "Requests" section (pending on top) listing applicants with
  approve/decline buttons, the participant list below. New local component
  `EventJoinRequestItem` mirroring `JoinRequestItem` (cross-feature import is
  forbidden, so it is a local copy in `features/event-detail/ui`).

i18n keys added under the `EventDetail` namespace (apply button, request-sent
badge, requests heading, empty state, success/error toasts). Add the new
notification types to `NOTIFICATION_TYPE_CONFIG` with icons and labels.

## Defaults

- **Decline** keeps the request row and sets `status = 'declined'` (mirrors guilds;
  submit only checks for a `pending` request, so a declined user can re-apply).
- Notification target on submit is `event.created_by`.

## Out of scope

- Editing/withdrawing a submitted request.
- Bulk approve/decline.
- Applications by non-guild-members.
