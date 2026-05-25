# Night Sky Color Scheme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the purple color scheme with a dark blue "Ocean Night" palette across all CSS tokens and particle colors.

**Architecture:** All colors are CSS custom properties in `src/app/globals.css`. Particle colors are hardcoded strings in `particlesOptions` inside `ParticlesBackground.tsx`. No component logic changes — pure value substitution in 2 files.

**Tech Stack:** CSS custom properties, tsparticles config object (TypeScript)

---

## Files

- Modify: `src/app/globals.css` — update 9 CSS custom property values
- Modify: `src/shared/ui/ParticlesBackground/ParticlesBackground.tsx` — update `color.value` and `links.color` in `particlesOptions`

---

### Task 1: Update CSS color tokens

**Files:**
- Modify: `src/app/globals.css`

> CSS variable changes have no unit-testable surface — correctness is verified visually in Task 2.

- [ ] **Step 1: Replace all color tokens in `src/app/globals.css`**

Replace the entire `:root` block with:

```css
:root {
  /* Backgrounds */
  --bg-gradient: linear-gradient(135deg, #030d1a 0%, #0a2540 50%, #0e3460 100%);
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: blur(2px);

  /* Accents */
  --accent-primary: #38bdf8;
  --accent-secondary: #7dd3fc;
  --accent-yellow: #f59e0b;
  --accent-glow: rgba(56, 189, 248, 0.3);

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.6);
  --text-highlight: #bae6fd;

  /* Shadows */
  --shadow-glass: 0 25px 50px -12px rgba(0, 0, 0, 0.5);

  /* Modal */
  --modal-bg: #051020;

  /* Events */
  --event-raid: rgba(235, 64, 52, 0.3);
  --event-raid-border: #eb4034;
  --event-meeting: rgba(52, 152, 219, 0.3);
  --event-meeting-border: #3498db;
  --event-game: rgba(46, 204, 113, 0.3);
  --event-game-border: #2ecc71;
  --event-other: rgba(56, 189, 248, 0.2);
  --event-other-border: #38bdf8;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): replace purple tokens with ocean night blue palette"
```

---

### Task 2: Update particle colors

**Files:**
- Modify: `src/shared/ui/ParticlesBackground/ParticlesBackground.tsx:13-16`

- [ ] **Step 1: Run existing tests to get a green baseline**

```bash
npm run test:run
```

Expected: all tests pass (2 tests in `ParticlesBackground.test.tsx`, rest of suite green).

- [ ] **Step 2: Update particle and link colors in `particlesOptions`**

In `src/shared/ui/ParticlesBackground/ParticlesBackground.tsx`, change lines 13–16:

```ts
  particles: {
    color: { value: '#e2e8f0' },
    links: {
      enable: true,
      color: 'rgba(255, 255, 255, 0.3)',
      distance: 130,
      opacity: 0.35,
      width: 1,
    },
```

- [ ] **Step 3: Run tests — must still pass**

```bash
npm run test:run
```

Expected: same result as Step 1 — color values are not asserted in the existing tests.

- [ ] **Step 4: Start dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
- Background is deep dark blue (not purple)
- Particles appear white/silver like stars
- Calendar glass card has blue-tinted border and glow on today's date
- Event "other" badges are blue, not purple
- Amber/gold accent visible on any yellow-accented element

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/ParticlesBackground/ParticlesBackground.tsx
git commit -m "feat(shared/ui): change particle colors to white/silver for night sky theme"
```
