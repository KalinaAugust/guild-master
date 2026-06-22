# Event Time Interval (end time) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give events (and Call to Actions that launch into events) an optional end time, captured via a reusable `TimeRangePicker`, persisted as a nullable `end_date` timestamptz, and surfaced to the AI helper and the event detail/card UI.

**Architecture:** Add a nullable `end_date timestamptz` column to `events` and `call_to_actions`. A domain-agnostic helper in `shared/lib` converts between the client model (`date` + `time` + `endTime` + `endsNextDay`) and the absolute timestamp. A new `shared/ui/TimeRangePicker` wraps two existing `TimePicker`s. Cross-midnight (end ≤ start) rolls the end to the next day. Recurring occurrences derive each occurrence's end from the base event's duration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Redux Toolkit + RTK Query, Supabase (Postgres, RPC), Zod, next-intl, CSS Modules, Vitest + Testing Library.

## Global Constraints

- FSD layering: `shared` may not import from any slice; `entities/call-to-action` may NOT import from `entities/event` (same layer) — shared time math lives in `shared/lib`.
- Import slices only through their `index.ts` barrels.
- i18n: every user-facing string goes through next-intl; add keys to BOTH `messages/en.json` and `messages/ru.json` in full parity. No new client-facing namespace is added (reuse `Event`, `DateTimePicker`, `CallToAction`, `Common`).
- CSS Modules only; NEVER inline styles. (Existing files already violate this with `style={{...}}` on event-type icons — do NOT "fix" unrelated lines; STRICT SCOPE.)
- Supabase migrations: apply DDL via the Supabase MCP (`apply_migration`); hand-edit `src/shared/api/supabase/types.ts` (no CLI codegen).
- `React.FormEvent` is deprecated — use `React.SubmitEvent`.
- All files, comments, commit messages in English.
- Time format is `HH:mm` (24h). Empty string `''` means "no end set".
- Baseline is not clean: `tsc` has 3 pre-existing errors and `lint:fsd` 2 insignificant-slice warnings on master — ignore those when verifying; only regressions you introduce count.

---

### Task 1: Database columns + RPC changes + generated types

**Files:**
- Migrations: applied via Supabase MCP `apply_migration` (no repo file).
- Modify: `src/shared/api/supabase/types.ts` (events + call_to_actions Row/Insert/Update; `create_call_to_action` Args/Returns).

**Interfaces:**
- Produces: `events.end_date timestamptz | null`, `call_to_actions.end_date timestamptz | null`, RPC `create_call_to_action(..., p_end_date timestamptz default null)`.

- [ ] **Step 1: Add `end_date` to `events` and `call_to_actions`**

Apply migration `add_end_date_to_events_and_ctas`:

```sql
alter table public.events add column if not exists end_date timestamptz;
alter table public.call_to_actions add column if not exists end_date timestamptz;
```

- [ ] **Step 2: Recreate `create_call_to_action` with `p_end_date`**

The new arg list differs from the old 6-arg signature, so DROP the old one first to avoid an overload (named-arg calls would become ambiguous). Apply migration `cta_create_with_end_date`:

```sql
drop function if exists public.create_call_to_action(uuid, text, text, text, timestamptz, integer);

create or replace function public.create_call_to_action(
  p_guild_id uuid, p_title text, p_description text, p_type text,
  p_event_date timestamptz, p_target_count integer, p_end_date timestamptz default null
) returns uuid
  language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from guild_members m where m.guild_id = p_guild_id and m.user_id = v_uid)
    then raise exception 'Not a guild member'; end if;
  insert into call_to_actions (guild_id, created_by, title, description, type, event_date, target_count, end_date)
    values (p_guild_id, v_uid, p_title, p_description, p_type, p_event_date, greatest(p_target_count, 1), p_end_date)
    returning id into v_id;
  insert into call_to_action_interests (cta_id, user_id) values (v_id, v_uid);
  perform public._maybe_launch_cta(v_id);
  return v_id;
end; $function$;
```

(A freshly created function grants EXECUTE to PUBLIC by default, matching the prior anon/authenticated/service_role access — no extra GRANT needed.)

- [ ] **Step 3: Carry `end_date` into the launched event in `_do_launch_cta`**

Same signature, so `create or replace` keeps grants. Apply migration `cta_launch_copies_end_date`:

