# Date & Time Pickers — Design

**Date:** 2026-06-17
**Branch:** `date-time-pickers`

## Goal

Replace the native `type="date"` / `type="time"` inputs across the app with styled,
on-brand pickers that match the glassmorphism design system.

## Library choice

- **`react-day-picker` v9** for the calendar (headless-friendly, full CSS control,
  React 19 compatible, re-exports date-fns locales via `react-day-picker/locale` — no
  separate date-fns install).
- **`@radix-ui/react-popover`** for the dropdown surface (already a dependency; keeps the
  existing "Radix primitive + CSS Modules" idiom).
- **Custom `TimePicker`** (no library) — two scrollable columns (hours / minutes).

## Value contract — unchanged

Pickers keep the existing string contract:
- date → `YYYY-MM-DD`
- time → `HH:mm`

Conversion between string and `Date` happens at the component boundary via dayjs. No
changes to Zod schemas, RTK payloads, or dayjs business logic — call sites only swap the
input JSX.

## New shared components (`src/shared/ui`)

Public API via `index.ts` for each. Both are domain-agnostic and free of `next-intl` —
they accept a `locale` prop (callers pass `useLocale()`), mirroring `MessageBubble`.

### `DatePicker`
- Trigger styled like `Input` (formatted date in the active locale, or placeholder) +
  calendar icon.
- `Popover.Content` hosts `react-day-picker` `mode="single"`. Localized via
  `react-day-picker/locale` (`ru` / `enUS`), `weekStartsOn=1` (matches the main calendar).
  Selecting a day closes the popover and calls `onChange('YYYY-MM-DD')`.
- Props: `value: string`, `onChange: (v: string) => void`, `locale: string`,
  `placeholder?`, `min?` (disable earlier days), `disabled?`, `captionLayout?`,
  `fromYear?` / `toYear?` (for dropdown caption).
- Birth-date usage enables `captionLayout="dropdown"` with a year range (1920…current).

### `TimePicker`
- Trigger styled like `Input` (`HH:mm`) + clock icon.
- `Popover.Content` with two scrollable columns: hours `00–23`, minutes by `minuteStep`
  (default 5). Selecting calls `onChange('HH:mm')`.
- Props: `value: string`, `onChange: (v: string) => void`, `minuteStep?`, `placeholder?`,
  `disabled?`.

## Styling

CSS Modules on design-system tokens (glass bg, borders, accent on the selected day/time).
Popovers render through `Popover.Portal` at `--z-modal-content` so they layer correctly
when opened inside a Radix Dialog (EventForm / CTA wizard are modal).

## i18n

New client namespace `DatePicker` (trigger placeholders, aria labels: open calendar,
previous/next month, clear). Keys added to `messages/en.json` and `messages/ru.json`, and
the namespace registered in `requiredNamespaces` (`src/app/layout.tsx`).

## Apply at 4 call sites

| File | Inputs |
|---|---|
| `features/create-event/ui/EventForm.tsx` | date + time |
| `features/event-detail/ui/EventDetailContent.tsx` | date + time |
| `features/call-to-action/ui/CallToActionForm.tsx` | date + time |
| `features/update-profile-birth-date/ui/EditableBirthDate/EditableBirthDate.tsx` | date (dropdown years) |

## Testing

- Unit tests for `DatePicker` / `TimePicker`: value display, selecting a day/time fires
  `onChange` with the correct string.
- Update existing form tests that target `type="date"` / `type="time"` inputs
  (`EventForm.test.tsx`, `EventDetailContent.test.tsx`, and any CTA test) to drive the new
  components.

## Out of scope

- No range pickers, no presets, no direct keyboard segment editing in the TimePicker (MVP
  is column selection).
- Value formats and the main calendar widget are untouched.
