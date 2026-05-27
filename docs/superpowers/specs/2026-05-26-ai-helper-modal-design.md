# AI Helper Modal — Design Spec

**Date:** 2026-05-26
**Branch:** deep-seek
**Status:** Approved

## Overview

Enhance the existing "AI helper" button in the header with:
1. A tooltip ("AI помощник" / "AI Assistant")
2. Hover state with color change
3. A modal with a text input for sending custom messages to DeepSeek; response displayed inside the modal

## Architecture

**Approach:** Two UI components in the `ai-helper` feature slice — `AiHelperButton` (trigger) and `AiHelperModal` (dialog). Uses existing `Tooltip` and `Modal` from `shared/ui`.

### Files

```
Modify:
  src/features/ai-helper/ui/AiHelperButton.tsx        — add Tooltip, useState(isModalOpen), remove request logic
  src/features/ai-helper/ui/AiHelperButton.module.css — add hover color state
  src/features/ai-helper/api/aiHelperApi.ts            — mutation arg: void → { message: string }
  src/app/api/ai-helper/route.ts                       — read message from request body, return 400 if missing
  messages/en.json                                     — add AiHelper namespace
  messages/ru.json                                     — add AiHelper namespace

Create:
  src/features/ai-helper/ui/AiHelperModal.tsx          — modal: textarea + send button + response area
  src/features/ai-helper/ui/AiHelperModal.module.css   — modal-specific styles
  src/features/ai-helper/ui/AiHelperModal.test.tsx     — component tests
```

## Component Design

### AiHelperButton

- Wrapped in `<Tooltip content={t('tooltip')} side="bottom">` from `@/shared/ui/Tooltip`
- `useState<boolean>(false)` for `isModalOpen`
- On click: `setIsModalOpen(true)` (no longer fires the mutation directly)
- CSS hover: `color` changes to accent on `.button:hover`
- Renders `<AiHelperModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />`

### AiHelperModal

Uses `<Modal>` from `@/shared/ui/Modal` with `title={t('modalTitle')}`.

Internal state:
- `message: string` — controlled textarea value
- `response: string | null` — DeepSeek response text
- `useSendMessageMutation` from `../api/aiHelperApi`

Layout inside modal body:
1. `<textarea>` bound to `message`, placeholder `t('placeholder')`
2. `<Button>` labelled `t('send')`, disabled when `isLoading || !message.trim()`
3. Response area (only rendered when `response` or `isLoading`):
   - Loading: shows `t('thinking')`
   - Done: shows response text
4. On error: shows `t('error')` in response area (no toast)

On submit: calls `sendMessage({ message }).unwrap()`, sets `response`, clears on each new send.

### Route Handler (`src/app/api/ai-helper/route.ts`)

- Reads `{ message }` from `request.json()`
- Returns `{ error: 'message required' }` with status 400 if `message` is missing or empty
- Passes `message` as the user content to DeepSeek (replaces hardcoded string)

### RTK Query (`src/features/ai-helper/api/aiHelperApi.ts`)

- Mutation arg changes from `void` to `{ message: string }`
- Query body: `body: { message }`

## Translations

### `messages/en.json` — add `AiHelper` namespace

```json
"AiHelper": {
  "tooltip": "AI Assistant",
  "modalTitle": "AI Assistant",
  "placeholder": "Type your message...",
  "send": "Send",
  "thinking": "Thinking...",
  "error": "Something went wrong, try again"
}
```

### `messages/ru.json` — add `AiHelper` namespace

```json
"AiHelper": {
  "tooltip": "AI помощник",
  "modalTitle": "AI помощник",
  "placeholder": "Введите сообщение...",
  "send": "Отправить",
  "thinking": "Думаю...",
  "error": "Что-то пошло не так, попробуйте снова"
}
```

Components use `useTranslations('AiHelper')`.

## Error Handling

- Network/API errors: shown as text in the response area (`t('error')`), not as toast
- Empty message: send button is disabled
- Missing API key: route returns 500 — caught by `catch`, shown as error text in modal
