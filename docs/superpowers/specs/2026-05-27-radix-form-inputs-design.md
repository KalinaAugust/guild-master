# Radix Form Inputs — Design Spec

**Date:** 2026-05-27  
**Branch:** add-zod  

## Overview

Add `@radix-ui/react-form` to the project and create shared UI components (`Input`, `Textarea`, `FormField`) in `shared/ui`. Migrate all native `<input>` and `<textarea>` elements across forms to use these components.

## New Dependencies

- `@radix-ui/react-form` — form primitives (Field, Label, Control, Message, Root)

## New Shared UI Components

### `shared/ui/Input`

Styled wrapper over a native `<input>` element. Used inside `Form.Control asChild`.

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}
```

- Applies `styles.input` base class
- Applies `styles.inputError` when `hasError={true}`
- Forwards all native input props via spread

### `shared/ui/Textarea`

Styled wrapper over a native `<textarea>` element.

```tsx
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}
```

- Applies `styles.textarea` base class
- Applies `styles.textareaError` when `hasError={true}`
- Forwards all native textarea props via spread

### `shared/ui/FormField`

Composite component wrapping `Form.Field` + `Form.Label` + `Form.Control asChild` + `Form.Message`. Follows the same high-level wrapper pattern as `Select`, `Modal`, and `Tooltip`.

```tsx
interface FormFieldProps {
  name: string;           // Form.Field name — required for Radix ARIA wiring
  label: string;          // visible label text
  error?: string;         // when present, forces Form.Message to display
  className?: string;     // optional wrapper class
  children: React.ReactNode; // must be a single Input or Textarea
}
```

Internal structure:
```tsx
<Form.Field name={name} className={...}>
  <Form.Label>{label}</Form.Label>
  <Form.Control asChild>
    {children}  // Input or Textarea receives data-invalid via Radix internals
  </Form.Control>
  <Form.Message forceMatch={!!error} className={styles.errorMessage}>
    {error}
  </Form.Message>
</Form.Field>
```

`Form.Message` is rendered conditionally — `{error && <Form.Message forceMatch className={styles.errorMessage}>{error}</Form.Message>}`. This avoids empty DOM nodes and layout shifts when there is no error.

## Form Migration

### Files migrated

| File | Changes |
|------|---------|
| `src/features/create-event/ui/EventForm.tsx` | `<form>` → `Form.Root`; 3 `<input>` (text, date, time) → `FormField`+`Input`; `<textarea>` → `FormField`+`Textarea` |
| `src/features/manage-guilds/ui/EditGuildWizard.tsx` | Both `<form>` → `Form.Root`; `<input type="text">` (guild name) → `FormField`+`Input`; `<input type="email">` (pending member) → `Input` standalone; `<textarea>` → `FormField`+`Textarea` |
| `src/features/manage-guilds/ui/GuildMembersSection.tsx` | `<input type="email">` → `Input` standalone (no label in this UI) |
| `src/features/ai-helper/ui/AiHelperModal.tsx` | `<textarea>` → `Textarea` standalone (chat input — no label, no validation) |

### Files NOT migrated

| File | Reason |
|------|--------|
| `src/features/update-profile-avatar/ui/AvatarUpload/AvatarUpload.tsx` | Hidden `type="file"` input — programmatically triggered, special UI, not a form field |

### Validation integration (EventForm)

EventForm uses Zod (`createEventFormSchema`) with manual `errors` state. The integration is:
- Zod validation logic is unchanged — runs on submit, produces `errors` record
- `errors.title`, `errors.date`, `errors.time` are passed as `error` prop to `FormField`
- `FormField` passes them to `Form.Message` via `forceMatch={!!error}`
- No new validation library or pattern is introduced

### `formId` / external submit buttons

`EventForm` receives a `formId` prop; `EditGuildWizard` uses `id="guild-wizard-form"` with an external submit button (`form="guild-wizard-form"`). `Form.Root` renders as a `<form>` element and accepts the `id` prop — this pattern is preserved unchanged.

## Styling

- `Input` and `Textarea` styles are extracted from existing form CSS (`EventForm.module.css`, `EditGuildWizard.module.css`) so the visual appearance does not change.
- Existing per-form CSS classes (`styles.input`, `styles.inputError`, etc.) remain in their files for cases where local overrides apply.
- `FormField` error message uses its own `styles.errorMessage` class (replaces `styles.fieldError` in EventForm).

## Standalone Input usage

`Input` and `Textarea` are plain React components with no dependency on Radix Form context. They can be used anywhere — inside or outside `Form.Root`. Only `FormField` requires a `Form.Root` ancestor (Radix internally wires Field → Label → Control via context).

Files using standalone `Input` without `FormField` (no label, no validation needed):
- `GuildMembersSection.tsx` — email field inside its own `Form.Root`
- `EditGuildWizard.tsx` — pending email field
- `AiHelperModal.tsx` — `Textarea` for chat input

## Out of Scope

- No changes to validation logic (Zod schemas stay as-is)
- No new unit tests (per project convention)
- `<textarea>` in `CropperModal` — not present; `update-profile-avatar` file input — not migrated
- No changes to `Select`, `Button`, `Modal`, or other existing shared components
