# AI Helper: Add Participants to an Event

**Date:** 2026-06-20
**Status:** Approved

## Goal

Let the AI helper modal add guild members as participants to an existing
calendar event, in response to natural-language requests like "add Alice and
Bob to Friday's raid".

## Decisions

- **Permissions:** same gate as creating/editing events — only `OWNER`/`ADMIN`
  (`canManageEvents` in `route.ts`). Members without that role get a
  permission-denied tool result.
- **Member resolution:** a dedicated `findMembers` tool so the model resolves
  names/aliases to `userId`s before adding, rather than fuzzy-matching inside
  the add tool.
- **Semantics:** add-only (union with current participants). Nothing is ever
  removed. New participants get status `pending` (the existing
  `syncParticipants` behavior for non-creators).

## Architecture

Mirror the existing AI-helper tool pattern: each tool is a pair of files under
`src/app/api/ai-helper/tools/` — a `*Tool.ts` OpenAI function schema and an
`execute*.ts` server executor that calls existing `entities/*` data functions.
`route.ts` wires the schemas into the `tools` array and dispatches them in
`handleToolCall`.

### New tool 1 — `findMembers`

- `findMembersTool.ts`: function schema `findMembers`, params
  `{ keyword?: string }` (case-insensitive substring over name + alias; omit to
  list all). No permission gate (read-only, like `findEvents`).
- `executeFindMembers.ts`:
  - `interface FindMembersArgs { keyword?: string }`
  - Calls `getGuildMembers(guildId)`.
  - For each member compute a display name: `displayAsAlias && alias ? alias : (fullName ?? alias ?? 'Unknown')`.
  - Filter by `keyword` over `fullName` + `alias` (both lowercased) when present.
  - Returns `{ members: { userId, name, alias }[] }`. On error
    `{ members: [], error }`.

### New tool 2 — `addParticipants`

- `addParticipantsTool.ts`: function schema `addParticipants`, params
  `{ eventId: string, userIds: string[] }`, both required. Description tells the
  model to obtain `eventId` via `findEvents` and `userIds` via `findMembers`,
  and that it only adds (never removes).
- `executeAddParticipants.ts`:
  - `interface AddParticipantsArgs { eventId: string; userIds: string[] }`
  - Validate `userIds` is a non-empty array → else `{ success: false, error }`.
  - `getGuildMembers(guildId)` → build a `Set` of valid ACCEPTED member
    `userId`s. Keep only requested ids that are in the set. If none remain →
    `{ success: false, error: 'No valid guild members in the provided list' }`.
  - `getEventParticipantUserIds(eventId)` → union with the valid new ids.
  - `syncParticipants(eventId, union)`.
  - Return `{ success: true, eventId, addedCount }` where `addedCount` is the
    number of newly-added ids (valid ids not already participants).
  - Wrap in try/catch → `{ success: false, error: message }`.

### `route.ts` changes

- Import the two new tool schemas and executors.
- Add both to the `tools` array passed to `client.chat.completions.create`.
- Extend `ToolOutcome` with `participantsUpdated?: boolean`.
- In `handleToolCall`:
  - `case 'findMembers'`: `{ content: JSON.stringify(await executeFindMembers(...)) }`. No gate.
  - `case 'addParticipants'`:
    - Gate on `canManageEvents` → permission-denied content if false.
    - Verify the event belongs to the guild via `getEventById(args.eventId)`
      (same guard as `editEvent`): if missing or `guildId` mismatch →
      `{ content: 'Failed to add participants: event not found in this guild' }`.
    - Run `executeAddParticipants`; content describes success
      (`Added N participant(s)`) or failure; set `participantsUpdated` on success.
- Track `participantsUpdated` across the tool loop like `eventCreated` /
  `eventUpdated`, and include it in the final `NextResponse.json(...)`.

### Client changes

- `aiHelperApi.ts`: add `participantsUpdated: boolean` to
  `SendAiMessageResponse`.
- `AiHelperModal.tsx`: after a successful reply, if
  `result.participantsUpdated`, dispatch
  `baseApi.util.invalidateTags(['Participant'])` (string tag invalidates all
  `Participant` entries, including `LIST-${eventId}`), so an open event-detail
  view refreshes its roster. Keep the existing Event invalidation for
  created/updated.

### `systemPrompt.ts` changes

- Add a "When adding participants" section: use `findMembers` to resolve people
  to ids, then `addParticipants` with the event id from `findEvents`; it only
  adds, never removes; confirm ambiguous names with the user first.
- Mention `findMembers` in the tool overview.

## Data flow

1. User: "add Alice to the Friday raid".
2. Model → `findEvents` (gets `eventId`) and `findMembers` (gets Alice's `userId`).
3. Model → `addParticipants({ eventId, userIds })`.
4. Executor unions Alice into the participant set and calls `syncParticipants`.
5. Route returns `participantsUpdated: true`; modal invalidates `Participant`.

## Error handling

- Non-OWNER/ADMIN → permission-denied tool result (model relays politely).
- Event not in guild → "event not found in this guild".
- Empty / all-invalid `userIds` → executor returns a descriptive error string.
- Supabase errors bubble into `{ success: false, error }` and become a tool
  result; the route's outer try/catch still covers DeepSeek failures.

## Testing

- `executeFindMembers.test.ts`: keyword filter (name + alias), display-name
  derivation (alias vs full name), empty result.
- `executeAddParticipants.test.ts`: union with existing participants;
  non-members filtered out; empty `userIds` → error; `addedCount` correctness.
  Mock `getGuildMembers`, `getEventParticipantUserIds`, `syncParticipants`
  (mirroring `executeCreateEvent.test.ts`).

## Out of scope

- Removing participants via AI.
- Inviting non-members.
- Any new user-facing translated strings (AI replies are model-generated; no
  new i18n keys, no `requiredNamespaces` change).