```sql
create or replace function public._do_launch_cta(p_cta_id uuid)
  returns void language plpgsql security definer set search_path to 'public'
as $function$
declare c record; v_event_id uuid;
begin
  select * into c from call_to_actions where id = p_cta_id for update;
  if c.id is null then return; end if;
  if c.event_id is not null then return; end if;
  insert into events (guild_id, title, description, type, event_date, end_date, created_by, week_days)
    values (c.guild_id, c.title, c.description, c.type, c.event_date, c.end_date, c.created_by, '{}')
    returning id into v_event_id;
  insert into event_participants (event_id, user_id, status)
    select v_event_id, user_id, 'confirmed' from call_to_action_interests where cta_id = p_cta_id;
  update call_to_actions set event_id = v_event_id, launched_at = now(), updated_at = now()
    where id = p_cta_id;
end; $function$;
```

- [ ] **Step 4: Verify columns and RPC exist**

```sql
select column_name from information_schema.columns
  where table_name in ('events','call_to_actions') and column_name = 'end_date';
select proname, pg_get_function_identity_arguments(oid)
  from pg_proc where proname = 'create_call_to_action';
```
Expected: two `end_date` rows; the function shows `... , p_end_date timestamp with time zone`.

- [ ] **Step 5: Hand-edit `src/shared/api/supabase/types.ts`**

In the `events` table type, add `end_date: string | null` to `Row`, and `end_date?: string | null` to `Insert` and `Update`. Do the same for `call_to_actions`. In `Functions.create_call_to_action.Args`, add `p_end_date?: string`.

- [ ] **Step 6: Commit**

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat(db): add nullable end_date to events and call_to_actions"
```

---

### Task 2: `shared/lib` time-interval helpers

**Files:**
- Create: `src/shared/lib/eventInterval.ts`
- Test: `src/shared/lib/eventInterval.test.ts`

**Interfaces:**
- Produces:
  - `buildEndDate(date: string, time: string, endTime: string): string | null` — `date` `YYYY-MM-DD`, `time`/`endTime` `HH:mm` (or `endTime === ''`). Returns `YYYY-MM-DDTHH:mm:00` (end rolled +1 day when `endTime <= time`), or `null` when `endTime === ''`.
  - `deriveEnd(eventDate: string, endDate: string | null): { endTime?: string; endsNextDay?: boolean }` — both are parseable timestamp strings; uses UTC.

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/eventInterval.test.ts
import { describe, it, expect } from 'vitest';
import { buildEndDate, deriveEnd } from './eventInterval';

describe('buildEndDate', () => {
  it('returns null when end time is empty', () => {
    expect(buildEndDate('2026-06-22', '19:00', '')).toBeNull();
  });
  it('builds a same-day end when end is after start', () => {
    expect(buildEndDate('2026-06-22', '19:00', '21:00')).toBe('2026-06-22T21:00:00');
  });
  it('rolls to next day when end <= start', () => {
    expect(buildEndDate('2026-06-22', '23:00', '01:00')).toBe('2026-06-23T01:00:00');
    expect(buildEndDate('2026-06-22', '19:00', '19:00')).toBe('2026-06-23T19:00:00');
  });
});

describe('deriveEnd', () => {
  it('returns empty object when end is null', () => {
    expect(deriveEnd('2026-06-22T19:00:00Z', null)).toEqual({});
  });
  it('derives same-day end', () => {
    expect(deriveEnd('2026-06-22T19:00:00Z', '2026-06-22T21:00:00Z')).toEqual({
      endTime: '21:00',
      endsNextDay: false,
    });
  });
  it('flags next-day end', () => {
    expect(deriveEnd('2026-06-22T23:00:00Z', '2026-06-23T01:00:00Z')).toEqual({
      endTime: '01:00',
      endsNextDay: true,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/shared/lib/eventInterval.test.ts`
Expected: FAIL — module not found / functions not defined.

- [ ] **Step 3: Implement the helpers**

