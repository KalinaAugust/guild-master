# Login/Register Redesign + Remove AI Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Supabase Auth UI login/registration form to match the app's dark glass theme (blue accent) and remove the AI helper button from the header.

**Architecture:** Keep `@supabase/auth-ui-react` `<Auth>` (auth logic untouched). Theme it via the library's `appearance.variables` (the supported theming API — not React inline styles) plus CSS-module `className` overrides for layout the variables don't cover. Separately, delete the `<AiHelperButton />` render + import from the server `Header` component.

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/auth-ui-react` + `@supabase/auth-ui-shared` (ThemeSupa), CSS Modules.

**Note on tests:** Project rule forbids new tests. Verification is `npm run lint` + manual visual check. No TDD steps in this plan.

**Note on inline styles:** Project forbids React inline styles. The `appearance.variables` object passed to `<Auth>` is the Supabase Auth UI theming API, not a React `style` prop — it is allowed. All bespoke layout/spacing goes in `*.module.css`.

---

## File Structure

- Modify: `src/features/auth/ui/LoginForm.tsx` — pass `appearance` (variables + className mapping) to `<Auth>`.
- Modify: `src/features/auth/ui/LoginForm.module.css` — glass container + overrides for button, inputs, anchors, divider, labels.
- Modify: `src/widgets/header/ui/Header.tsx` — remove `AiHelperButton` import and its render.

---

## Task 1: Remove AI helper button from header

**Files:**
- Modify: `src/widgets/header/ui/Header.tsx`

- [ ] **Step 1: Remove the import**

In `src/widgets/header/ui/Header.tsx`, delete this line:

```tsx
import { AiHelperButton } from '@/features/ai-helper';
```

- [ ] **Step 2: Remove the render**

In the same file, inside `<nav className={styles.nav}>`, delete this line:

```tsx
<AiHelperButton />
```

After the edit the `nav` block reads:

```tsx
      <nav className={styles.nav}>
        {user ? (
          <UserMenu email={user.email} />
        ) : (
          <div className={styles.authLinks}>
            <UserMenu />
            <Link href="/login" className={styles.loginLink}>
              {authT('login')}
            </Link>
          </div>
        )}
      </nav>
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: PASS, no unused-import error for `AiHelperButton`.

- [ ] **Step 4: Commit**

```bash
git add src/widgets/header/ui/Header.tsx
git commit -m "feat(header): remove AI helper button"
```

---

## Task 2: Theme the Auth form via appearance + glass container

**Files:**
- Modify: `src/features/auth/ui/LoginForm.tsx`
- Modify: `src/features/auth/ui/LoginForm.module.css`

- [ ] **Step 1: Replace `LoginForm.module.css` with the themed glass styles**

Overwrite `src/features/auth/ui/LoginForm.module.css` with:

```css
.container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 2.5rem 2rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-glass);
}

/* Primary submit button ("Sign in" / "Sign up") */
.button {
  width: 100%;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
}

/* Google provider button — glass surface, not a white pill */
.providerButton {
  width: 100%;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  font-weight: 500;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.providerButton:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent-primary);
}

.input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.label {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
  display: block;
}

.anchor {
  color: var(--text-secondary);
  text-decoration: underline;
  transition: color 0.15s ease;
}

.anchor:hover {
  color: var(--text-primary);
}

.divider {
  background: var(--glass-border);
}

.message {
  color: var(--text-primary);
}
```

- [ ] **Step 2: Wire the appearance object into `<Auth>`**

In `src/features/auth/ui/LoginForm.tsx`, replace the `<Auth>` element so it passes themed `appearance` using the app's CSS variables and the module classes. The full file becomes:

