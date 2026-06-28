# Marketing Landing Page — Design

Date: 2026-06-28
Status: Approved (design), pending implementation plan

## Goal

Add a public marketing landing page at `/` to drive inbound traffic. Primary CTA
is registration/login (links to existing `/login`). The current authenticated
home (calendar) moves to `/home`.

## Decisions (locked)

- **URL:** landing at `/`; app home moves to `/home`.
- **Primary CTA:** registration/login → `/login`.
- **Sections:** compact, 4 sections (Hero, Features, Final CTA, Footer).
- **Shell architecture:** Next.js **route groups** (Variant A).
- **i18n:** bilingual (en + ru), via `next-intl`, new `Landing` namespace.

## Architecture: route groups

Split the App Router into two shells. Route groups are URL-transparent, so no
public URL changes for existing routes.

```
src/app/
  layout.tsx            → BARE root: <html>/<body>, fonts, background blobs,
                          ParticlesBackground, NextIntlClientProvider, StoreProvider,
                          Toaster. No Sidebar/Header/appShell.
  (marketing)/
    layout.tsx          → marketing shell (renders <LandingHeader>/<LandingFooter>
                          via the widget; minimal wrapper)
    page.tsx            → composes <LandingPage /> (route: /)
  (app)/
    layout.tsx          → app shell: Sidebar (user-gated) + Header + appShell
                          content wrapper + CopyrightFooter + PageTransition.
                          Holds the current chrome logic from today's layout.tsx.
    home/page.tsx        → current calendar home (moved from app/page.tsx)
    HomePage.module.css  → moved alongside
    guilds/  events/  guild-chat/  announcements/  looking-for-group/
    profile/  day/  design-system/  auth/  login/  → all current route folders
                          move under (app)/ unchanged.
  api/                  → stays at src/app/api/ (route group not needed; transport layer)
  providers/  globals.css  icon.svg  PageTransition.tsx  CopyrightFooter.tsx
                          → shared infra; referenced by the (app) layout.
```

### What moves where (root layout.tsx today → split)

Today `layout.tsx` does: html/body + fonts + bg blobs + ParticlesBackground +
NextIntlClientProvider + StoreProvider + Toaster + (user-gated Sidebar) +
appShell(Header + content/PageTransition + CopyrightFooter).

- **Root `layout.tsx` (new, bare):** html/body, fonts, bg blobs,
  ParticlesBackground, NextIntlClientProvider (+ requiredNamespaces filtering),
  StoreProvider, Toaster. Renders `{children}` directly. The `body` `noRail`
  class logic stays here (still keyed on `user`/route as appropriate).
- **`(app)/layout.tsx`:** user-gated Sidebar + appShell(Header + content +
  PageTransition + CopyrightFooter). `getUser()` lives here.
- **`(marketing)/layout.tsx`:** thin; the landing widget supplies its own header
  and footer, so this layout is mostly a pass-through wrapper (optional class).

> Note: nested layouts compose top-down. The bare root layout wraps both groups,
> so marketing pages never receive the app chrome. This is the only clean way to
> have two distinct shells.

## proxy.ts changes (point edits)

- Add `isLandingPage = request.nextUrl.pathname === '/'` to the public allowlist
  (treat like `/login`): guests may view `/`.
- Logged-in user on `/` → `redirect('/home')` (marketing page is for guests).
- After-login redirect (`new URL('/', request.url)`, proxy.ts:120) → `'/home'`.
- `/home` and all other app routes remain protected by default (not in the
  exempt list).

## Internal link/redirect updates (`/` meaning "app home" → `/home`)

- `src/widgets/sidebar/model/navItems.ts:11` — Calendar item `href: '/'` → `'/home'`.
- `src/widgets/sidebar/ui/Sidebar.tsx:71` — active-check special case
  `item.href !== '/'` → `'/home'`.
- `src/app/profile/page.tsx:16` — `redirect('/')` → `redirect('/home')`.
- `src/app/events/[publicId]/AccessDenied.tsx:20` — `<Link href="/">` → `/home`.
- `src/app/day/[date]/page.tsx:42` — back `<Link href="/">` → `/home`.

(Paths above are pre-move; after moving folders under `(app)/`, edit them there.)

## FSD placement — landing widget

New widget slice `src/widgets/landing/`:

```
widgets/landing/
  index.ts              → export { LandingPage }
  ui/
    LandingPage.tsx     → composes the 4 sections
    LandingHeader.tsx   → logo + "Войти" CTA + language switcher (client)
    Hero.tsx            → headline + subhead + primary CTA → /login
    Features.tsx        → 3 feature cards (calendar, guild chat, announcements/LFG)
    FinalCta.tsx        → repeated CTA → /login
    LandingFooter.tsx   → copyright + language switcher
    *.module.css        → CSS Modules per component, design-system tokens,
                          glassmorphism; NO inline styles.
```

- `(marketing)/page.tsx` imports `LandingPage` from `@/widgets/landing`.
- Language switcher reuses the existing `features/language-switcher` slice
  (widgets may import features — allowed direction).
- CTAs are `next/link` to `/login`.

## Content (compact, 4 sections)

1. **Hero** — product headline + subheadline + primary CTA button → `/login`.
2. **Features** — 3 cards: Event Calendar, Guild Chat, Announcements & LFG.
3. **Final CTA** — closing pitch + CTA button → `/login`.
4. **Footer** — copyright line + language switcher.

(Copy is intentionally minimal v1; easy to iterate.)

## i18n

- New namespace `Landing` in `messages/en.json` AND `messages/ru.json` (full key
  parity). Keys: hero headline/subhead/cta, feature card titles+blurbs (×3),
  final CTA headline+button, login link label.
- Register `Landing` in `requiredNamespaces` in the **root** `layout.tsx` (the
  bare one), since `LandingHeader`/switcher are client components consuming it.
- Reuse `Common` verbs where applicable (e.g. login/sign-in label if present).

## Out of scope (v1)

- Waitlist/email capture (CTA is login only).
- Testimonials, FAQ, screenshots/demo, pricing.
- SEO metadata tuning beyond a basic `metadata` export on the landing page
  (title/description) — can be a follow-up.

## Verification

- `pnpm build` succeeds; `/` renders landing for guests, redirects to `/home`
  when logged in.
- `/home` shows the calendar (former `/`); guests on `/home` → `/login`.
- Sidebar Calendar link points to `/home` and highlights correctly.
- `pnpm lint` / `pnpm lint:fsd` clean (modulo known baseline failures).
- Both locales render with no `MISSING_MESSAGE`.
