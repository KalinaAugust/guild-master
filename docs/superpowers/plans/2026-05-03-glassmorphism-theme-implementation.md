# Glassmorphism Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Guild Master into a modern dark theme with Glassmorphism effects and purple accents, using CSS variables for all styles.

**Architecture:** Implement a centralized theme system in global CSS and update component-level CSS modules to consume these variables. Use `backdrop-filter` for glass effects and CSS animations for background decorative elements.

**Tech Stack:** Next.js, CSS Modules, Lucide React (icons).

---

### Task 1: Define Global CSS Variables

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update globals.css with theme variables**

Add root variables and global background.

```css
:root {
  /* Backgrounds */
  --bg-gradient: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: blur(16px);
  
  /* Accents */
  --accent-primary: #9d4edd;
  --accent-secondary: #c8b6ff;
  --accent-glow: rgba(157, 78, 221, 0.3);
  
  /* Text */
  --text-primary: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.6);
  --text-highlight: #c8b6ff;

  /* Shadows */
  --shadow-glass: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  
  /* Events (Amethyst-themed palette) */
  --event-raid: rgba(235, 64, 52, 0.3);
  --event-raid-border: #eb4034;
  --event-meeting: rgba(52, 152, 219, 0.3);
  --event-meeting-border: #3498db;
  --event-game: rgba(46, 204, 113, 0.3);
  --event-game-border: #2ecc71;
  --event-other: rgba(157, 78, 221, 0.3);
  --event-other-border: #9d4edd;
}

html, body {
  background: var(--bg-gradient);
  background-attachment: fixed;
  color: var(--text-primary);
  min-height: 100vh;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style: define global glassmorphism theme variables"
```

### Task 2: Implement Background Animation (Blobs)

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add blob animation to globals.css**

```css
@keyframes move-blob {
  0% { transform: translate(-10%, -10%) scale(1); }
  50% { transform: translate(20%, 30%) scale(1.1); }
  100% { transform: translate(-5%, 15%) scale(1); }
}

.bg-blob {
  position: fixed;
  width: 500px;
  height: 500px;
  background: var(--accent-primary);
  filter: blur(100px);
  border-radius: 50%;
  z-index: -1;
  opacity: 0.15;
  pointer-events: none;
  animation: move-blob 25s infinite alternate ease-in-out;
}

.bg-blob-secondary {
  background: var(--accent-secondary);
  animation-duration: 35s;
  animation-delay: -5s;
  left: 30%;
  top: 20%;
}
```

- [ ] **Step 2: Add blob elements to RootLayout**

```tsx
// src/app/layout.tsx
// ... inside body, before {children}
<div className="bg-blob" />
<div className="bg-blob bg-blob-secondary" />
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: add animated background blobs"
```

### Task 3: Refactor CalendarGrid Styles

**Files:**
- Modify: `src/widgets/calendar/ui/CalendarGrid.module.css`

- [ ] **Step 1: Update CalendarGrid styles to use variables and glass effects**

```css
.container {
  padding: 2rem;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--shadow-glass);
}

.header {
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 24px;
  margin-bottom: 24px;
}

.navButton {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.navButton:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent-primary);
}

.grid {
  background-color: transparent;
  border: none;
  gap: 12px;
}

.dayHeader {
  background: transparent;
  color: var(--accent-secondary);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
}

.day {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.day:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.2);
}

.today {
  background: var(--accent-glow);
  border-color: var(--accent-primary);
}

.otherMonth {
  opacity: 0.3;
}

.eventItem {
  border-radius: 6px;
  border-left-width: 3px;
  border-left-style: solid;
}

.event_raid { background: var(--event-raid); border-left-color: var(--event-raid-border); }
.event_game { background: var(--event-game); border-left-color: var(--event-game-border); }
.event_meeting { background: var(--event-meeting); border-left-color: var(--event-meeting-border); }
.event_other { background: var(--event-other); border-left-color: var(--event-other-border); }
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/calendar/ui/CalendarGrid.module.css
git commit -m "style: implement glassmorphism in CalendarGrid"
```

### Task 4: Update Select Component Styles

**Files:**
- Modify: `src/shared/ui/Select/Select.module.css`

- [ ] **Step 1: Update Select styles to match dark theme**

```css
.select {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  backdrop-filter: var(--glass-blur);
}

.select:focus {
  border-color: var(--accent-primary);
  outline: none;
}

/* Ensure the native select or custom dropdown items are styled */
.select option {
  background: #1a0b2e; /* Solid background for options since blur might not work on native select */
  color: var(--text-primary);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/ui/Select/Select.module.css
git commit -m "style: update Select component for dark theme"
```

### Task 5: Final Visual Verification

- [ ] **Step 1: Check application in development mode**

Run: `npm run dev`
Verify:
1. Background has purple gradient and animated blobs.
2. Calendar has glass effect and blur.
3. Hover effects on days work (lift + brighten).
4. Colors are consistent and use CSS variables.

- [ ] **Step 2: Commit any final tweaks**

```bash
git commit -m "style: final theme polish"
```