```ts
// src/shared/lib/eventInterval.ts
import dayjs from '@/shared/lib/dayjs';

/**
 * Build the absolute end timestamp for an event.
 * `endTime === ''` means no end. When end <= start it is treated as next day.
 */
export const buildEndDate = (
  date: string,
  time: string,
  endTime: string,
): string | null => {
  if (!endTime) return null;
  const rollsOver = endTime <= time; // HH:mm strings compare lexicographically
  const endDate = rollsOver ? dayjs(date).add(1, 'day').format('YYYY-MM-DD') : date;
  return `${endDate}T${endTime}:00`;
};

/** Derive the client-facing end fields from stored timestamps (UTC). */
export const deriveEnd = (
  eventDate: string,
  endDate: string | null,
): { endTime?: string; endsNextDay?: boolean } => {
  if (!endDate) return {};
  const start = dayjs.utc(eventDate);
  const end = dayjs.utc(endDate);
  return {
    endTime: end.format('HH:mm'),
    endsNextDay: !end.isSame(start, 'day'),
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/shared/lib/eventInterval.test.ts`
Expected: PASS (6 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/eventInterval.ts src/shared/lib/eventInterval.test.ts
git commit -m "feat(shared): add eventInterval buildEndDate/deriveEnd helpers"
```

---

### Task 3: `shared/ui/TimeRangePicker`

**Files:**
- Create: `src/shared/ui/TimeRangePicker/TimeRangePicker.tsx`
- Create: `src/shared/ui/TimeRangePicker/TimeRangePicker.module.css`
- Create: `src/shared/ui/TimeRangePicker/index.ts`
- Test: `src/shared/ui/TimeRangePicker/TimeRangePicker.test.tsx`

**Interfaces:**
- Consumes: `TimePicker` from `@/shared/ui/TimePicker`.
- Produces:
  ```ts
  interface TimeRangePickerProps {
    start: string;
    end: string; // '' = no end
    onChange: (v: { start: string; end: string }) => void;
    disabled?: boolean;
    hasError?: boolean;
    labels?: {
      open?: string; hours?: string; minutes?: string;
      startPlaceholder?: string; endPlaceholder?: string;
      nextDayHint?: string;
    };
  }
  export const TimeRangePicker: React.FC<TimeRangePickerProps>;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/ui/TimeRangePicker/TimeRangePicker.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeRangePicker } from './TimeRangePicker';

