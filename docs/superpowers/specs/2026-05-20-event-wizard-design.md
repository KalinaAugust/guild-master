# Event Wizard — Design Spec

## Summary

Replace `EventModal` (centered radix-ui dialog, max-width 500px) with `EventWizard` — a full-screen overlay wizard. No new URL. No new functionality beyond stubs for future right-column fields.

## Architecture

New files in `src/features/create-event/ui/`:
- `EventWizard.tsx` — replaces `EventModal`, renders full-screen overlay
- `EventWizard.module.css` — full-screen layout styles

`EventForm.tsx` is reused as-is inside the left column.

`EventModal.tsx` is deleted after `EventWizard` is wired up everywhere.

Replace `<EventModal>` with `<EventWizard>` at all call sites.

## State / Logic

`EventWizard` reads the same Redux state as `EventModal`:
- `state.ui.isEventModalOpen`
- `state.ui.selectedDate`
- `state.ui.editingEvent`
- `state.guild.currentGuildId`

Dispatches `closeEventModal`, `createEventThunk`, `updateEventThunk` — identical to `EventModal`.

`EventForm` prop interface is unchanged.

## Layout

```
┌────────────────────────────────────────────────────────────────┐
│  [✕]                     Create event                          │  ← header, ~64px
├─────────────────────────────────┬──────────────────────────────┤
│  MAIN                           │  ADDITIONAL                  │
│                                 │                              │
│  [ Title                  ]     │  [ Event icon      (stub) ]  │
│  [ Date      ] [ Time     ]     │  [ Color ● ● ● ●   (stub) ]  │
│  [ Type (Select)          ]     │  [ Repeat by days  (stub) ]  │
│  [ Description (textarea) ]     │  [ Invited users   (stub) ]  │
│                                 │                              │
├─────────────────────────────────┴──────────────────────────────┤
│                                           [Cancel]  [Create →] │
└────────────────────────────────────────────────────────────────┘
```

- Full viewport: `position: fixed; inset: 0; z-index: 1100`
- Background: `var(--glass-bg)` + `backdrop-filter` — no separate overlay element
- Two-column grid for body: left = `EventForm`, right = stubs
- Footer: `justify-content: flex-end`, Cancel + Submit buttons
- Header: close button (✕) top-left, title centered
- Animation: fade + scale (same as current modal)

## Right Column Stubs

Four disabled placeholder fields (no data sent on submit):
1. **Event icon** — empty div with label, visually looks like a selector
2. **Color** — row of colored circles, non-interactive
3. **Repeat** — disabled day-of-week toggles (Mon Tue Wed Thu Fri Sat Sun)
4. **Invited users** — empty input-like stub with label

All stubs render with `opacity: 0.5` and a "coming soon" badge or disabled state to signal they are not yet functional.

## Out of Scope

- No new Redux state
- No new API calls
- No routing changes
- Right-column stubs are purely visual — no logic, no validation
