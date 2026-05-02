# Testing Infrastructure Setup Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a robust testing environment using Vitest and React Testing Library to enable Test-Driven Development (TDD) in the Guild Master project.

**Architecture:** We will integrate Vitest as the test runner (fast, Vite-compatible) and React Testing Library for component testing. We will also include `jsdom` for browser environment simulation and `jest-dom` for enhanced assertions.

**Tech Stack:** Vitest, React Testing Library, jsdom, @testing-library/jest-dom.

---

### Task 1: Install Testing Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

Run: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`

- [ ] **Step 2: Add test scripts to package.json**

Add `"test": "vitest"`, `"test:ui": "vitest --ui"`, and `"test:run": "vitest run"` to the `scripts` section.

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run"
  },
```

- [ ] **Step 3: Commit changes**

```bash
git add package.json
git commit -m "chore: install vitest and testing library dependencies"
```

---

### Task 2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Create Vitest configuration**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 2: Create test setup file**

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Verify vitest starts**

Run: `npm test -- --run`
Expected: "No test files found, exiting with code 0" (or similar success message).

- [ ] **Step 4: Commit changes**

```bash
git add vitest.config.ts src/test/setup.ts
git commit -m "chore: configure vitest and test setup"
```

---

### Task 3: Test Shared UI Component (Select)

**Files:**
- Create: `src/shared/ui/Select/Select.test.tsx`

- [ ] **Step 1: Write a test for the Select component**

```tsx
// src/shared/ui/Select/Select.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';
import { describe, it, expect, vi } from 'vitest';

describe('Select Component', () => {
  const options = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
  ];

  it('renders with placeholder', () => {
    render(<Select value="" onValueChange={() => {}} options={options} placeholder="Select an option" />);
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('calls onValueChange when an option is selected', async () => {
    const handleChange = vi.fn();
    render(<Select value="" onValueChange={handleChange} options={options} placeholder="Select an option" />);
    
    // Open select
    fireEvent.click(screen.getByRole('combobox'));
    
    // Select option (Radix UI portal)
    const option = await screen.findByText('Option 1');
    fireEvent.click(option);
    
    expect(handleChange).toHaveBeenCalledWith('1');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- src/shared/ui/Select/Select.test.tsx --run`
Expected: PASS

- [ ] **Step 3: Commit changes**

```bash
git add src/shared/ui/Select/Select.test.tsx
git commit -m "test(shared): add tests for Select component"
```

---

### Task 4: Test Redux Slice (uiSlice)

**Files:**
- Create: `src/entities/calendar/model/slice.test.ts`

- [ ] **Step 1: Write a test for the uiSlice**

```typescript
// src/entities/calendar/model/slice.test.ts
import { describe, it, expect } from 'vitest';
import reducer, { openEventModal, closeEventModal, setViewDate } from './slice';

describe('uiSlice', () => {
  const initialState = {
    isEventModalOpen: false,
    selectedDate: null,
    viewDate: new Date('2026-05-01').toISOString(),
  };

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(expect.objectContaining({
      isEventModalOpen: false,
    }));
  });

  it('should handle openEventModal', () => {
    const actual = reducer(initialState, openEventModal());
    expect(actual.isEventModalOpen).toBe(true);
  });

  it('should handle closeEventModal', () => {
    const state = { ...initialState, isEventModalOpen: true };
    const actual = reducer(state, closeEventModal());
    expect(actual.isEventModalOpen).toBe(false);
  });

  it('should handle setViewDate', () => {
    const newDate = '2026-06-01T00:00:00.000Z';
    const actual = reducer(initialState, setViewDate(newDate));
    expect(actual.viewDate).toBe(newDate);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- src/entities/calendar/model/slice.test.ts --run`
Expected: PASS

- [ ] **Step 3: Commit changes**

```bash
git add src/entities/calendar/model/slice.test.ts
git commit -m "test(calendar): add tests for uiSlice"
```

---

### Task 5: Update Documentation

**Files:**
- Modify: `GEMINI.md`

- [ ] **Step 1: Add testing information to GEMINI.md**

Update the "Key Commands" table and add a "Testing" section under "Development Conventions".

```markdown
## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the development server with hot-reloading. |
| `npm run build` | Compiles the application for production deployment. |
| `npm run start` | Runs the production-ready build. |
| `npm run lint` | Runs ESLint to check for code quality and style issues. |
| `npm test` | Runs tests in watch mode. |
| `npm run test:run` | Runs all tests once. |

## Development Conventions
...
- **Testing:** We use Vitest and React Testing Library for unit and integration tests. Follow TDD principles: write a failing test before implementing the logic.
```

- [ ] **Step 2: Commit changes**

```bash
git add GEMINI.md
git commit -m "docs: update GEMINI.md with testing instructions"
```
