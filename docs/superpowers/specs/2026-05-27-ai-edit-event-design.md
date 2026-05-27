# AI Edit Event — Design Spec

## Goal

Allow the AI assistant to edit existing guild events in response to natural-language requests (e.g. "rename Dragon Raid to Phoenix Raid", "move next Tuesday's meeting to Friday at 18:00").

## Approach

New `editEvent` tool following the existing `createEvent`/`findEvents` pattern. The model first calls `findEvents` to locate the target event and get its `id`, confirms the change with the user, then calls `editEvent`. The route returns `eventUpdated: true` so the frontend can invalidate the RTK Query cache.

## Tool Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | ✅ | ID of the event to edit |
| `title` | `string` | — | New title |
| `date` | `string` (YYYY-MM-DD) | — | New date |
| `time` | `string` (HH:mm) | — | New time |
| `type` | `'raid' \| 'game' \| 'meeting' \| 'other'` | — | New event type |
| `description` | `string` | — | New description (empty string to clear) |

At least one optional field must be provided alongside `id`.

## New Files

- `src/app/api/ai-helper/tools/editEventTool.ts` — `ChatCompletionTool` definition
- `src/app/api/ai-helper/tools/executeEditEvent.ts` — calls `updateEvent(id, partialFields)`, returns `{ success, eventId?, error? }`

## Modified Files

- `src/app/api/ai-helper/route.ts` — register `editEventTool`, handle `editEvent` dispatch, return `eventUpdated: boolean` in response
- `src/app/api/ai-helper/systemPrompt.ts` — add "When editing events" section
- `src/features/ai-helper/api/aiHelperApi.ts` — add `eventUpdated: boolean` to response type
- `src/features/ai-helper/ui/AiHelperModal.tsx` — invalidate `Event LIST` cache when `eventUpdated` is true

## Data Flow

1. User: "rename Dragon Raid to Phoenix Raid"
2. Model calls `findEvents({ keyword: "Dragon" })` → receives event list with ids
3. Model confirms the change with the user if ambiguous
4. Model calls `editEvent({ id: "abc", title: "Phoenix Raid" })`
5. `executeEditEvent` calls `updateEvent("abc", { title: "Phoenix Raid" })`
6. Route returns `{ message, eventCreated: false, eventUpdated: true }`
7. Frontend invalidates `{ type: 'Event', id: 'LIST' }` cache → calendar refreshes
8. Model includes a link to the updated event: `<a href="/events/{id}">title</a>`

## Error Handling

- If `updateEvent` throws, `executeEditEvent` returns `{ success: false, error: "..." }`
- Tool result content includes the error; model tells the user the edit failed

## Testing

- Unit test for `executeEditEvent`: mock `updateEvent`, assert success and error paths
