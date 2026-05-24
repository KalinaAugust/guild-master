# Tooltip Component Design

**Date:** 2026-05-24
**Branch:** add-tooltips

## Goal

Add a reusable `Tooltip` component to `shared/ui` wrapping `@radix-ui/react-tooltip` primitives.

## Package

Install `@radix-ui/react-tooltip`. Consistent with existing project dependencies (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-dropdown-menu`).

## File Structure

```
src/shared/ui/Tooltip/
  Tooltip.tsx        — component
  Tooltip.module.css — styles
  index.ts           — public API
```

## Component API

```tsx
<Tooltip content={<span>Any React node</span>} side="top">
  <button>Trigger</button>
</Tooltip>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `React.ReactNode` | required | Tooltip content — text, elements, or components |
| `children` | `React.ReactElement` | required | Trigger element |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` | Preferred side |
| `delayDuration` | `number` | `400` | Open delay in ms |

### Internals

Thin wrapper over Radix primitives:
- `TooltipPrimitive.Root` — controls open state
- `TooltipPrimitive.Trigger asChild` — renders the child element as trigger
- `TooltipPrimitive.Portal` — renders content in document body
- `TooltipPrimitive.Content` — the bubble, styled via CSS Module

## TooltipProvider

`TooltipPrimitive.Provider` is added once in `src/app/layout.tsx`, wrapping the full app. This is the Radix-recommended approach — one provider per app.

## Styles (Tooltip.module.css)

Minimal base styles the user will customize:
- Background, border-radius, box-shadow, padding, font-size
- Entrance animation via `@keyframes` (fade + slide)
- Arrow via `TooltipPrimitive.Arrow`

## Testing

Unit test for `Tooltip.tsx` using Vitest + React Testing Library, per project TDD conventions:
- Renders trigger
- Shows content on hover (via `userEvent.hover`)
