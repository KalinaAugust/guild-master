# Event Time Interval (end time) — Design

**Date:** 2026-06-22
**Status:** Approved (pending spec review)

## Problem

Events currently store only a start moment (`events.event_date` timestamptz, built from
`date` + `time`). There is no duration or end time. Same gap exists for Call to Actions,
which launch into events. The AI helper can create/edit events but knows nothing about an
end time.

## Decisions

- **Model:** explicit **end time**, stored as a separate nullable `timestamptz` column
  (`end_date`). Duration is derived (`end_date − event_date`).
- **Optionality:** end time is **optional**. Existing rows stay `NULL` (no backfill).
- **UI primitive:** a new reusable `shared/ui/TimeRangePicker` wrapping two existing
  `TimePicker`s (start + end).
- **Cross-midnight:** allowed. When `end <= start` (same `HH:mm` comparison), the end is
  interpreted as **next day** (`end_date = date + 1 day` at the end `HH:mm`).
- **Display of end time:** only in `EventDetailContent` and `EventCard`
  (format `19:00 – 21:00`, with a "+1 day" marker when it rolls over). Compact surfaces
  (calendar grid, tooltips, upcoming) keep showing start only.
- **Scope includes:** Events, Call to Actions, AI helper.

## 1. Database (Supabase)

### `events`
- Add column `end_date timestamptz NULL`.
- Migration is additive; existing rows get `NULL`.
- Update `src/shared/api/supabase/types.ts` (`events` Row/Insert/Update) by hand.

### `call_to_actions`
- Add column `end_date timestamptz NULL`.
- Update RPC `create_call_to_action` — add `p_end_date timestamptz DEFAULT NULL`, store it
  on the inserted row.
- Update internal `_do_launch_cta(p_cta_id)` — when creating the `events` row, copy the
  CTA's `end_date` into the new event's `end_date`.
- Update `src/shared/api/supabase/types.ts` (`call_to_actions` Row/Insert/Update + the
  `create_call_to_action` Args).

> During implementation, read the current `create_call_to_action` / `_do_launch_cta`
> bodies (via Supabase MCP) before editing — the SQL below the column add must preserve all
> existing behavior (counter init, interest copy, launch attempt).

## 2. Shared types (`shared/types`)

Extend `ActivityEvent`:

```ts
endTime?: string;        // HH:mm, undefined when no end set
endsNextDay?: boolean;   // true when the interval rolls past midnight
```

The absolute `timestamptz` stays server-side; the client keeps working in
`date` + `time` + `endTime` + `endsNextDay` terms.

## 3. Entity layer (`entities/event`)

Shared helper (e.g. `entities/event/lib/endDate.ts` — internal `lib/` segment):

- `buildEndDate(date: string, time: string, endTime: string): string | null`
  - `''` end ⇒ `null`.
  - else `end_date = `${date}T${endTime}:00``, plus 1 day when `endTime <= time`.
- `deriveEnd(event_date: string, end_date: string | null): { endTime?: string; endsNextDay?: boolean }`
  - from the stored timestamps; `endsNextDay` = end calendar day &gt; start calendar day.

### `createEvent`
- Accept `endTime` (via `ActivityEvent`), set `end_date: buildEndDate(date, time, endTime)`.

### `updateEvent`
- When `endTime !== undefined`: recompute `end_date` (needs `date` + `time` too; the form
  always submits all three). `''` ⇒ `null`.

### `getEvents` / `getEventById`
- Select `end_date`.
- Non-recurring: map via `deriveEnd(event_date, end_date)`.
- Recurring occurrences: compute base duration `dur = end_date − event_date` (when
  `end_date` set), and for each occurrence set its end = `occurrence_start + dur`; derive
  `endTime`/`endsNextDay` from that. This is cross-midnight safe.

## 4. `shared/ui/TimeRangePicker`

