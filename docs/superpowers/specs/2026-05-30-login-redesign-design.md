# Login/Register Redesign + Remove AI Helper from Header

Date: 2026-05-30

## Goal

1. Restyle the login/registration form to match the app's dark "glass" theme (blue accent), replacing the default Supabase Auth UI light theme.
2. Remove the AI helper button from the header entirely.

## Context

- `/login` (`src/app/login/page.tsx`) renders `<LoginForm>` (`src/features/auth/ui/LoginForm.tsx`).
- `LoginForm` uses `@supabase/auth-ui-react` `<Auth>` with default `ThemeSupa` (light, white card — clashes with the dark app).
- Sign in and sign up share the same `/login` route (sign up is a view inside the Auth component). No separate `/register` page.
- The dark gradient + particles background is already provided globally by `layout.tsx` (`ParticlesBackground` + `.bg-blob`).
- `Header` (`src/widgets/header/ui/Header.tsx`) is a server component in the root layout; it renders `<AiHelperButton />`.

## Approach

Keep `@supabase/auth-ui-react`. Restyle via `appearance` (theme variables) + CSS-module overrides. Do not reimplement auth logic (Google OAuth, sign in/up toggle, forgot password, redirect stay in the library).

## Changes

### 1. `LoginForm.tsx` — theme the Auth component

Pass `appearance` to `<Auth>` using the app's existing CSS variables (read from `globals.css`):

- `colors.brand` / `brandAccent` → `--accent-primary` (#38bdf8) / `--accent-hover` (#0ea5e9)
- `brandButtonText` → `#ffffff`
- `inputBackground` → transparent / `--glass-bg`
- `inputBorder` → `--glass-border` (rgba(255,255,255,0.1))
- `inputBorderFocus` / `inputBorderHover` → `--accent-primary`
- `inputText` → `--text-primary` (#ffffff)
- `inputLabelText` → `--text-secondary`
- `inputPlaceholder` → `--text-muted`
- `anchorTextColor` → `--text-secondary`
- `messageText` → `--text-primary`
- `dividerBackground` → `--glass-border`

Attach `className` keys from `appearance` so the module.css can target specific parts (container, button, anchor, input, label, divider).

### 2. `LoginForm.module.css` / `LoginPage.module.css` — overrides not covered by variables

- Container: a glass panel — `--glass-bg` background, `--glass-border`, blur, rounded corners — centered on the layout's particle background. No white card.
- Google button: `--glass-bg` background, light border, white text, hover lightens — consistent with app surfaces (not a white pill).
- Inputs: rounded, transparent/glass background, `--glass-border`, white text, focus ring `--accent-primary`.
- Primary submit button: full width, `--accent-primary` background, white text, rounded, `--accent-hover` on hover.
- Bottom links ("Forgot your password?", "Don't have an account? Sign up"): `--text-secondary`, underline, hover → `--text-primary`.

Constraint: CSS Modules only, no inline styles (per project conventions). The `appearance.variables` object passed to `<Auth>` is the library's theming API (not React inline styles) and is allowed.

### 3. `Header.tsx` — remove AI helper

- Remove the `<AiHelperButton />` render from the `nav`.
- Remove the `import { AiHelperButton } from '@/features/ai-helper';` line.
- Leave the `src/features/ai-helper/*` files in place (out of scope).

## Out of scope

- No new auth logic, no custom form.
- No deletion of the `ai-helper` feature slice.
- No changes to other pages/widgets.
- No new tests (per project rule).

## Verification

- `/login` renders the form blending into the dark background, blue accent button, white-on-glass inputs, readable labels/links — no white card, no green.
- Sign in / sign up toggle and Google button still work (unchanged logic).
- AI bot button no longer appears in the header on any page.
- `npm run lint` passes.
