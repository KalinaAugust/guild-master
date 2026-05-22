# RTK Query Integration Design

## Overview

Replace all `createAsyncThunk`-based data-fetching in Guild Master with RTK Query, using a single `createApi` instance extended via `injectEndpoints` per FSD slice. All Supabase queries move to Next.js route handlers; RTK Query uses `fetchBaseQuery` to call them.

## Architecture

### Base API (`shared/api/baseApi.ts`)

Single `createApi` instance with `fetchBaseQuery({ baseUrl: '/api' })`. All other files inject endpoints into this instance — never create a second `createApi`.

### Route Handlers (`src/app/api/`)

New Next.js route handlers. Each handler imports the existing server-side Supabase function (or its logic) and returns JSON. The `'use server'` directive is removed from api functions — they become plain server utilities called from route handlers.

| Route | Methods | Handler |
|---|---|---|
| `/api/events` | `GET ?guildId=`, `POST` | events list + create |
| `/api/events/[id]` | `PATCH`, `DELETE` | update + delete |
| `/api/participants/[eventId]` | `GET`, `PATCH` | list + update status |
| `/api/guilds` | `GET` | guilds list |
| `/api/guilds/[id]/members` | `GET` | members list |
| `/api/user` | `GET` | current user profile |

### Endpoint Injection per FSD Slice

Each slice injects only its own endpoints into `baseApi`:

- `entities/event/api/eventApi.ts` — `getEvents`, `createEvent`, `updateEvent`, `deleteEvent`
- `entities/guild/api/guildApi.ts` — `getGuilds`, `getGuildMembers`
- `entities/user/api/userApi.ts` — `getUser`
- `features/event-detail/api/detailApi.ts` — `getParticipants`, `updateParticipantStatus`

Each file re-exports generated hooks via the slice's `index.ts`.

## Tag Invalidation

| Tag | `providesTags` | `invalidatesTags` |
|---|---|---|
| `Event` | `getEvents` | `createEvent`, `updateEvent`, `deleteEvent` |
| `Participant` | `getParticipants` | `updateParticipantStatus` |
| `Guild` | `getGuilds` | — |
| `GuildMember` | `getGuildMembers` | — |
| `User` | `getUser` | — |

Tags include entity IDs where applicable (`{ type: 'Event', id }`) to enable point invalidation — e.g., updating a single event invalidates only its cache entry and the list (`{ type: 'Event', id: 'LIST' }`).

## Store Changes

`store.ts` changes:
- Add `[baseApi.reducerPath]: baseApi.reducer`
- Add `baseApi.middleware` to `getDefaultMiddleware()`
- Remove `eventsReducer` and `eventDetailReducer`

Slices removed:
- `entities/event/model/slice.ts` — all thunks and extraReducers are replaced by RTK Query
- `features/event-detail/model/slice.ts` — same

Slices untouched:
- `entities/calendar/model/slice.ts` — UI state only (selected date, view mode)
- `entities/guild/model/slice.ts` — `currentGuildId` in localStorage, not server data

## Data Transformation

Current thunks transform raw Supabase rows into typed `ActivityEvent` objects (date formatting via dayjs). This transformation moves into the `transformResponse` option of each RTK Query endpoint, keeping components free of data-shaping logic.

## Error Handling

Route handlers return standard HTTP status codes. RTK Query surfaces errors via `isError` and `error` from generated hooks. Components currently reading `state.events.error` switch to the hook's `error` field.

## Testing

- Existing `slice.test.ts` files for `events` and `eventDetail` are deleted (the slices are removed).
- Existing API function unit tests (`getEvents.test.ts`, `updateEvent.test.ts`, etc.) are updated to test route handlers or deleted if covered by integration tests.
- New tests: MSW handlers for route handlers, or direct route handler unit tests.