```tsx
'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/shared/api/supabase/client';
import { useEffect, useState } from 'react';
import styles from './LoginForm.module.css';

export const LoginForm = () => {
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!mounted) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={styles.container}>
      <Auth
        supabaseClient={supabase}
        providers={['google']}
        redirectTo={`${origin}/auth/callback`}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#38bdf8',
                brandAccent: '#0ea5e9',
                brandButtonText: '#ffffff',
                defaultButtonBackground: 'rgba(255, 255, 255, 0.05)',
                defaultButtonBackgroundHover: 'rgba(255, 255, 255, 0.1)',
                defaultButtonBorder: 'rgba(255, 255, 255, 0.1)',
                defaultButtonText: '#ffffff',
                inputBackground: 'rgba(255, 255, 255, 0.05)',
                inputBorder: 'rgba(255, 255, 255, 0.1)',
                inputBorderHover: '#38bdf8',
                inputBorderFocus: '#38bdf8',
                inputText: '#ffffff',
                inputLabelText: 'rgba(255, 255, 255, 0.7)',
                inputPlaceholder: 'rgba(255, 255, 255, 0.6)',
                messageText: '#ffffff',
                messageTextDanger: '#fca5a5',
                anchorTextColor: 'rgba(255, 255, 255, 0.7)',
                anchorTextHoverColor: '#ffffff',
                dividerBackground: 'rgba(255, 255, 255, 0.1)',
              },
              radii: {
                borderRadiusButton: '10px',
                inputBorderRadius: '10px',
              },
            },
          },
          className: {
            button: styles.button,
            input: styles.input,
            label: styles.label,
            anchor: styles.anchor,
            divider: styles.divider,
            message: styles.message,
          },
        }}
      />
    </div>
  );
};
```

Notes for the implementer:
- The hardcoded hex values mirror `globals.css` (`--accent-primary` `#38bdf8`, `--accent-hover` `#0ea5e9`, `--glass-bg` `rgba(255,255,255,0.05)`, `--glass-border` `rgba(255,255,255,0.1)`). The Auth `variables` API needs literal values, not `var(...)` (the styles are computed in JS by stitches, where CSS custom properties from `:root` are not guaranteed resolvable). The module.css uses the `var(...)` tokens directly.
- `className` keys map module classes onto Auth elements; these append to the library's stitches classes. Keep the bespoke layout there.
- The Google button is the library's "provider" button. ThemeSupa styles it via the `defaultButton*` color variables above (white→glass). `.providerButton` in the CSS is the fallback selector if a `providerButton` className mapping is needed; the `defaultButton*` variables are the primary mechanism, so leave `.providerButton` defined but it is acceptable if unused.

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual visual check**

Run: `npm run dev`, open `http://localhost:3000/login`.
Expected:
- Form sits in a translucent glass panel on the dark particle background — no white card.
- Email/password inputs: dark/glass background, white text, blue focus ring.
- Primary "Sign in" button: blue (`#38bdf8`), white text; hover darkens to `#0ea5e9`.
- Google button: glass surface with white text (not a solid white pill).
- "Forgot your password?" / "Don't have an account? Sign up" links: muted white, underlined, brighten on hover.
- No green anywhere.
- Click "Don't have an account? Sign up" → the sign-up view renders with the same theming.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/ui/LoginForm.tsx src/features/auth/ui/LoginForm.module.css
git commit -m "feat(auth): restyle login/register form to app glass theme"
```

---

## Task 3: Final verification

- [ ] **Step 1: Lint the whole project**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 2: Confirm AI button gone app-wide**

In `npm run dev`, load `/` and `/login`. Confirm the bot icon no longer appears in the header on either page.

- [ ] **Step 3: Confirm auth still works**

On `/login`, verify the Google button and the sign in/sign up toggle still function (logic unchanged — this is a smoke check, not a new test).

---

## Self-Review Notes

- **Spec coverage:** Spec change 1 (theme via appearance) → Task 2 Step 2. Change 2 (CSS overrides) → Task 2 Step 1. Change 3 (remove AI helper, keep feature files) → Task 1 (only Header touched; `features/ai-helper/*` untouched). Out-of-scope items respected: no new auth logic, no slice deletion, no new tests.
- **Placeholder scan:** No TBD/TODO; all code blocks are complete and final.
- **Type consistency:** className keys (`button`, `input`, `label`, `anchor`, `divider`, `message`) exist in both the `appearance.className` map and `LoginForm.module.css`. `.container`/`.providerButton` are container-level styles not mapped through Auth (container wraps `<Auth>` directly).
