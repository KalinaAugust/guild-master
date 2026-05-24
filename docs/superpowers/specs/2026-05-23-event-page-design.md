# Event Detail Page Design

**Date:** 2026-05-23  
**Branch:** convert-event-to-page  
**Goal:** Replace the fullscreen dialog (`EventDetailView`) with a dedicated page at `/events/[id]` so users can share event links.

---

## 1. Routing & Page Structure

New route: `src/app/events/[id]/page.tsx` (Server Component).

```
src/app/events/[id]/
  page.tsx              — Server Component (fetch + access check)
  EventPage.module.css  — page styles
```

The page does two things server-side:
1. Fetches the event by `id` from Supabase.
2. Checks whether the current user is a member of the event's guild.

- Event not found → `notFound()` (standard Next.js 404).
- No access → renders inline `AccessDenied` component.
- Access granted → renders `EventDetailContent` (client component) + `EventWizard`.

**Back navigation:** button "Back" links to `/day/[event.date]`.

**Clicking an event card** in `DayEventsList` → `router.push('/events/' + event.id)` (replaces the old `dispatch(openEventDetail(event))`).

---

## 2. Data Fetching

### New server helper
`src/entities/event/api/getEventById.ts`  
Queries Supabase for a single event by `id`. Returns `{ event: ActivityEvent; guildId: string } | null`. Used only in the Server Component.

### New route handler (GET added to existing file)
`src/app/api/events/[id]/route.ts` — adds `GET` alongside existing `PATCH` and `DELETE`:
```
GET /api/events/[id] → { event: ActivityEvent, guildId: string }
```

### New RTK Query endpoint
`getEventById` in `src/entities/event/api/eventApi.ts`:
```ts
getEventById: builder.query<{ event: ActivityEvent; guildId: string }, string>
```
Provides tag `{ type: 'Event', id }` so edit/delete mutations automatically invalidate and refetch.

The Server Component fetches directly via the Supabase helper (no RTK Query). The client component subscribes via RTK Query to stay in sync after mutations.

---

## 3. Access Control

**Server-side check in `page.tsx`:**
1. Call `getEventById(id)` — extract `guild_id`.
2. Query `guild_members` for the current user + `guild_id`.
3. If no membership record → render `AccessDenied`.

**`AccessDenied` component** (server-rendered, no interactivity):
- Accepts `ownerEmail: string` as a prop.
- Message: "You don't have access to this event."
- Button "Request access from guild leader" → `mailto:` link using `ownerEmail`.
- Button "Go home" → `/`.

`page.tsx` fetches `ownerEmail` when access is denied: after confirming no membership, it queries `profiles` via `guild.owner_id` and passes the email to `AccessDenied`.

**Out of scope:** invite/request system, notifications. The `mailto:` link is the MVP.

**What is NOT shown to unauthorized users:** event title, details, participants — nothing.

---

## 4. Component Architecture

### Removed
| Item | Reason |
|---|---|
| `features/event-detail/ui/EventDetailView.tsx` | Dialog replaced by page |
| Redux actions `openEventDetail` / `closeEventDetail` | No longer needed |
| Redux fields `isEventDetailOpen` / `viewingEvent` in `uiSlice` | No longer needed |
| `dispatch(openEventDetail(event))` in `DayEventsList` | Replaced by router.push |

### New / Modified
| Item | Change |
|---|---|
| `features/event-detail/ui/EventDetailContent.tsx` | New client component; accepts `eventId: string`; fetches via `useGetEventByIdQuery` |
| `widgets/day-events/ui/DayEventsList.tsx` | `handleViewEvent` → `router.push('/events/' + event.id)` |
| `entities/event/api/eventApi.ts` | Add `getEventById` endpoint |
| `entities/event/api/getEventById.ts` | New Supabase server helper |
| `app/api/events/[id]/route.ts` | Add `GET` handler |
| `app/events/[id]/page.tsx` | New Server Component page |

### `EventDetailContent` responsibilities
- Calls `useGetEventByIdQuery(eventId)` for live data.
- Renders event details (title, type, date/time, description).
- Renders participant list via `useGetParticipantsQuery`.
- Confirm/decline via `useUpdateParticipantStatusMutation`.
- Edit button → `dispatch(openEventModal(event))` (existing Redux action, unchanged).
- Delete button → `ConfirmModal` → `deleteEvent(id)` → `router.push('/day/' + event.date)`.
- Back link → `/day/[event.date]`.

The page renders:
```tsx
<EventDetailContent eventId={id} />
<EventWizard />
```

---

## Out of Scope
- Invite / access-request notification system (only `mailto:` for MVP)
- SEO meta tags for event pages
- Public (unauthenticated) event links — all routes remain behind auth