describe('TimeRangePicker', () => {
  it('renders start and end values', () => {
    render(<TimeRangePicker start="19:00" end="21:00" onChange={vi.fn()} />);
    expect(screen.getByText('19:00')).toBeInTheDocument();
    expect(screen.getByText('21:00')).toBeInTheDocument();
  });

  it('shows the next-day hint when end <= start', () => {
    render(
      <TimeRangePicker
        start="23:00"
        end="01:00"
        onChange={vi.fn()}
        labels={{ nextDayHint: 'ends next day' }}
      />,
    );
    expect(screen.getByText('ends next day')).toBeInTheDocument();
  });

  it('hides the hint when there is no end', () => {
    render(
      <TimeRangePicker
        start="19:00"
        end=""
        onChange={vi.fn()}
        labels={{ nextDayHint: 'ends next day' }}
      />,
    );
    expect(screen.queryByText('ends next day')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/shared/ui/TimeRangePicker/TimeRangePicker.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/shared/ui/TimeRangePicker/TimeRangePicker.tsx
'use client';

import * as React from 'react';
import { TimePicker } from '@/shared/ui/TimePicker';
import styles from './TimeRangePicker.module.css';

export interface TimeRangePickerLabels {
  open?: string;
  hours?: string;
  minutes?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  nextDayHint?: string;
}

interface TimeRangePickerProps {
  start: string;
  end: string;
  onChange: (v: { start: string; end: string }) => void;
  disabled?: boolean;
  hasError?: boolean;
  labels?: TimeRangePickerLabels;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  start,
  end,
  onChange,
  disabled = false,
  hasError = false,
  labels,
}) => {
  const rollsOver = !!end && end <= start;
  const pickerLabels = { open: labels?.open, hours: labels?.hours, minutes: labels?.minutes };

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <TimePicker
          value={start}
          onChange={(v) => onChange({ start: v, end })}
          disabled={disabled}
          hasError={hasError}
          placeholder={labels?.startPlaceholder}
          labels={pickerLabels}
        />
        <span className={styles.separator} aria-hidden>–</span>
        <TimePicker
          value={end}
          onChange={(v) => onChange({ start, end: v })}
          disabled={disabled}
          placeholder={labels?.endPlaceholder}
          labels={pickerLabels}
        />
      </div>
      {rollsOver && labels?.nextDayHint && (
        <span className={styles.hint}>{labels.nextDayHint}</span>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Add the stylesheet**

```css
/* src/shared/ui/TimeRangePicker/TimeRangePicker.module.css */
.root {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.separator {
  color: var(--text-secondary);
  user-select: none;
}
.hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
```

- [ ] **Step 5: Add the barrel**

```ts
// src/shared/ui/TimeRangePicker/index.ts
export { TimeRangePicker } from './TimeRangePicker';
export type { TimeRangePickerLabels } from './TimeRangePicker';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test:run src/shared/ui/TimeRangePicker/TimeRangePicker.test.tsx`
Expected: PASS (3 tests). If `--text-secondary` is unknown in jsdom it does not matter; tests assert text only.

- [ ] **Step 7: Commit**

```bash
git add src/shared/ui/TimeRangePicker
git commit -m "feat(ui): add TimeRangePicker wrapping two TimePickers"
```

---

### Task 4: Event model + entity mappers carry `endTime`

**Files:**
- Modify: `src/shared/types/index.ts` (`ActivityEvent`)
- Modify: `src/entities/event/api/createEvent.ts`
- Modify: `src/entities/event/api/updateEvent.ts`
- Modify: `src/entities/event/api/getEvents.ts`
- Modify: `src/entities/event/api/getEventById.ts`
- Modify: `src/entities/event/api/eventApi.ts`

**Interfaces:**
- Consumes: `buildEndDate`, `deriveEnd` from `@/shared/lib/eventInterval`.
- Produces: `ActivityEvent.endTime?: string`, `ActivityEvent.endsNextDay?: boolean`; all event reads/writes round-trip `end_date`.

- [ ] **Step 1: Extend `ActivityEvent`**

In `src/shared/types/index.ts`, inside `interface ActivityEvent`, after `time: string;`:

```ts
  endTime?: string; // HH:mm, undefined when no end set
  endsNextDay?: boolean; // true when the interval rolls past midnight
```

- [ ] **Step 2: Write `end_date` on create**

In `src/entities/event/api/createEvent.ts`, add the import and set `end_date` in the insert:

```ts
import { buildEndDate } from '@/shared/lib/eventInterval';
```

In the `.insert([{ ... }])` object, after `event_date: `${event.date}T${event.time}:00`,` add:

```ts
        end_date: buildEndDate(event.date, event.time, event.endTime ?? ''),
```

- [ ] **Step 3: Recompute `end_date` on update**

In `src/entities/event/api/updateEvent.ts`:

```ts
import { buildEndDate } from '@/shared/lib/eventInterval';
```

Add `end_date?: string | null;` to the `updateData` type. After the existing `if (event.date && event.time) { updateData.event_date = ... }` block, add:

```ts
  if (event.endTime !== undefined && event.date && event.time) {
    updateData.end_date = buildEndDate(event.date, event.time, event.endTime);
  }
```

- [ ] **Step 4: Map `end_date` in `getEvents`**

In `src/entities/event/api/getEvents.ts`:

```ts
import { deriveEnd } from '@/shared/lib/eventInterval';
```

Add `end_date: string | null;` to the `DbEvent` interface. Add `end_date` to BOTH `.select(...)` strings (in `getServerEvents` and `fetchEvents`).

In `generateOccurrences`, occurrences must keep the same duration. Replace the occurrence push with one that shifts `end_date` by the same day offset:

```ts
      if (!exceptions.includes(currentSecs)) {
        const occEnd = raw.end_date
          ? dayjs
              .utc(raw.end_date)
              .add(current.diff(start, 'day'), 'day')
              .format('YYYY-MM-DDTHH:mm:ss')
          : null;
        occurrences.push({
          ...raw,
          id: `${raw.id}_${currentSecs}`,
          public_id: `${raw.public_id}_${currentSecs}`,
          event_date: `${currentSecs}T${timeStr}`,
          end_date: occEnd,
        });
      }
```

In the final `.map((raw) => { ... })` of `getServerEvents`, add the derived fields to the returned object:

```ts
      ...deriveEnd(raw.event_date, raw.end_date),
```
(place it after `time: d.format('HH:mm'),`).

- [ ] **Step 5: Map `end_date` in `getEventById`**

In `src/entities/event/api/getEventById.ts`:

```ts
import { deriveEnd } from '@/shared/lib/eventInterval';
```

Add `end_date: string | null;` to `RawEventRow`. Add `end_date` to the `.select(...)` string.

For recurring occurrences the end must shift to the occurrence date. Before the `return`, compute:

```ts
  const occEnd =
    occurrenceDate && raw.end_date
      ? dayjs
          .utc(raw.end_date)
          .add(dayjs.utc(occurrenceDate).diff(d.startOf('day'), 'day'), 'day')
          .toISOString()
      : raw.end_date;
```

In the returned `event` object, after `time: d.format('HH:mm'),` add:

```ts
      ...deriveEnd(raw.event_date, occEnd),
```

- [ ] **Step 6: Map `end_date` in the client RTK transform**

In `src/entities/event/api/eventApi.ts`:

```ts
import { deriveEnd } from '@/shared/lib/eventInterval';
```

Add `end_date?: string | null;` to the `RawEvent` type. In `transformEvent`, after `time: d.format('HH:mm'),` add:

```ts
    ...deriveEnd(raw.event_date, raw.end_date ?? null),
```

- [ ] **Step 7: Verify types + existing event tests still pass**

Run: `pnpm test:run src/entities/event` and `pnpm exec tsc --noEmit`
Expected: event tests PASS; no NEW tsc errors beyond the 3 known baseline ones.

- [ ] **Step 8: Commit**

```bash
git add src/shared/types/index.ts src/entities/event/api
git commit -m "feat(event): round-trip optional end_date through event model and mappers"
```

---

### Task 5: Event form uses `TimeRangePicker`

**Files:**
- Modify: `src/features/create-event/model/schema.ts`
- Test: `src/features/create-event/model/schema.test.ts`
- Modify: `src/features/create-event/ui/EventForm.tsx`
- Modify: `messages/en.json`, `messages/ru.json`

**Interfaces:**
- Consumes: `TimeRangePicker` from `@/shared/ui/TimeRangePicker`; `EventFormData` now carries `endTime: string`.

- [ ] **Step 1: Write the failing schema test**

Append to `src/features/create-event/model/schema.test.ts`:

```ts
import { createEventFormSchema } from './schema';

const msgs = {
  titleRequired: 'title',
  dateRequired: 'date',
  timeRequired: 'time',
};

describe('endTime', () => {
  const base = { title: 'x', date: '2026-06-22', time: '19:00', type: 'game', description: '' };
  it('accepts an empty endTime', () => {
    expect(createEventFormSchema(msgs).safeParse({ ...base, endTime: '' }).success).toBe(true);
  });
  it('accepts a valid endTime', () => {
    expect(createEventFormSchema(msgs).safeParse({ ...base, endTime: '21:00' }).success).toBe(true);
  });
  it('rejects a malformed endTime', () => {
    expect(createEventFormSchema(msgs).safeParse({ ...base, endTime: '9pm' }).success).toBe(false);
  });
});
```

(If the test file already imports `describe/it/expect` and `createEventFormSchema`, reuse those imports instead of redeclaring.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/features/create-event/model/schema.test.ts`
Expected: FAIL — `endTime` not in schema (empty/valid cases may pass-through, malformed should currently pass since unknown keys are stripped → assertion fails).

- [ ] **Step 3: Add `endTime` to the schema**

In `src/features/create-event/model/schema.ts`, inside the `z.object({...})`, after the `time` line:

```ts
    endTime: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal('')),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/features/create-event/model/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Swap the form control**

In `src/features/create-event/ui/EventForm.tsx`:

Replace the import:
```ts
import { TimePicker } from '@/shared/ui/TimePicker';
```
with:
```ts
import { TimeRangePicker } from '@/shared/ui/TimeRangePicker';
```

Add end-time state after the `time` state:
```ts
  const [endTime, setEndTime] = useState(initialData?.endTime || '');
```

Add `endTime` to the parsed payload — change:
```ts
    const result = schema.safeParse({ title, date, time, type, description });
```
to:
```ts
    const result = schema.safeParse({ title, date, time, endTime, type, description });
```

Replace the `time` `FormField` block:
```tsx
        <FormField name="time" label={t('timeLabel')} error={errors.time}>
          <TimePicker
            value={time}
            onChange={setTime}
            hasError={!!errors.time}
            placeholder={pickerT('selectTime')}
            labels={{
              open: pickerT('openTime'),
              hours: pickerT('hours'),
              minutes: pickerT('minutes'),
            }}
          />
        </FormField>
```
with:
```tsx
        <FormField name="time" label={t('timeLabel')} error={errors.time}>
          <TimeRangePicker
            start={time}
            end={endTime}
            onChange={({ start, end }) => {
              setTime(start);
              setEndTime(end);
            }}
            hasError={!!errors.time}
            labels={{
              open: pickerT('openTime'),
              hours: pickerT('hours'),
              minutes: pickerT('minutes'),
              startPlaceholder: pickerT('selectTime'),
              endPlaceholder: pickerT('selectEndTime'),
              nextDayHint: pickerT('nextDayHint'),
            }}
          />
        </FormField>
```

- [ ] **Step 6: Add i18n keys**

In `messages/en.json` → `DateTimePicker`, add:
```json
    "selectEndTime": "End time",
    "nextDayHint": "Ends next day"
```
In `messages/ru.json` → `DateTimePicker`, add:
```json
    "selectEndTime": "Время конца",
    "nextDayHint": "Заканчивается на следующий день"
```

- [ ] **Step 7: Verify form + i18n parity**

Run: `pnpm test:run src/features/create-event` and
`node -e "const a=require('./messages/en.json'),b=require('./messages/ru.json');const ka=Object.keys(a.DateTimePicker).sort(),kb=Object.keys(b.DateTimePicker).sort();if(JSON.stringify(ka)!==JSON.stringify(kb)){console.error('MISMATCH',ka,kb);process.exit(1)}console.log('parity ok')"`
Expected: tests PASS; `parity ok`.

- [ ] **Step 8: Commit**

```bash
git add src/features/create-event messages/en.json messages/ru.json
git commit -m "feat(create-event): capture optional end time via TimeRangePicker"
```

---

### Task 6: Display end time in `EventCard` and `EventDetailContent`

**Files:**
- Modify: `src/entities/event/ui/EventCard.tsx`
- Modify: `src/features/event-detail/ui/EventDetailContent.tsx`
- Modify: `messages/en.json`, `messages/ru.json`

**Interfaces:**
- Consumes: `ActivityEvent.endTime`, `ActivityEvent.endsNextDay`.

- [ ] **Step 1: Show the range in `EventCard`**

In `src/entities/event/ui/EventCard.tsx`, replace:
```tsx
              <span>{event.time}</span>
```
with:
```tsx
              <span>
                {event.endTime ? `${event.time} – ${event.endTime}` : event.time}
              </span>
```

(EventCard renders `event.time` raw and has no translations; the "+1 day" nuance is only shown on the detail page to keep the card compact. STRICT SCOPE: do not restructure the card.)

- [ ] **Step 2: Show the range + next-day marker in `EventDetailContent`**

In `src/features/event-detail/ui/EventDetailContent.tsx`, the header currently renders the start time via:
```tsx
<span className={styles.dateNum}>{eventDate?.format('HH:mm')}</span>
```
Replace that single `<span>` with the start–end range plus an optional next-day marker:
```tsx
<span className={styles.dateNum}>{eventDate?.format('HH:mm')}</span>
{event.endTime && (
  <>
    {' – '}
    <span className={styles.dateNum}>{event.endTime}</span>
    {event.endsNextDay && <span className={styles.nextDay}>{eventT('endsNextDay')}</span>}
  </>
)}
```
(`eventT` is the existing `useTranslations('Event')` instance in this file — confirm its variable name and reuse it; do not add a second hook.)

- [ ] **Step 3: Add the `.nextDay` style**

In `EventDetailContent.module.css`, add:
```css
.nextDay {
  margin-left: 6px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}
```

- [ ] **Step 4: Add the i18n key**

In `messages/en.json` → `Event`, add `"endsNextDay": "+1 day"`.
In `messages/ru.json` → `Event`, add `"endsNextDay": "+1 день"`.

- [ ] **Step 5: Verify**

Run: `pnpm test:run src/features/event-detail src/entities/event` and the parity check:
`node -e "const a=require('./messages/en.json'),b=require('./messages/ru.json');for(const ns of ['Event','DateTimePicker']){const ka=Object.keys(a[ns]).sort(),kb=Object.keys(b[ns]).sort();if(JSON.stringify(ka)!==JSON.stringify(kb)){console.error('MISMATCH',ns);process.exit(1)}}console.log('parity ok')"`
Expected: tests PASS; `parity ok`.

- [ ] **Step 6: Commit**

```bash
git add src/entities/event/ui/EventCard.tsx src/features/event-detail messages/en.json messages/ru.json
git commit -m "feat(event): display end time on card and detail view"
```

---

### Task 7: CTA entity carries `endTime`

**Files:**
- Modify: `src/entities/call-to-action/model/types.ts`
- Modify: `src/entities/call-to-action/api/createCallToAction.ts`
- Modify: `src/entities/call-to-action/api/mapCallToActionRow.ts`

**Interfaces:**
- Consumes: `buildEndDate`, `deriveEnd` from `@/shared/lib/eventInterval`.
- Produces: `CreateCallToActionInput.endTime?: string`; `CallToAction.endTime?: string`, `CallToAction.endsNextDay?: boolean`.

- [ ] **Step 1: Extend CTA types**

In `src/entities/call-to-action/model/types.ts`:
- In `interface CallToAction`, after `eventDate: string;` add:
```ts
  endTime?: string; // HH:mm, undefined when no end set
  endsNextDay?: boolean;
```
- In `interface CreateCallToActionInput`, after `time: string;` add:
```ts
  endTime?: string; // HH:mm, '' or undefined = no end
```

- [ ] **Step 2: Pass `p_end_date` from `createCallToAction`**

In `src/entities/call-to-action/api/createCallToAction.ts`:
```ts
import { buildEndDate } from '@/shared/lib/eventInterval';
```
In the `supabase.rpc('create_call_to_action', { ... })` argument object, after `p_target_count: input.targetCount,` add:
```ts
    p_end_date: buildEndDate(input.date, input.time, input.endTime ?? ''),
```

- [ ] **Step 3: Derive end in the row mapper**

In `src/entities/call-to-action/api/mapCallToActionRow.ts`:
```ts
import { deriveEnd } from '@/shared/lib/eventInterval';
```
Add `end_date: string | null;` to `interface CallToActionRow`. Add `end_date` to the `CTA_SELECT` field list (e.g. after `event_date,`). In the returned object of `buildCallToAction`, after `eventDate: row.event_date,` add:
```ts
    ...deriveEnd(row.event_date, row.end_date),
```

- [ ] **Step 4: Verify**

Run: `pnpm test:run src/entities/call-to-action` and `pnpm exec tsc --noEmit`
Expected: CTA tests PASS; no NEW tsc errors.

- [ ] **Step 5: Commit**

```bash
git add src/entities/call-to-action
git commit -m "feat(cta): round-trip optional end_date through CTA model and RPC"
```

---

### Task 8: CTA form uses `TimeRangePicker`

**Files:**
- Modify: `src/features/call-to-action/model/schema.ts`
- Test: `src/features/call-to-action/model/schema.test.ts`
- Modify: `src/features/call-to-action/ui/CallToActionForm.tsx`

**Interfaces:**
- Consumes: `TimeRangePicker`; `CtaFormData` now carries `endTime: string`; the form's submit handler must forward `endTime` into `CreateCallToActionInput`.

- [ ] **Step 1: Write the failing schema test**

Append to `src/features/call-to-action/model/schema.test.ts`:
```ts
describe('cta endTime', () => {
  const base = { title: 'x', date: '2026-06-22', time: '19:00', type: 'game', description: '', targetCount: 5 };
  const m = { titleRequired: 't', dateRequired: 'd', timeRequired: 'ti', targetMin: 'm' };
  it('accepts empty endTime', () => {
    expect(createCtaFormSchema(m).safeParse({ ...base, endTime: '' }).success).toBe(true);
  });
  it('rejects malformed endTime', () => {
    expect(createCtaFormSchema(m).safeParse({ ...base, endTime: '9pm' }).success).toBe(false);
  });
});
```
(Reuse the file's existing imports for `describe/it/expect/createCtaFormSchema`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/features/call-to-action/model/schema.test.ts`
Expected: FAIL — malformed case passes (unknown key stripped) so assertion fails.

- [ ] **Step 3: Add `endTime` to the CTA schema**

In `src/features/call-to-action/model/schema.ts`, inside `z.object({...})` after the `time` line:
```ts
    endTime: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal('')),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/features/call-to-action/model/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Swap the form control**

In `src/features/call-to-action/ui/CallToActionForm.tsx`:
- Replace `import { TimePicker } from '@/shared/ui/TimePicker';` with `import { TimeRangePicker } from '@/shared/ui/TimeRangePicker';`.
- After the `time` state add `const [endTime, setEndTime] = useState('');`.
- Add `endTime` to the `safeParse({ ... })` call (alongside `time`).
- Forward `endTime` wherever the parsed data is turned into `CreateCallToActionInput` (the `onSubmit`/create call) — add `endTime` to that object.
- Replace the `TimePicker` JSX with:
```tsx
          <TimeRangePicker
            start={time}
            end={endTime}
            onChange={({ start, end }) => {
              setTime(start);
              setEndTime(end);
            }}
            hasError={!!errors.time}
            labels={{
              open: pickerT('openTime'),
              hours: pickerT('hours'),
              minutes: pickerT('minutes'),
              startPlaceholder: pickerT('selectTime'),
              endPlaceholder: pickerT('selectEndTime'),
              nextDayHint: pickerT('nextDayHint'),
            }}
          />
```
(`pickerT` = `useTranslations('DateTimePicker')`, already present in this file per line 36. Keys `selectEndTime`/`nextDayHint` were added in Task 5.)

- [ ] **Step 6: Verify**

Run: `pnpm test:run src/features/call-to-action`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/call-to-action
git commit -m "feat(cta): capture optional end time in the CTA form"
```

---

### Task 9: AI helper learns `endTime`

**Files:**
- Modify: `src/app/api/ai-helper/tools/createEventTool.ts`
- Modify: `src/app/api/ai-helper/tools/editEventTool.ts`
- Modify: `src/app/api/ai-helper/tools/executeCreateEvent.ts`
- Modify: `src/app/api/ai-helper/tools/executeEditEvent.ts`
- Test: `src/app/api/ai-helper/tools/executeCreateEvent.test.ts`
- Test: `src/app/api/ai-helper/tools/executeEditEvent.test.ts`

**Interfaces:**
- Consumes: `createEvent`/`updateEvent` (already accept `endTime` via `ActivityEvent`).
- Produces: `CreateEventArgs.endTime?: string`, `EditEventArgs.endTime?: string`, both threaded into the entity payload.

- [ ] **Step 1: Write failing tests**

In `executeCreateEvent.test.ts`, the suite mocks `@/entities/event/api/createEvent`. Add a test asserting `endTime` is forwarded:
```ts
it('forwards endTime to createEvent', async () => {
  // `createEvent` is the mocked import already used by other tests in this file.
  await executeCreateEvent(
    { title: 'T', date: '2026-06-22', time: '19:00', type: 'game', description: '', endTime: '21:00' },
    'guild-1',
  );
  expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ endTime: '21:00' }));
});
```
In `executeEditEvent.test.ts`, with `updateEvent` mocked:
```ts
it('forwards endTime to updateEvent', async () => {
  await executeEditEvent({ id: 'e1', endTime: '22:00' });
  expect(updateEvent).toHaveBeenCalledWith('e1', expect.objectContaining({ endTime: '22:00' }));
});
```
(Match each file's existing mock/import style — reuse the already-imported mocked `createEvent`/`updateEvent` references rather than re-mocking.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/app/api/ai-helper/tools/executeCreateEvent.test.ts src/app/api/ai-helper/tools/executeEditEvent.test.ts`
Expected: FAIL — `endTime` not forwarded (and TS error on the unknown arg field until Step 3/4).

- [ ] **Step 3: Thread `endTime` through the execute functions**

In `executeCreateEvent.ts`: add `endTime?: string;` to `CreateEventArgs`; in the `createEvent({...})` call add `endTime: args.endTime,`.

In `executeEditEvent.ts`: add `endTime?: string;` to `EditEventArgs`. (`endTime` is already inside `...fields` via destructuring `const { id, ...fields } = args;`, so it is forwarded to `updateEvent` automatically — no other change needed.)

- [ ] **Step 4: Declare the tool parameters**

In `createEventTool.ts`, add to `properties` (after `time`):
```ts
        endTime: {
          type: 'string',
          description: 'Optional event end time in HH:mm 24-hour format (e.g. "21:30"). If the end is on/after midnight relative to the start it is treated as the next day. Omit if the event has no defined end.',
        },
```
In `editEventTool.ts`, add the same `endTime` property to its `properties`. Do NOT add it to `required` in either tool.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:run src/app/api/ai-helper/tools`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ai-helper/tools
git commit -m "feat(ai-helper): allow setting event end time via create/edit tools"
```

---

### Task 10: Final verification

- [ ] **Step 1: Full test run**

Run: `pnpm test:run`
Expected: all green (aside from any pre-existing baseline failures).

- [ ] **Step 2: Type + lint check**

Run: `pnpm exec tsc --noEmit` and `pnpm lint`
Expected: no NEW errors beyond the known baseline (3 tsc errors, lint:fsd insignificant-slice warnings).

- [ ] **Step 3: Update CLAUDE.md schema docs**

In `CLAUDE.md`, update the `events` and `call_to_actions` rows in the Database Schema table to mention `end_date` (timestamptz, nullable — optional event end; cross-midnight rolls to next day), and note `create_call_to_action` now takes `p_end_date` and `_do_launch_cta` copies it into the event.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note end_date columns and RPC changes in CLAUDE.md"
```

- [ ] **Step 5: Refresh the knowledge graph**

Run: `graphify update .`
Expected: completes without error.
