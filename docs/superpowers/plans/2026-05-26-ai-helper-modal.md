# AI Helper Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the AI helper button with a tooltip, hover state, and a modal where the user types a message and sees DeepSeek's response inline.

**Architecture:** `AiHelperButton` gains tooltip + modal state; new `AiHelperModal` owns request logic and response display. Route handler and RTK Query mutation updated to accept a dynamic `message` from the client. Translations added via `next-intl`.

**Tech Stack:** Next.js App Router, RTK Query (`injectEndpoints`), `next-intl`, Radix UI (`@radix-ui/react-tooltip`), shared `Modal` + `Button` + `Tooltip` from `@/shared/ui`, CSS Modules, Vitest + React Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `messages/en.json` | Add `AiHelper` namespace |
| Modify | `messages/ru.json` | Add `AiHelper` namespace |
| Modify | `src/app/api/ai-helper/route.ts` | Read `message` from body; 400 if missing |
| Modify | `src/features/ai-helper/api/aiHelperApi.ts` | Mutation arg: `void` → `{ message: string }` |
| Create | `src/features/ai-helper/ui/AiHelperModal.tsx` | Modal: textarea + send button + response area |
| Create | `src/features/ai-helper/ui/AiHelperModal.module.css` | Modal body styles |
| Create | `src/features/ai-helper/ui/AiHelperModal.test.tsx` | Modal tests |
| Modify | `src/features/ai-helper/ui/AiHelperButton.tsx` | Tooltip + `useState(isModalOpen)`; remove request logic |
| Modify | `src/features/ai-helper/ui/AiHelperButton.module.css` | Add hover color state |
| Modify | `src/features/ai-helper/ui/AiHelperButton.test.tsx` | Update tests for new button behavior |

---

## Task 1: Translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add `AiHelper` namespace to `messages/en.json`**

Open `messages/en.json`. Add this block before the closing `}` of the root object (after the `Guild` block):

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

- [ ] **Step 2: Add `AiHelper` namespace to `messages/ru.json`**

Open `messages/ru.json`. Add this block before the closing `}` of the root object (after the `Guild` block):

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

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat(ai-helper): add AiHelper i18n namespace"
```

---

## Task 2: Update route handler

**Files:**
- Modify: `src/app/api/ai-helper/route.ts`

- [ ] **Step 1: Rewrite the route handler**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server';

interface DeepSeekResponse {
  choices: { message: { content: string } }[];
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'DEEPSEEK_API_KEY not configured' },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null) as { message?: string } | null;
  const userMessage = body?.message?.trim();
  if (!userMessage) {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'DeepSeek API error' },
        { status: response.status }
      );
    }

    const data = await response.json() as DeepSeekResponse;
    const message = data.choices?.[0]?.message?.content;
    if (typeof message !== 'string') {
      return NextResponse.json({ error: 'Unexpected DeepSeek response shape' }, { status: 502 });
    }
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json(
      { error: 'Failed to contact DeepSeek' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai-helper/route.ts
git commit -m "feat(ai-helper): read dynamic message from request body"
```

---

## Task 3: Update RTK Query mutation

**Files:**
- Modify: `src/features/ai-helper/api/aiHelperApi.ts`

- [ ] **Step 1: Update mutation arg type and query body**

Replace the entire file with:

```typescript
import { baseApi } from '@/shared/api/baseApi';

export const aiHelperApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendTestMessage: builder.mutation<{ message: string }, { message: string }>({
      query: ({ message }) => ({
        url: 'ai-helper',
        method: 'POST',
        body: { message },
      }),
    }),
  }),
});

export const { useSendTestMessageMutation } = aiHelperApi;
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/ai-helper/api/aiHelperApi.ts
git commit -m "feat(ai-helper): update sendTestMessage mutation to accept dynamic message"
```

---

## Task 4: AiHelperModal component (TDD)

