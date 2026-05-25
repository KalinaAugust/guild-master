# Particles Background Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an animated full-screen background with particles connected by lines using tsParticles, layered over existing purple blob divs.

**Architecture:** A `ParticlesBackground` client component lives in `src/shared/ui/ParticlesBackground/`. It renders full-screen behind all content (`position: fixed; z-index: -1`) with a transparent background so the existing `bg-blob` ambient glow shows through. The component is mounted once in `src/app/layout.tsx`.

**Tech Stack:** `@tsparticles/react`, `@tsparticles/slim`, React (`useCallback`), CSS Modules, Vitest + React Testing Library

---

### Task 1: Install tsParticles packages

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
npm install @tsparticles/react @tsparticles/slim
```

Expected: packages added to `node_modules`, no peer-dependency errors.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @tsparticles/react and @tsparticles/slim"
```

---

### Task 2: Create ParticlesBackground component

**Files:**
- Create: `src/shared/ui/ParticlesBackground/ParticlesBackground.test.tsx`
- Create: `src/shared/ui/ParticlesBackground/ParticlesBackground.tsx`
- Create: `src/shared/ui/ParticlesBackground/ParticlesBackground.module.css`
- Create: `src/shared/ui/ParticlesBackground/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/shared/ui/ParticlesBackground/ParticlesBackground.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@tsparticles/react', () => ({
  default: ({ id }: { id: string }) => <div data-testid="particles" data-id={id} />,
  initParticlesEngine: vi.fn(() => Promise.resolve()),
}));
vi.mock('@tsparticles/slim', () => ({
  loadSlim: vi.fn(),
}));

import { ParticlesBackground } from './ParticlesBackground';

describe('ParticlesBackground', () => {
  it('renders the particles canvas container after init', async () => {
    render(<ParticlesBackground />);
    expect(await screen.findByTestId('particles')).toBeInTheDocument();
  });

  it('uses tsparticles as the element id', async () => {
    render(<ParticlesBackground />);
    expect(await screen.findByTestId('particles')).toHaveAttribute('data-id', 'tsparticles');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/shared/ui/ParticlesBackground
```

Expected: FAIL — `Cannot find module './ParticlesBackground'`

- [ ] **Step 3: Create the CSS module**

Create `src/shared/ui/ParticlesBackground/ParticlesBackground.module.css`:

```css
.root {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}
```

- [ ] **Step 4: Create the component**

Create `src/shared/ui/ParticlesBackground/ParticlesBackground.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import styles from './ParticlesBackground.module.css';

export function ParticlesBackground() {
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setEngineReady(true));
  }, []);

  if (!engineReady) return null;

  return (
    <Particles
      id="tsparticles"
      className={styles.root}
      options={{
        background: { color: { value: 'transparent' } },
        fpsLimit: 60,
        particles: {
          color: { value: '#9d4edd' },
          links: {
            enable: true,
            color: '#c8b6ff',
            distance: 130,
            opacity: 0.35,
            width: 1,
          },
          move: { enable: true, speed: 1.5 },
          number: {
            density: { enable: true, area: 800 },
            value: 60,
          },
          opacity: { value: 0.5 },
          shape: { type: 'circle' },
          size: { value: { min: 2, max: 4 } },
        },
        interactivity: {
          events: {
            onHover: { enable: true, mode: 'repulse' },
          },
          modes: {
            repulse: { distance: 80, duration: 0.4 },
          },
        },
        detectRetina: true,
      }}
    />
  );
}
```

- [ ] **Step 5: Create the public API index**

Create `src/shared/ui/ParticlesBackground/index.ts`:

```ts
export { ParticlesBackground } from './ParticlesBackground';
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm run test:run -- src/shared/ui/ParticlesBackground
```

Expected: 2 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/shared/ui/ParticlesBackground/
git commit -m "feat(shared/ui): add ParticlesBackground component with connecting lines"
```

---

### Task 3: Integrate into root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add ParticlesBackground to layout**

In `src/app/layout.tsx`, add the import and render the component inside `<body>` before `NextIntlClientProvider`:

```tsx
import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import "./globals.css";
import StoreProvider from "./providers/StoreProvider";
import { Header } from "@/widgets/header";
import { ParticlesBackground } from "@/shared/ui/ParticlesBackground";

export const metadata: Metadata = {
  title: "Guild Master",
  description: "Guild management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <div className="bg-blob" />
        <div className="bg-blob bg-blob-secondary" />
        <ParticlesBackground />
        <NextIntlClientProvider messages={messages}>
          <StoreProvider>
            <Toaster position="top-right" richColors closeButton theme="dark" />
            <Header />
            <div style={{ padding: '0 2rem' }}>
              {children}
            </div>
          </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Run the dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000` and confirm:
- Particles with connecting lines appear on the background
- The purple blob glow is still visible underneath
- Content (header, pages) appears above the particles
- No console errors

- [ ] **Step 3: Run full test suite**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(layout): integrate ParticlesBackground animation"
```
