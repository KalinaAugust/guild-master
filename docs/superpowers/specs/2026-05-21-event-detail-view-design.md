# Event Detail View — Design Spec

**Date:** 2026-05-21  
**Branch:** event-details  
**Status:** Approved

## Overview

Full-screen overlay that opens when clicking on an event card on the day page (`/day/[date]`). Displays event info and a list of invited participants with their confirmation statuses. The current user can confirm or decline their own invitation. An "Edit" button opens the existing EventWizard.

## Database

New table `event_participants`:

| column | type | notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `event_id` | uuid FK → events | |
| `user_id` | uuid FK → profiles | |
| `status` | text | `pending` / `confirmed` / `declined` |
| `created_at` | timestamptz | `now()` |

**RLS policies:**
- Guild members can read participants of events in their guild
- A participant can update only their own `status`
- Only the event creator can insert/delete rows

## Architecture (FSD)

### New feature slice: `src/features/event-detail/`

```
src/features/event-detail/
  api/
    getEventParticipants.ts       # fetch participants + profiles by event_id
    updateParticipantStatus.ts    # PATCH status for current user
  model/
    types.ts                      # EventParticipant { id, event_id, user_id, status, profile: { full_name, avatar_url } }
    slice.ts                      # participants[], loadingParticipants: boolean
  ui/
    EventDetailView.tsx           # full-screen overlay
    EventDetailView.module.css
    ParticipantItem.tsx           # single participant row
  index.ts
```

### UIState extensions (`entities/calendar/model/slice.ts`)

```ts
// Added to UIState:
isEventDetailOpen: boolean
viewingEvent: ActivityEvent | null

// New actions:
openEventDetail(event: ActivityEvent)
closeEventDetail()
```

### EventWizard updates (`features/create-event`)

Replace the "Invited" stub in the right column with a real guild member picker:
- Shows all guild members as checkboxes
- On wizard save: sync `event_participants` (insert new / delete removed, status = `pending`)

## UI Layout

Full-screen overlay identical in structure to EventWizard (Radix DialogPrimitive, same CSS approach, `z-index: 1100`).

**Header:** X close button (left) · event title centered  
**Body (2 columns):**
- **Left — event info:** type badge, date + time, description, creator name
- **Right — participants:** list of `ParticipantItem` rows; empty state hint if no participants

**ParticipantItem row:**
- Avatar (initials fallback) + full name + status label
- If `user_id === currentUser.id` AND `status === 'pending'`: show "Приду" + "✕" buttons
- Confirmed: green label; Declined: dimmed row + red label; Pending (others): orange label

**Footer:** "Закрыть" (secondary) · "Редактировать" (primary, dispatches `openEventModal(event)`)

**Trigger:** `EventCard` gets `onClick` prop → `DayEventsList` dispatches `openEventDetail(event)`.  
`DayPage` renders `<EventDetailView />` alongside `<EventWizard />`.

## Data Flow

1. User clicks EventCard → `openEventDetail(event)` dispatched
2. `EventDetailView` mounts → dispatches `fetchParticipantsThunk(event.id)`
3. Thunk calls `getEventParticipants` → joins `event_participants` + `profiles`
4. Participants stored in `features/event-detail` Redux slice
5. User clicks "Приду" / "✕" → `updateParticipantStatusThunk({ id, status })` → optimistic update + toast

## Edge Cases

- **No participants** → right column shows hint: "Участников добавляет создатель при редактировании"
- **Current user not invited** → confirm/decline buttons not shown
- **Past event** → confirm/decline hidden; "Редактировать" hidden (same `isPastDate` logic as DayEventsList)
- **Loading participants** → skeleton in right column
- **Fetch error** → toast error

## Tests

- `EventDetailView` renders event title, date, time, description
- `ParticipantItem` shows confirm/decline only for current user with `pending` status
- `ParticipantItem` does not show confirm/decline for other users
- `updateParticipantStatus` API unit test
- Redux slice: `openEventDetail` sets `viewingEvent`; `closeEventDetail` clears it
- Redux slice: `fetchParticipantsThunk` fulfilled sets `participants[]`
