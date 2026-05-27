# AI Find Events — Design Spec

## Goal

Add the ability for the AI assistant to search guild events in response to natural-language queries (e.g. "show me raids this week", "what's coming up next month", "find events with 'dragon' in the title").

## Approach

New `findEvents` tool following the existing `createEvent` pattern. The model calls the tool when the user asks to find, list, or look up events. The tool fetches all events for the guild via the existing `fetchEvents` function, filters in JS, and returns matching events as a JSON string to the model.

## Tool Parameters (all optional)

| Param | Type | Description |
|---|---|---|
| `dateFrom` | `string` (YYYY-MM-DD) | Start of date range (inclusive) |
| `dateTo` | `string` (YYYY-MM-DD) | End of date range (inclusive) |
| `type` | `'raid' \| 'game' \| 'meeting' \| 'other'` | Filter by event type |
| `keyword` | `string` | Case-insensitive substring match on title |

If no parameters are provided, all events for the guild are returned.

## New Files

- `src/app/api/ai-helper/tools/findEventsTool.ts` — `ChatCompletionTool` definition
- `src/app/api/ai-helper/tools/executeFindEvents.ts` — fetch + filter logic, returns `{ events: ActivityEvent[] }`

## Modified Files

- `src/app/api/ai-helper/route.ts` — add `findEventsTool` to `tools` array; handle `findEvents` call in the tool-dispatch block; serialize result as JSON string for the follow-up request
- `src/app/api/ai-helper/systemPrompt.ts` — add instruction: use `findEvents` when user asks to find, list, show, or check events

## Data Flow

1. User: "show me upcoming raids"
2. Model calls `findEvents({ type: "raid", dateFrom: "<today>" })`
3. `executeFindEvents` calls `fetchEvents(guildId)`, filters by type and date
4. Result `{ events: [...] }` serialized as JSON string → `tool_call` result
5. Model receives events list, formulates natural-language answer

## Error Handling

- If `fetchEvents` throws, `executeFindEvents` returns `{ events: [], error: "..." }`
- Tool result string includes the error message; model tells the user it couldn't load events

## Testing

- Unit test for `executeFindEvents`: mock `fetchEvents`, assert each filter combination