```tsx
interface TimeRangePickerProps {
  start: string;                 // HH:mm
  end: string;                   // HH:mm | '' (no end)
  onChange: (v: { start: string; end: string }) => void;
  disabled?: boolean;
  hasError?: boolean;
  labels?: {                     // passed in — no translations inside shared
    open?: string; hours?: string; minutes?: string;
    startPlaceholder?: string; endPlaceholder?: string;
    nextDayHint?: string;        // shown when end <= start && end !== ''
  };
}
```

- Renders two `TimePicker`s side by side (start, end) using existing styles/patterns.
- Shows `nextDayHint` when the end rolls to next day.
- Pure presentational + range glue; no timestamp math (that lives in the entity layer).
- Add `TimeRangePicker.module.css` and a `TimeRangePicker.test.tsx` (render, change
  propagation, next-day hint visibility).

## 5. Event form (`features/create-event`)

- `schema.ts`: add `endTime: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal(''))`. No
  "end &gt; start" rule (cross-midnight allowed).
- `EventForm.tsx`: replace the single time `TimePicker` with `TimeRangePicker`
  (`start=time`, `end=endTime`); new `endTime` state seeded from `initialData?.endTime ?? ''`.
- `initialData` already `Partial<ActivityEvent>`, which now carries `endTime`.

## 6. Call to Action (`features/call-to-action`, `entities/call-to-action`)

- `features/call-to-action/model/schema.ts`: add optional `endTime` (same shape as event).
- `CallToActionForm.tsx`: replace time `TimePicker` with `TimeRangePicker`; new `endTime`
  state.
- `entities/call-to-action`: `CreateCallToActionInput` gains `endTime?: string`;
  `createCallToAction` passes `p_end_date: buildEndDate(date, time, endTime)`.
- `mapCallToActionRow.ts` + CTA types: expose `endTime`/`endsNextDay` (reuse `deriveEnd`).
  CTA card display of end is out of scope unless trivially reusing the event display
  pattern — keep CTA card as-is for now (end propagates to the launched event, which is
  where it is shown).

## 7. AI helper (`src/app/api/ai-helper/tools`)

- `createEventTool.ts` / `editEventTool.ts`: add optional `endTime` property
  (HH:mm, "omit if no end / open-ended"). Not in `required`.
- `executeCreateEvent.ts` / `executeEditEvent.ts`: thread `args.endTime` into the
  `ActivityEvent` payload (real logic already in entity `createEvent`/`updateEvent`).
- Extend the relevant `.test.ts` files for the new field.

## 8. Display (`EventDetailContent`, `EventCard`)

- When `endTime` present, render `start – end`; append a localized "+1 day" marker when
  `endsNextDay`.
- New i18n keys (en + ru), see below.

## 9. i18n (en.json + ru.json, full key parity)

- `DateTimePicker`: `selectEndTime`, `openEndTime`, `nextDayHint` (e.g. "ends next day").
- `Event`: `startTimeLabel`, `endTimeLabel` (or reuse `timeLabel` for start + add
  `endTimeLabel`), `endsNextDay` marker text. Reuse `Common` where possible.
- Mirror needed CTA form labels.
- No new client-facing namespace is introduced (reusing `Event` / `DateTimePicker` /
  `Common`), so `requiredNamespaces` in `layout.tsx` is unchanged. Confirm during impl.

## Testing

- `TimeRangePicker.test.tsx` — render, onChange, next-day hint.
- `endDate.ts` helper — `buildEndDate` (empty, same-day, cross-midnight) and `deriveEnd`.
- `create-event/model/schema.test.ts` — optional/empty/valid `endTime`.
- `call-to-action/model/schema.test.ts` — optional `endTime`.
- ai-helper `executeCreateEvent` / `executeEditEvent` tests — `endTime` threading.

## Out of scope

- Showing end time on compact surfaces (calendar grid, tooltips, upcoming).
- CTA card explicit end-time display.
- Duration-based input UI (chosen model is end time).
