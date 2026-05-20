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
│  [✕]                    Создать событие                        │  ← header, ~64px
├─────────────────────────────────┬──────────────────────────────┤
│  ОСНОВНОЕ                       │  ДОПОЛНИТЕЛЬНО               │
│                                 │                              │
│  [ Название               ]     │  [ Иконка события  (stub) ]  │
│  [ Дата      ] [ Время    ]     │  [ Цвет ● ● ● ●    (stub) ]  │
│  [ Тип (Select)           ]     │  [ Повтор по дням   (stub) ] │
│  [ Описание (textarea)    ]     │  [ Участники        (stub) ] │
│                                 │                              │
├─────────────────────────────────┴──────────────────────────────┤
│                                          [Отмена]  [Создать →] │
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
1. **Иконка события** — empty div with label, visually looks like a selector
2. **Цвет** — row of colored circles, non-interactive
3. **Повтор** — disabled day-of-week toggles (Пн Вт Ср Чт Пт Сб Вс)
4. **Участники** — empty input-like stub with label

All stubs render with `opacity: 0.5` and a "скоро" badge or disabled state to signal they are not yet functional.

## Out of Scope

- No new Redux state
- No new API calls
- No routing changes
- Right-column stubs are purely visual — no logic, no validation
