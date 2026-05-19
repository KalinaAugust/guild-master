# Dropdown min-width fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the Select dropdown is never narrower than its trigger button.

**Architecture:** Single CSS property change in `.content` class — replace `width: 100%` (broken in Radix UI Portal context) with `min-width: var(--radix-select-trigger-width)` (Radix UI CSS variable, automatically set to the trigger's measured width).

**Tech Stack:** Radix UI Select, CSS Modules

---

### Task 1: Fix `.content` width in Select.module.css

**Files:**
- Modify: `src/shared/ui/Select/Select.module.css:53-63`

> Note: JSDOM does not compute CSS, so `min-width` cannot be asserted in unit tests. Visual verification via dev server is the test for this change. Existing unit tests must still pass.

- [ ] **Step 1: Run existing tests to establish baseline**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 2: Apply the CSS fix**

In `src/shared/ui/Select/Select.module.css`, replace the `.content` block:

```css
/* before */
.content {
  background: #1a0b2e;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  box-shadow: var(--shadow-glass);
  z-index: 2000;
  /*min-width: 100%;*/
  width: 100%; /* This ensures the dropdown matches the trigger width */
  max-height: 300px;
  backdrop-filter: var(--glass-blur);
}
```

```css
/* after */
.content {
  background: #1a0b2e;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  box-shadow: var(--shadow-glass);
  z-index: 2000;
  min-width: var(--radix-select-trigger-width);
  max-height: 300px;
  backdrop-filter: var(--glass-blur);
}
```

- [ ] **Step 3: Run tests again to confirm nothing broke**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Verify visually in dev server**

```bash
npm run dev
```

Open http://localhost:3000, open the guild Select dropdown. Confirm:
- Dropdown is at least as wide as the trigger button.
- Long option labels ("My New Guild With a Lot of Friends...") make the dropdown grow wider than the trigger — this is correct behaviour.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/Select/Select.module.css
git commit -m "fix: set dropdown min-width to match trigger via Radix CSS variable"
```
