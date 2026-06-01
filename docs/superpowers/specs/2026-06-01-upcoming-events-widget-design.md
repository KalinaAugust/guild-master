# Upcoming Events Widget Design

**Date:** 2026-06-01
**Branch:** upcoming-events-widget

## Summary

Replace the static "Guild Master" heading on the home page with a horizontal info strip sitting above the calendar. The strip combines two data blocks: the next upcoming event (left) and this week's events broken down by type (right).

---

## Visual Layout

Single glass-morphism panel (matching calendar's `var(--glass-bg)` style), full width, ~70px tall.

```
┌─────────────────────────────────────────────────┬──────────────────────────┐
│  СЛЕДУЮЩЕЕ СОБЫТИЕ                              │  НА ЭТОЙ НЕДЕЛЕ          │
│  [Рейд на Ктулху]  🕐 Завтра · 20:00  👥 5 уч. │  ⚔2  🗂1  🎵1  👥2       │
└─────────────────────────────────────────────────┴──────────────────────────┘
```

Left and right blocks separated by a 1px `rgba(255,255,255,0.08)` vertical divider.

---

## Left Block — Next Event

**Data:** the nearest future event from the currently selected guild.

- **Label:** "СЛЕДУЮЩЕЕ СОБЫТИЕ" (muted uppercase, `var(--text-muted)`)
- **Event name:** clickable link (`color: var(--accent-primary)`) → navigates to `/events/[id]`
- **Meta:** clock icon + relative date ("Завтра") + time
- **Participant count:** users icon + "N участников", dotted underline
  - **Tooltip on hover:** list of confirmed participants — 26px avatar (initials or `avatarUrl`) + full name. Fetched via `useGetParticipantsQuery`, filtered to `status === 'confirmed'`.
- If no upcoming events: show "Событий не запланировано" in muted text.

---

## Right Block — This Week by Type

**Data:** all events for the current guild in Mon–Sun of the current week, filtered to only those where the current user is a participant (`event_participants` where `user_id = currentUserId`).

- **Label:** "НА ЭТОЙ НЕДЕЛЕ" (muted uppercase)
- **Content:** one chip per event type that has ≥1 event this week. Each chip: type icon + count.
- **Chip colours** — reuse existing CSS variables:
  - `raid` → `--event-raid-border` (#b06060), sword icon
  - `dungeon` → `--event-dungeon-border` (#a855f7), layers icon
  - `party` → `--event-party-border` (#f472b6), music icon
  - `meeting` → `--event-meeting-border` (#5a90b8), users icon
  - `game` → `--event-game-border` (#4a9068), gamepad icon
  - `sport` → `--event-sport-border` (#34d399), activity icon
  - `other` → `--event-other-border` (#4a85a8), calendar icon
- **Tooltip on hover per chip:** list of events of that type — title + relative day + time.
- If no events this week where user is participant: hide right block entirely (don't show empty chips row).

---

## Data Requirements

| Data | Source | Hook/Query |
|---|---|---|
| Events for active guild | `GET /api/events?guildId=` | `useGetEventsQuery(guildId)` — already used in CalendarGrid |
| Participants for next event | `GET /api/participants/[eventId]` | `useGetParticipantsQuery(eventId)` |
| Current user id | passed as prop from `page.tsx` | `userId` prop |
| Guild selection | Redux store | `useGuildSelection` hook |

No new API endpoints needed. The widget reuses existing RTK Query hooks.

---

## Architecture — FSD Placement

New widget: `src/widgets/upcoming-events/`

```
src/widgets/upcoming-events/
  ui/
    UpcomingEventsStrip.tsx       — top-level strip, composes both blocks
    UpcomingEventsStrip.module.css
    NextEventBlock.tsx            — left block
    WeekByTypeBlock.tsx           — right block
    ParticipantsTooltip.tsx       — tooltip content for participants
    EventTypeTooltip.tsx          — tooltip content for event type chips
  lib/
    useNextEvent.ts               — derives next event from events array
    useWeekEventsByType.ts        — filters + groups this-week events by type
  index.ts
```

`UpcomingEventsStrip` accepts `{ guilds, userId }` — same signature as CalendarGrid — so `page.tsx` passes the same props with no extra server fetching.

---

## Component Integration

`src/app/page.tsx` — replace `<h1>` with `<UpcomingEventsStrip>`:

```tsx
// before
<h1 className={styles.title}>{t('title')}</h1>

// after
<UpcomingEventsStrip guilds={guilds} userId={user?.id} />
```

Remove `.title` style from `HomePage.module.css`.

---

## Tooltips

Reuse the existing `Tooltip` primitive from `src/shared/ui/Tooltip`. Pass custom JSX as `content` prop (already supported — see `EventsTooltipContent` pattern in CalendarGrid).

---

## Edge Cases

- **No active guild selected:** strip shows "Выберите гильдию" in muted text, no data fetched.
- **No upcoming events:** left block shows fallback text, right block is hidden.
- **No user participation this week:** right block is hidden.
- **Event with no confirmed participants:** tooltip shows "Нет подтверждений".
- **avatarUrl null:** show initials fallback (first letter of fullName).
