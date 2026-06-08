# Poll Wizard — Two-Column Layout Design

**Date:** 2026-06-08
**Scope:** `features/guild-poll` — extend `PollWizard` from a single-column stub into a
two-column wizard matching the Event/Guild wizards. UI-only (no persistence).

## Goal

Add a second column to the poll-creation wizard. Left column holds poll content
(title, description, Telegram-style answer options). Right column holds settings
toggles. No backend — submit stays a stub that closes and resets the wizard.

## Layout

Reuse `WizardDialog` + two `WizardColumn`s (shared shell, already used by
`EventWizard` and `EditGuildWizard`).

- **Left column:** title input, description textarea, answer-options block.
- **Right column:** settings header + three toggle rows.

## Left Column

1. **Title** — `Input`, required. (Unchanged from current stub.)
2. **Description** — `Textarea`, optional. (Unchanged.)
3. **Answer options** — Telegram-referenced behavior, in its own sub-component
   `ui/PollOptionsField.tsx`:
   - Renders a list of text inputs from `options: string[]`.
   - A trailing empty "add an option" input is always present.
   - Typing into the trailing empty input spawns a new empty trailing input.
   - Each non-empty option has a remove (`×`) button.
   - Hard cap: **10** options total (the trailing empty input is hidden once 10
     non-empty options exist).
   - Minimum **2** non-empty options required to enable submit.
   - No drag-reorder (out of scope for v1).

## Right Column

Header label "Settings", then three rows of `label + Switch` (`shared/ui/Switch`):

- **Anonymous poll** — `isAnonymous`
- **Multiple answers** — `allowMultiple`
- **Custom answer** — `allowCustom` (voters may add their own option when voting)

These are UI state only; no behavioral coupling between toggles in v1.

## State

Local component state in `PollWizard`:

```
title: string
description: string
options: string[]          // normalized: always one trailing "" unless at cap of 10
isAnonymous: boolean
allowMultiple: boolean
allowCustom: boolean
```

`PollOptionsField` is controlled: receives `options` + `onChange(next: string[])`.
A small normalize helper keeps exactly one trailing empty entry (unless 10 non-empty
entries exist) and is applied on every change.

## Validation & Submit

- Submit ("Create poll") enabled when `title.trim()` is non-empty **and** there are
  **≥2** non-empty options.
- Submit handler is a stub: prevent default, guard validity, then `handleClose()`
  (resets all state and calls `onClose`). No API call. Matches existing stub.

## i18n

Add to `GuildPoll` namespace (en + ru):

- `optionsLabel`, `optionPlaceholder`, `addOptionPlaceholder`, `removeOption` (aria)
- `settingsLabel`
- `anonymousLabel`, `multipleLabel`, `customLabel`

## FSD / Files

- `features/guild-poll/ui/PollWizard.tsx` — extended (two columns, state, settings).
- `features/guild-poll/ui/PollWizard.module.css` — settings rows, options block styles.
- `features/guild-poll/ui/PollOptionsField.tsx` (+ `.module.css`) — new sub-component.
- `messages/en.json`, `messages/ru.json` — new `GuildPoll` keys.
- No new public exports needed beyond existing `PollWizard` (PollOptionsField is internal).

## Constraints

- CSS Modules only, no inline styles, design-system tokens only.
- `React.SubmitEvent` for the form submit handler.
- Reuse `Input`, `Textarea`, `Switch`, `Button`, `FormField`, `WizardDialog`.
```
