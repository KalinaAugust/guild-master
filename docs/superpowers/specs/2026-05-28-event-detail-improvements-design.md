# Event Detail Page — Display Improvements

**Date:** 2026-05-28
**Status:** Approved

## Goal

Improve data readability on the `EventDetailContent` page (`src/features/event-detail/ui/EventDetailContent.tsx`):
1. Replace the text type badge with a Hero-block (icon + color)
2. Format date/time in a human-readable, locale-aware way

---

## Change 1: Type Hero-block

### Current
A small inline pill badge: `[Dungeon]` with generic purple background, no icon.

### New
A full-width block replacing `.typeBadge`:

```
┌─ 4px solid type-color ─────────────────────┐
│                                             │
│   [icon 32px]   Dungeon                    │
│                                             │
└─────────────────────────────────────────────┘
```

**Visuals:**
- Left border: `4px solid <type-color>`
- Background: `rgba(<type-color-rgb>, 0.08)`
- Border-radius: `12px`
- Padding: `16px 20px`
- Icon size: 32px, colored with type color
- Text: `1rem`, `font-weight: 600`, type color

**Type → icon + color mapping** (same as EventCard):

| Type    | Icon         | Color     |
|---------|--------------|-----------|
| raid    | Sword        | #ff4d4d   |
| game    | Gamepad2     | #4da3ff   |
| meeting | Users        | #4dff88   |
| other   | Calendar     | #ffb347   |
| dungeon | Skull        | #a855f7   |
| party   | PartyPopper  | #f472b6   |
| sport   | Dumbbell     | #34d399   |

**Implementation:**
- Add a `typeIcons: Record<ActivityType, React.ReactNode>` map in `EventDetailContent.tsx` (same pattern as EventCard)
- Replace `.typeBadge` + `.type_*` CSS with `.typeHero` base class + per-type modifier classes: `.typeHero_raid`, `.typeHero_game`, `.typeHero_dungeon`, etc.
- Each modifier class sets `border-left-color`, `background`, and `color` — no inline styles (follows project CSS Modules rule)

### Files changed
- `src/features/event-detail/ui/EventDetailContent.tsx`
- `src/features/event-detail/ui/EventDetailContent.module.css`

---

## Change 2: Human-readable date

### Current
Raw ISO string concatenation: `{event.date} {event.time}` → `2026-06-05 19:00`

### New
Locale-aware formatted string using `dayjs` (already in project at `@/shared/lib/dayjs`):
- EN: `Friday, June 5 · 19:00`
- RU: `Пятница, 5 июня · 19:00`

**Implementation:**
- Import `dayjs` from `@/shared/lib/dayjs`
- Get current locale via `useLocale()` from `next-intl`
- Combine date+time: `dayjs(`${event.date} ${event.time}`).locale(locale)`
- Format: `dddd, D MMMM · HH:mm`
- Locales `ru`/`en` already loaded in `src/shared/lib/dayjs.ts`

### Files changed
- `src/features/event-detail/ui/EventDetailContent.tsx`

---

## Out of scope
- Participant list changes
- Edit/delete button changes
- Mobile layout changes
