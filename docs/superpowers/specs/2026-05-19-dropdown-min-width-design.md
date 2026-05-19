# Dropdown min-width fix

**Date:** 2026-05-19

## Problem

`Select.module.css` `.content` uses `width: 100%`, which in a Radix UI Portal context resolves to the portal container width, not the trigger width. Result: dropdown can be narrower than the trigger.

## Solution

Replace `width: 100%` with `min-width: var(--radix-select-trigger-width)` in `.content`. Radix UI sets this CSS variable on the content element automatically to match the trigger's measured width.

This allows the dropdown to grow wider for long options (e.g. "My New Guild With a Lot of Friends...") while never being narrower than the trigger.

## Change

**File:** `src/shared/ui/Select/Select.module.css`

```css
/* before */
.content {
  /*min-width: 100%;*/
  width: 100%;
}

/* after */
.content {
  min-width: var(--radix-select-trigger-width);
}
```

No other files are affected.
