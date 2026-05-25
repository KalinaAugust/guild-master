# Particles Background Animation

## Goal

Replace the static purple gradient blobs with a dynamic animated background featuring particles connected by lines, using tsParticles.

## Approach

Keep existing `bg-blob` divs (they provide the purple ambient glow). Add a `ParticlesBackground` client component on top of them, behind all content (`z-index: -1`).

## Component

**Location:** `src/shared/ui/ParticlesBackground/`

- `ParticlesBackground.tsx` — `'use client'` component using `@tsparticles/react` + `loadSlim`
- `index.ts` — public API re-export

**Particle config:**
- Background: transparent (blobs show through)
- Particles: color `#9d4edd`, count ~60, size 2–4px
- Links: enabled, color `#c8b6ff`, distance 130, opacity 0.35, width 1
- Move: speed 1.5
- Interactivity: hover repulse (subtle)

**Positioning:** `position: fixed`, `top: 0`, `left: 0`, `width: 100%`, `height: 100%`, `z-index: -1`

## Integration

Add `<ParticlesBackground />` to `src/app/layout.tsx` alongside the existing `bg-blob` divs, inside `<body>` before `NextIntlClientProvider`.

## Packages

- `@tsparticles/react`
- `@tsparticles/slim`