**Files:**
- Create: `src/features/ai-helper/ui/AiHelperModal.test.tsx`
- Create: `src/features/ai-helper/ui/AiHelperModal.tsx`
- Create: `src/features/ai-helper/ui/AiHelperModal.module.css`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/ai-helper/ui/AiHelperModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiHelperModal } from './AiHelperModal';
import { useSendTestMessageMutation } from '../api/aiHelperApi';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/shared/ui/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
    isOpen ? <div data-testid="modal"><h2>{title}</h2>{children}</div> : null,
}));

vi.mock('@/shared/ui/Button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

const mockSendMessage = vi.fn();

vi.mock('../api/aiHelperApi', () => ({
  useSendTestMessageMutation: vi.fn(() => [mockSendMessage, { isLoading: false }]),
}));

type MockMutationHook = [typeof mockSendMessage, { isLoading: boolean }];

describe('AiHelperModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSendTestMessageMutation).mockReturnValue(
      [mockSendMessage, { isLoading: false }] as unknown as MockMutationHook
    );
  });

  it('renders nothing when isOpen is false', () => {
    render(<AiHelperModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders modal with textarea and send button when open', () => {
    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('placeholder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'send' })).toBeInTheDocument();
  });

  it('disables send button when textarea is empty', () => {
    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'send' })).toBeDisabled();
  });

  it('enables send button when textarea has content', () => {
    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('placeholder'), {
      target: { value: 'Hello' },
    });
    expect(screen.getByRole('button', { name: 'send' })).not.toBeDisabled();
  });

  it('shows response in modal on success', async () => {
    mockSendMessage.mockReturnValue({
      unwrap: () => Promise.resolve({ message: 'Hello from AI!' }),
    });

    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('placeholder'), {
      target: { value: 'Hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    await waitFor(() => {
      expect(screen.getByText('Hello from AI!')).toBeInTheDocument();
    });
  });

  it('shows error text in modal on failure', async () => {
    mockSendMessage.mockReturnValue({
      unwrap: () => Promise.reject(new Error('fail')),
    });

    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('placeholder'), {
      target: { value: 'Hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('shows thinking text while loading', () => {
    vi.mocked(useSendTestMessageMutation).mockReturnValue(
      [mockSendMessage, { isLoading: true }] as unknown as MockMutationHook
    );

    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('thinking')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run -- src/features/ai-helper/ui/AiHelperModal.test.tsx
```

Expected: FAIL — `AiHelperModal` not found.

- [ ] **Step 3: Create the component**

```tsx
// src/features/ai-helper/ui/AiHelperModal.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { useSendTestMessageMutation } from '../api/aiHelperApi';
import styles from './AiHelperModal.module.css';

interface AiHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiHelperModal = ({ isOpen, onClose }: AiHelperModalProps) => {
  const t = useTranslations('AiHelper');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [sendMessage, { isLoading }] = useSendTestMessageMutation();

  const handleSubmit = async () => {
    setResponse(null);
    try {
      const result = await sendMessage({ message }).unwrap();
      setResponse(result.message);
    } catch {
      setResponse(t('error'));
    }
  };

  const handleClose = () => {
    setMessage('');
    setResponse(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('modalTitle')}>
      <div className={styles.body}>
        <textarea
          className={styles.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('placeholder')}
          rows={4}
        />
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !message.trim()}
          fullWidth
        >
          {t('send')}
        </Button>
        {(isLoading || response !== null) && (
          <div className={styles.response}>
            {isLoading ? t('thinking') : response}
          </div>
        )}
      </div>
    </Modal>
  );
};
```

- [ ] **Step 4: Create CSS Module**

```css
/* src/features/ai-helper/ui/AiHelperModal.module.css */
.body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 0.5rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  padding: 0.75rem;
  resize: vertical;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}

.textarea:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.textarea::placeholder {
  color: var(--text-secondary);
}

.response {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 0.5rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm run test:run -- src/features/ai-helper/ui/AiHelperModal.test.tsx
```

Expected: 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ai-helper/ui/AiHelperModal.tsx src/features/ai-helper/ui/AiHelperModal.module.css src/features/ai-helper/ui/AiHelperModal.test.tsx
git commit -m "feat(ai-helper): add AiHelperModal with textarea and response display"
```

---

## Task 5: Update AiHelperButton (TDD)

**Files:**
- Modify: `src/features/ai-helper/ui/AiHelperButton.test.tsx`
- Modify: `src/features/ai-helper/ui/AiHelperButton.tsx`
- Modify: `src/features/ai-helper/ui/AiHelperButton.module.css`

- [ ] **Step 1: Replace the test file**

```tsx
// src/features/ai-helper/ui/AiHelperButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AiHelperButton } from './AiHelperButton';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./AiHelperModal', () => ({
  AiHelperModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="ai-modal">
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

describe('AiHelperButton', () => {
  it('renders a button with aria-label "AI helper"', () => {
    render(<AiHelperButton />);
    expect(screen.getByRole('button', { name: /ai helper/i })).toBeInTheDocument();
  });

  it('modal is closed initially', () => {
    render(<AiHelperButton />);
    expect(screen.queryByTestId('ai-modal')).not.toBeInTheDocument();
  });

  it('opens modal on button click', () => {
    render(<AiHelperButton />);
    fireEvent.click(screen.getByRole('button', { name: /ai helper/i }));
    expect(screen.getByTestId('ai-modal')).toBeInTheDocument();
  });

  it('closes modal when onClose is called', () => {
    render(<AiHelperButton />);
    fireEvent.click(screen.getByRole('button', { name: /ai helper/i }));
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByTestId('ai-modal')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run -- src/features/ai-helper/ui/AiHelperButton.test.tsx
```

Expected: FAIL — `Tooltip` not mocked / `AiHelperModal` not imported.

- [ ] **Step 3: Replace the component**

```tsx
// src/features/ai-helper/ui/AiHelperButton.tsx
'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Tooltip } from '@/shared/ui/Tooltip';
import { AiHelperModal } from './AiHelperModal';
import styles from './AiHelperButton.module.css';

export const AiHelperButton = () => {
  const t = useTranslations('AiHelper');
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Tooltip content={t('tooltip')} side="bottom">
        <button
          className={styles.button}
          onClick={() => setIsModalOpen(true)}
          aria-label="AI helper"
        >
          <Bot size={20} />
        </button>
      </Tooltip>
      <AiHelperModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
```

- [ ] **Step 4: Add hover state to CSS Module**

Open `src/features/ai-helper/ui/AiHelperButton.module.css` and add `.button:hover` after the base `.button` rule:

```css
.button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: opacity 0.2s, color 0.2s;
}

.button:hover {
  color: rgba(255, 255, 255, 0.9);
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.loading {
  opacity: 0.4;
}
```

- [ ] **Step 5: Run tests — verify all pass**

```bash
npm run test:run -- src/features/ai-helper/ui/AiHelperButton.test.tsx
```

Expected: 4 tests PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm run test:run
```

Expected: same number of passing tests as before (pre-existing EventWizard failures unchanged).

- [ ] **Step 7: Run lint**

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/ai-helper/ui/AiHelperButton.tsx src/features/ai-helper/ui/AiHelperButton.module.css src/features/ai-helper/ui/AiHelperButton.test.tsx
git commit -m "feat(ai-helper): add tooltip, hover state, and modal trigger to AiHelperButton"
```

---

## Task 6: Manual verification

- [ ] **Step 1: Restart dev server** (required to pick up new translation keys)

```bash
# Kill existing dev server if running, then:
npm run dev
```

- [ ] **Step 2: Verify tooltip**

1. Open `http://localhost:3000`
2. Hover over the Bot icon in the header
3. Confirm tooltip shows "AI помощник" (Russian) or "AI Assistant" (English)

- [ ] **Step 3: Verify hover state**

1. Hover over the button
2. Confirm icon color lightens

- [ ] **Step 4: Verify modal and response**

1. Click the Bot icon
2. Confirm modal opens with title "AI помощник" / "AI Assistant"
3. Confirm textarea is present with placeholder
4. Confirm Send button is disabled initially
5. Type a message → Send button becomes active
6. Click Send → button disables, "Думаю..." / "Thinking..." appears
7. Wait for response → response text appears in modal (not toast)
