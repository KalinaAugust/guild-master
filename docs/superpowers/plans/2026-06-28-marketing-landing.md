# Marketing Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public marketing landing page at `/` (CTA → `/login`) and move the authenticated calendar home to `/home`, using Next.js route groups for two distinct shells.

**Architecture:** Split `src/app` into a bare root layout wrapping two route groups — `(marketing)/` (its own minimal shell, holds the landing) and `(app)/` (the current Sidebar + Header + appShell, holds every existing route). Route groups are URL-transparent, so existing URLs are unchanged except the old `/` calendar which becomes `/home`. The landing is a new `widgets/landing` FSD slice.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, next-intl, Vitest + @testing-library/react.

## Global Constraints

- FSD layer order app → widgets → features → entities → shared; import only through a slice's `index.ts` barrel. Landing UI lives in `widgets/landing`; it may import `features/language-switcher` (lower layer).
- CSS Modules only (`*.module.css`); **no inline styles**. Use design-system tokens: `--accent-primary` (#2d9ed0), `--accent-hover`, `--text-primary`, `--text-secondary`, `--text-muted`, `--glass-bg`, `--glass-border`, `--glass-blur`, `--shadow-glass`.
- i18n: every user-facing string via next-intl; keys added to **both** `messages/en.json` and `messages/ru.json` in full parity. New client namespace `Landing` MUST be registered in `requiredNamespaces` in the root `layout.tsx` or it throws `MISSING_MESSAGE`.
- `backdrop-filter`: write both `-webkit-backdrop-filter` and `backdrop-filter`. No other vendor prefixes.
- Auth/routing lives in `src/proxy.ts` (NOT `middleware.ts`).
- Baseline `pnpm tsc` has 3 pre-existing errors and `pnpm lint:fsd` 2 pre-existing insignificant-slice warnings — ignore those when verifying; only new failures count.

---

## File Structure

```
src/app/
  layout.tsx              MODIFY → bare root (html/body, fonts, bg, particles,
                                   intl provider + requiredNamespaces, store, toaster,
                                   noRail body class). Renders {children} only.
  globals.css             unchanged
  icon.svg                unchanged
  providers/              unchanged
  api/                    unchanged (route handlers stay at src/app/api)
  (marketing)/
    layout.tsx            CREATE → pass-through wrapper (landing supplies header/footer)
    page.tsx              CREATE → composes <LandingPage /> + page metadata (route: /)
  (app)/
    layout.tsx            CREATE → app shell: getUser, Sidebar (user-gated) + UserMenu,
                                   appShell(Header + content/PageTransition + CopyrightFooter)
    Layout.module.css     MOVE from src/app/
    CopyrightFooter.tsx   MOVE from src/app/ (pathname check '/' → '/home')
    PageTransition.tsx    MOVE from src/app/
    home/
      page.tsx            MOVE from src/app/page.tsx
      HomePage.module.css MOVE from src/app/
    announcements/  auth/  day/  design-system/  events/  guild-chat/
    guilds/  login/  looking-for-group/  profile/   MOVE from src/app/ unchanged

src/widgets/landing/      CREATE (new FSD slice)
  index.ts
  ui/LandingPage.tsx + .module.css
  ui/LandingHeader.tsx + .module.css
  ui/Hero.tsx + .module.css
  ui/Features.tsx + .module.css
  ui/FinalCta.tsx + .module.css
  ui/LandingFooter.tsx + .module.css
  ui/LandingPage.test.tsx

src/proxy.ts              MODIFY (landing public, redirects → /home)
src/widgets/sidebar/model/navItems.ts   MODIFY ('/' → '/home')
src/widgets/sidebar/ui/Sidebar.tsx      MODIFY (active-check special case)
messages/en.json, messages/ru.json      MODIFY (Landing namespace)
```

---

## Task 1: Route-group split — move app routes & split the layout

**Files:**
- Modify: `src/app/layout.tsx` (becomes bare root)
- Create: `src/app/(app)/layout.tsx`, `src/app/(marketing)/layout.tsx`
- Move: every current route folder + `page.tsx`/`HomePage.module.css` + `Layout.module.css` + `CopyrightFooter.tsx` + `PageTransition.tsx` into `src/app/(app)/`
- Test: `pnpm build`

**Interfaces:**
- Produces: app home at `/home`; bare root `layout.tsx` exporting `requiredNamespaces` chrome; `(app)/layout.tsx` owning Sidebar/Header/appShell.

- [ ] **Step 1: Create the two route-group dirs and move app routes into `(app)/`**

```bash
cd src/app
mkdir -p "(app)" "(marketing)"
# move every existing route folder (NOT api, providers, globals.css, icon.svg, layout.tsx)
for d in announcements auth day design-system events guild-chat guilds login looking-for-group profile; do git mv "$d" "(app)/$d"; done
# app home: src/app/page.tsx -> (app)/home/page.tsx
mkdir -p "(app)/home"
git mv page.tsx "(app)/home/page.tsx"
git mv HomePage.module.css "(app)/home/HomePage.module.css"
# shell pieces consumed by the app layout
git mv Layout.module.css "(app)/Layout.module.css"
git mv CopyrightFooter.tsx "(app)/CopyrightFooter.tsx"
git mv PageTransition.tsx "(app)/PageTransition.tsx"
cd ../..
```

- [ ] **Step 2: Fix the moved home page's CSS import**

`src/app/(app)/home/page.tsx` imports `./HomePage.module.css` — already correct (moved together). No edit needed. Verify the import line reads `import styles from './HomePage.module.css';`.

- [ ] **Step 3: Write the bare root `src/app/layout.tsx`**

Replace the file's body with the bare shell (keeps fonts, bg, particles, intl + requiredNamespaces, store, toaster, noRail body class; drops Sidebar/Header/appShell/CopyrightFooter):

```tsx
import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import "./globals.css";
import "@/shared/design-system/tokens.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });
const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-unbounded", display: "swap" });

import StoreProvider from "./providers/StoreProvider";
import { getUser } from "@/entities/user/api/getUser";
import { ParticlesBackground } from "@/shared/ui/ParticlesBackground";
import shell from './(app)/Layout.module.css';

export const metadata: Metadata = {
  title: "Guild Master",
  description: "Guild management system",
};

const requiredNamespaces = [
  'Common', 'Event', 'Guild', 'GuildDetail', 'EventComments', 'EventDetail',
  'GuildChat', 'DirectMessages', 'GuildPoll', 'Announcements', 'CallToAction',
  'GuildMembers', 'UpcomingEvents', 'Notifications', 'AiHelper', 'Auth',
  'DateTimePicker', 'PrivateNote', 'UpdateProfile', 'Landing',
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const user = await getUser();

  const filteredMessages = Object.keys(messages)
    .filter((key) => requiredNamespaces.includes(key))
    .reduce<typeof messages>((obj, key) => { obj[key] = messages[key]; return obj; }, {});

  return (
    <html lang={locale} className={`${manrope.variable} ${unbounded.variable}`}>
      <body className={user ? undefined : shell.noRail}>
        <div className="bg-blob" />
        <div className="bg-blob bg-blob-secondary" />
        <ParticlesBackground />
        <NextIntlClientProvider messages={filteredMessages}>
          <StoreProvider>
            <Toaster position="top-right" richColors closeButton theme="dark" />
            {children}
          </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

> Note: `Landing` was added to `requiredNamespaces`. The `Landing` keys themselves are added in Task 4 — harmless until then (filter just won't find the key).

- [ ] **Step 4: Create `src/app/(app)/layout.tsx` with the app shell**

```tsx
import { Header, UserMenu } from "@/widgets/header";
import { Sidebar } from "@/widgets/sidebar";
import { getUser } from "@/entities/user/api/getUser";
import { resolveDisplayName } from '@/entities/user';
import { CopyrightFooter } from "./CopyrightFooter";
import { PageTransition } from "./PageTransition";
import styles from './Layout.module.css';

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();

  return (
    <>
      {user && (
        <Sidebar
          footer={
            <UserMenu
              publicId={user.profile?.publicId}
              email={user.email}
              avatarUrl={user.profile?.avatarUrl}
              name={resolveDisplayName({
                fullName: user.profile?.fullName ?? null,
                alias: user.profile?.alias ?? null,
                displayAsAlias: user.profile?.displayAsAlias ?? false,
              })}
              icon={user.profile?.icon ?? null}
            />
          }
        />
      )}
      <div className={styles.appShell}>
        <Header />
        <div className={styles.content}>
          <PageTransition>{children}</PageTransition>
        </div>
        <CopyrightFooter />
      </div>
    </>
  );
}
```

- [ ] **Step 5: Create `src/app/(marketing)/layout.tsx` (pass-through)**

```tsx
export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
```

- [ ] **Step 6: Create a temporary `(marketing)/page.tsx` so `/` resolves**

(Replaced by the real landing in Task 6; needed now so the build has a `/` route.)

```tsx
export default function Page() {
  return <main>Landing placeholder</main>;
}
```

- [ ] **Step 7: Build to verify the split compiles and routes resolve**

Run: `pnpm build`
Expected: build succeeds. Route list shows `/` and `/home` (plus all moved routes at their unchanged URLs). No "two parallel pages resolve to /" error.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(app): split routes into (app)/(marketing) groups, move home to /home"
```

---

## Task 2: Repoint `/` "app home" links & redirects to `/home`

**Files:**
- Modify: `src/widgets/sidebar/model/navItems.ts:11`
- Modify: `src/widgets/sidebar/ui/Sidebar.tsx:71`
- Modify: `src/app/(app)/profile/page.tsx` (`redirect('/')`)
- Modify: `src/app/(app)/events/[publicId]/AccessDenied.tsx` (`<Link href="/">`)
- Modify: `src/app/(app)/day/[date]/page.tsx` (back `<Link href="/">`)
- Modify: `src/app/(app)/CopyrightFooter.tsx` (`pathname !== '/'`)
- Test: `src/widgets/sidebar/ui/Sidebar.test.tsx` (run, expect green)

**Interfaces:**
- Consumes: route-group layout from Task 1.
- Produces: every "go to app home" path resolves to `/home`.

- [ ] **Step 1: Sidebar Calendar nav item → `/home`**

In `src/widgets/sidebar/model/navItems.ts`, change the first item:

```ts
  { href: '/home', icon: Calendar, labelKey: 'Common.calendar' },
```

- [ ] **Step 2: Sidebar active-check special case → `/home`**

In `src/widgets/sidebar/ui/Sidebar.tsx`, the active computation guards the index route. Change:

```ts
const active = pathname === item.href || (item.href !== '/home' && pathname.startsWith(`${item.href}/`));
```

- [ ] **Step 3: profile redirect → `/home`**

In `src/app/(app)/profile/page.tsx`:

```ts
  if (!profile) redirect('/home');
```

- [ ] **Step 4: AccessDenied home link → `/home`**

In `src/app/(app)/events/[publicId]/AccessDenied.tsx`:

```tsx
      <Link href="/home" className={styles.homeLink}>
```

- [ ] **Step 5: Day-page back link → `/home`**

In `src/app/(app)/day/[date]/page.tsx`:

```tsx
      <Link href="/home" className={styles.backLink}>
```

- [ ] **Step 6: CopyrightFooter renders on app home only → `/home`**

In `src/app/(app)/CopyrightFooter.tsx`:

```tsx
  if (pathname !== '/home') return null;
```

- [ ] **Step 7: Run the sidebar test**

Run: `pnpm test:run src/widgets/sidebar/ui/Sidebar.test.tsx`
Expected: PASS (the suite asserts on `/guilds`, unaffected by the `/`→`/home` change).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: repoint app-home links and redirects to /home"
```

---

## Task 3: proxy.ts — make `/` public, redirect to `/home`

**Files:**
- Modify: `src/proxy.ts` (route-guard block around lines 109-121)
- Test: manual (covered by Task 6 build/flow check)

**Interfaces:**
- Consumes: `/home` app route (Task 1).
- Produces: guests may view `/`; logged-in users on `/` → `/home`; post-login → `/home`.

- [ ] **Step 1: Add the landing to the public allowlist and redirect logged-in users off `/`**

In `src/proxy.ts`, the guard block currently reads:

```ts
  // Protect all routes except /login and /auth/callback
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth');
  const isGuildDetailPage = request.nextUrl.pathname.match(/^\/guilds\/[^/]+/) !== null;
  const isPublicProfilePage = request.nextUrl.pathname.match(/^\/profile\/[^/]+/) !== null;

  if (!user && !isLoginPage && !isAuthCallback && !isGuildDetailPage && !isPublicProfilePage) {
    return finalize(NextResponse.redirect(new URL('/login', request.url)));
  }

  if (user && isLoginPage) {
    return finalize(NextResponse.redirect(new URL('/', request.url)));
  }
```

Replace it with (adds `isLandingPage`, exempts it for guests, redirects logged-in users from `/` to `/home`, and sends post-login users to `/home`):

```ts
  // Protect all routes except the landing (/), /login and /auth/callback
  const isLandingPage = request.nextUrl.pathname === '/';
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth');
  const isGuildDetailPage = request.nextUrl.pathname.match(/^\/guilds\/[^/]+/) !== null;
  const isPublicProfilePage = request.nextUrl.pathname.match(/^\/profile\/[^/]+/) !== null;

  if (!user && !isLandingPage && !isLoginPage && !isAuthCallback && !isGuildDetailPage && !isPublicProfilePage) {
    return finalize(NextResponse.redirect(new URL('/login', request.url)));
  }

  if (user && (isLoginPage || isLandingPage)) {
    return finalize(NextResponse.redirect(new URL('/home', request.url)));
  }
```

- [ ] **Step 2: Typecheck the proxy**

Run: `pnpm tsc --noEmit`
Expected: no *new* errors beyond the 3 known baseline errors.

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(proxy): public landing at /, redirect authed users to /home"
```

---

## Task 4: i18n — add the `Landing` namespace

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`
- (`Landing` already registered in `requiredNamespaces` in Task 1.)

**Interfaces:**
- Produces: `useTranslations('Landing')` keys used by Task 5.

- [ ] **Step 1: Add the `Landing` block to `messages/en.json`**

Add this top-level key (match the file's existing formatting; place it alphabetically or at the end of the object):

```json
  "Landing": {
    "nav": { "login": "Sign in" },
    "hero": {
      "title": "Run your guild like a pro",
      "subtitle": "Calendar, chat, and announcements for your gaming community — all in one place.",
      "cta": "Get started"
    },
    "features": {
      "calendar": { "title": "Event calendar", "body": "Plan raids, sessions, and meetups. Everyone sees what's next." },
      "chat": { "title": "Guild chat", "body": "Real-time chat and direct messages keep your members in sync." },
      "community": { "title": "Announcements & LFG", "body": "Post announcements and rally members with Looking-for-Group calls." }
    },
    "finalCta": {
      "title": "Ready to organize your guild?",
      "cta": "Join now"
    }
  }
```

- [ ] **Step 2: Add the matching `Landing` block to `messages/ru.json` (full parity)**

```json
  "Landing": {
    "nav": { "login": "Войти" },
    "hero": {
      "title": "Управляйте гильдией как профи",
      "subtitle": "Календарь, чат и анонсы для вашего игрового сообщества — всё в одном месте.",
      "cta": "Начать"
    },
    "features": {
      "calendar": { "title": "Календарь событий", "body": "Планируйте рейды, сессии и встречи. Все видят, что дальше." },
      "chat": { "title": "Чат гильдии", "body": "Чат в реальном времени и личные сообщения держат участников в курсе." },
      "community": { "title": "Анонсы и LFG", "body": "Публикуйте анонсы и собирайте участников через Looking-for-Group." }
    },
    "finalCta": {
      "title": "Готовы навести порядок в гильдии?",
      "cta": "Присоединиться"
    }
  }
```

- [ ] **Step 3: Validate both JSON files parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "i18n: add Landing namespace (en/ru)"
```

---

## Task 5: `widgets/landing` slice — build the landing UI

**Files:**
- Create: `src/widgets/landing/index.ts`
- Create: `src/widgets/landing/ui/LandingPage.tsx` (+ `.module.css`)
- Create: `src/widgets/landing/ui/LandingHeader.tsx` (+ `.module.css`)
- Create: `src/widgets/landing/ui/Hero.tsx` (+ `.module.css`)
- Create: `src/widgets/landing/ui/Features.tsx` (+ `.module.css`)
- Create: `src/widgets/landing/ui/FinalCta.tsx` (+ `.module.css`)
- Create: `src/widgets/landing/ui/LandingFooter.tsx` (+ `.module.css`)
- Test: `src/widgets/landing/ui/LandingPage.test.tsx`

**Interfaces:**
- Consumes: `Landing` namespace (Task 4); `setUserLocale` from `@/features/language-switcher`.
- Produces: `export { LandingPage }` from `@/widgets/landing` — a server component rendering header + hero + features + final CTA + footer.

- [ ] **Step 1: Write the failing render test**

`src/widgets/landing/ui/LandingPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/features/language-switcher', () => ({
  setUserLocale: vi.fn(),
}));

import { LandingPage } from '../index';

describe('LandingPage', () => {
  it('renders hero and CTA links to /login', () => {
    render(<LandingPage />);
    expect(screen.getByText('hero.title')).toBeInTheDocument();
    const ctas = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/login');
    expect(ctas.length).toBeGreaterThanOrEqual(2); // header + hero + final
  });

  it('renders three feature cards', () => {
    render(<LandingPage />);
    expect(screen.getByText('features.calendar.title')).toBeInTheDocument();
    expect(screen.getByText('features.chat.title')).toBeInTheDocument();
    expect(screen.getByText('features.community.title')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:run src/widgets/landing/ui/LandingPage.test.tsx`
Expected: FAIL — cannot resolve `../index` / `LandingPage` undefined.

- [ ] **Step 3: Create the LanguageSwitcher (client) used by header & footer**

`src/widgets/landing/ui/LanguageSwitcher.tsx`:

```tsx
'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { setUserLocale } from '@/features/language-switcher';
import styles from './LanguageSwitcher.module.css';

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: string) => {
    if (next === locale || isPending) return;
    startTransition(() => { setUserLocale(next); });
  };

  return (
    <div className={styles.switcher}>
      <button type="button" onClick={() => switchTo('en')} aria-pressed={locale === 'en'}
        className={locale === 'en' ? styles.active : styles.option}>EN</button>
      <button type="button" onClick={() => switchTo('ru')} aria-pressed={locale === 'ru'}
        className={locale === 'ru' ? styles.active : styles.option}>RU</button>
    </div>
  );
};
```

`src/widgets/landing/ui/LanguageSwitcher.module.css`:

```css
.switcher { display: inline-flex; gap: 0.25rem; }
.option, .active {
  appearance: none; -webkit-appearance: none;
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-sm, 8px);
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}
.option:hover { color: var(--text-primary); }
.active {
  color: var(--text-primary);
  background: var(--glass-bg);
}
```

- [ ] **Step 4: Create the LandingHeader**

`src/widgets/landing/ui/LandingHeader.tsx`:

```tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './LandingHeader.module.css';

export const LandingHeader = () => {
  const t = useTranslations('Landing');
  return (
    <header className={styles.header}>
      <span className={styles.logo}>Guild Master</span>
      <nav className={styles.nav}>
        <LanguageSwitcher />
        <Link href="/login" className={styles.loginLink}>{t('nav.login')}</Link>
      </nav>
    </header>
  );
};
```

`src/widgets/landing/ui/LandingHeader.module.css`:

```css
.header {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem clamp(1rem, 5vw, 4rem);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--glass-border);
}
.logo { font-family: var(--font-unbounded), sans-serif; font-weight: 700; color: var(--text-primary); font-size: 1.1rem; }
.nav { display: flex; align-items: center; gap: 1rem; }
.loginLink {
  color: var(--text-primary); text-decoration: none; font-weight: 600; font-size: 0.95rem;
  padding: 0.4rem 1rem; border-radius: var(--radius-sm, 8px);
  border: 1px solid var(--glass-border);
  transition: background 0.2s ease;
}
.loginLink:hover { background: var(--glass-bg); }
```

- [ ] **Step 5: Create the Hero**

`src/widgets/landing/ui/Hero.tsx`:

```tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './Hero.module.css';

export const Hero = () => {
  const t = useTranslations('Landing');
  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>{t('hero.title')}</h1>
      <p className={styles.subtitle}>{t('hero.subtitle')}</p>
      <Link href="/login" className={styles.cta}>{t('hero.cta')}</Link>
    </section>
  );
};
```

`src/widgets/landing/ui/Hero.module.css`:

```css
.hero {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 1.5rem; padding: clamp(4rem, 12vw, 9rem) 1.5rem 5rem;
  max-width: 820px; margin: 0 auto;
}
.title {
  font-family: var(--font-unbounded), sans-serif;
  font-size: clamp(2.2rem, 6vw, 4rem); line-height: 1.05; font-weight: 800;
  color: var(--text-primary); margin: 0;
}
.subtitle { font-size: clamp(1.05rem, 2.2vw, 1.35rem); color: var(--text-secondary); margin: 0; max-width: 620px; }
.cta {
  margin-top: 0.5rem; text-decoration: none; font-weight: 700; font-size: 1.05rem;
  color: #fff; background: var(--accent-primary);
  padding: 0.85rem 2.2rem; border-radius: var(--radius-md, 12px);
  box-shadow: var(--shadow-glass);
  transition: background 0.2s ease, transform 0.1s ease;
}
.cta:hover { background: var(--accent-hover); }
.cta:active { transform: translateY(1px); }
```

- [ ] **Step 6: Create the Features section (3 cards)**

`src/widgets/landing/ui/Features.tsx`:

```tsx
import { useTranslations } from 'next-intl';
import { Calendar, MessagesSquare, Megaphone } from 'lucide-react';
import styles from './Features.module.css';

export const Features = () => {
  const t = useTranslations('Landing');
  const cards = [
    { Icon: Calendar, title: t('features.calendar.title'), body: t('features.calendar.body') },
    { Icon: MessagesSquare, title: t('features.chat.title'), body: t('features.chat.body') },
    { Icon: Megaphone, title: t('features.community.title'), body: t('features.community.body') },
  ];
  return (
    <section className={styles.features}>
      {cards.map(({ Icon, title, body }) => (
        <article key={title} className={styles.card}>
          <Icon className={styles.icon} aria-hidden />
          <h3 className={styles.cardTitle}>{title}</h3>
          <p className={styles.cardBody}>{body}</p>
        </article>
      ))}
    </section>
  );
};
```

`src/widgets/landing/ui/Features.module.css`:

```css
.features {
  display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  max-width: 1080px; margin: 0 auto; padding: 2rem clamp(1rem, 5vw, 4rem) 4rem;
}
.card {
  display: flex; flex-direction: column; gap: 0.75rem; padding: 2rem 1.75rem;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg, 16px);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
}
.icon { width: 32px; height: 32px; color: var(--accent-secondary); }
.cardTitle { font-family: var(--font-unbounded), sans-serif; font-size: 1.25rem; color: var(--text-primary); margin: 0; }
.cardBody { color: var(--text-secondary); font-size: 0.98rem; line-height: 1.5; margin: 0; }
```

- [ ] **Step 7: Create the FinalCta**

`src/widgets/landing/ui/FinalCta.tsx`:

```tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './FinalCta.module.css';

export const FinalCta = () => {
  const t = useTranslations('Landing');
  return (
    <section className={styles.finalCta}>
      <h2 className={styles.title}>{t('finalCta.title')}</h2>
      <Link href="/login" className={styles.cta}>{t('finalCta.cta')}</Link>
    </section>
  );
};
```

`src/widgets/landing/ui/FinalCta.module.css`:

```css
.finalCta {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.5rem;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem;
  max-width: 720px; margin: 0 auto;
}
.title { font-family: var(--font-unbounded), sans-serif; font-size: clamp(1.6rem, 4vw, 2.5rem); color: var(--text-primary); margin: 0; }
.cta {
  text-decoration: none; font-weight: 700; font-size: 1.05rem; color: #fff;
  background: var(--accent-primary); padding: 0.85rem 2.2rem;
  border-radius: var(--radius-md, 12px); box-shadow: var(--shadow-glass);
  transition: background 0.2s ease;
}
.cta:hover { background: var(--accent-hover); }
```

- [ ] **Step 8: Create the LandingFooter**

`src/widgets/landing/ui/LandingFooter.tsx`:

```tsx
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './LandingFooter.module.css';

export const LandingFooter = () => (
  <footer className={styles.footer}>
    <span className={styles.copyright}>
      © {new Date().getFullYear()}{' '}
      <a href="https://t.me/KalinaAugust" target="_blank" rel="noopener noreferrer" className={styles.link}>Denis Kalinin</a>
      . All rights reserved.
    </span>
    <LanguageSwitcher />
  </footer>
);
```

`src/widgets/landing/ui/LandingFooter.module.css`:

```css
.footer {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
  padding: 1.5rem clamp(1rem, 5vw, 4rem);
  border-top: 1px solid var(--glass-border);
  font-size: 0.85rem; color: var(--text-muted);
}
.link { color: #fff; font-weight: 600; text-decoration: none; }
.link:hover { text-decoration: underline; }
```

- [ ] **Step 9: Create LandingPage composition**

`src/widgets/landing/ui/LandingPage.tsx`:

```tsx
import { LandingHeader } from './LandingHeader';
import { Hero } from './Hero';
import { Features } from './Features';
import { FinalCta } from './FinalCta';
import { LandingFooter } from './LandingFooter';
import styles from './LandingPage.module.css';

export const LandingPage = () => (
  <div className={styles.page}>
    <LandingHeader />
    <main className={styles.main}>
      <Hero />
      <Features />
      <FinalCta />
    </main>
    <LandingFooter />
  </div>
);
```

`src/widgets/landing/ui/LandingPage.module.css`:

```css
.page { display: flex; flex-direction: column; min-height: 100dvh; }
.main { flex: 1; }
```

- [ ] **Step 10: Create the barrel**

`src/widgets/landing/index.ts`:

```ts
export { LandingPage } from './ui/LandingPage';
```

- [ ] **Step 11: Run the test to verify it passes**

Run: `pnpm test:run src/widgets/landing/ui/LandingPage.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 12: Commit**

```bash
git add src/widgets/landing
git commit -m "feat(landing): add landing widget (hero, features, CTA, footer)"
```

---

## Task 6: Wire the landing into `(marketing)/page.tsx` & verify the full flow

**Files:**
- Modify: `src/app/(marketing)/page.tsx` (replace the Task 1 placeholder)
- Test: `pnpm build` + route/flow verification

**Interfaces:**
- Consumes: `LandingPage` from `@/widgets/landing` (Task 5).

- [ ] **Step 1: Replace the placeholder page with the real landing + metadata**

`src/app/(marketing)/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { LandingPage } from '@/widgets/landing';

export const metadata: Metadata = {
  title: 'Guild Master — organize your gaming guild',
  description: 'Calendar, chat, and announcements for your gaming community — all in one place.',
};

export default function Page() {
  return <LandingPage />;
}
```

- [ ] **Step 2: Full build**

Run: `pnpm build`
Expected: build succeeds; `/` and `/home` both present in the route table; no duplicate-route or MISSING_MESSAGE errors.

- [ ] **Step 3: Lint (FSD + ESLint)**

Run: `pnpm lint && pnpm lint:fsd`
Expected: no *new* violations beyond the 2 known baseline insignificant-slice warnings. Confirm `widgets/landing` raises no import-direction errors.

- [ ] **Step 4: Manual flow check (dev server)**

Run: `pnpm dev`, then verify:
- Guest `GET /` → landing renders (header, hero, 3 cards, final CTA, footer); CTA links point to `/login`.
- Guest `GET /home` → redirected to `/login`.
- Logged-in user `GET /` → redirected to `/home` (calendar).
- Logged-in user `/home` → calendar renders; sidebar Calendar item active and links to `/home`.
- Switch language EN↔RU on the landing → copy updates.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(marketing)/page.tsx"
git commit -m "feat(landing): serve landing at / via (marketing) route group"
```

---

## Self-Review

**Spec coverage:**
- Landing at `/`, app → `/home` → Tasks 1, 6. ✓
- CTA → `/login` → Tasks 5 (links), 6. ✓
- Route groups (Variant A) → Task 1. ✓
- proxy changes (public `/`, redirect authed to `/home`, post-login `/home`) → Task 3. ✓
- Internal `/`→`/home` link/redirect updates (5 spots + CopyrightFooter) → Task 2. ✓
- `widgets/landing` slice + 4 sections + own header/footer → Task 5. ✓
- i18n `Landing` namespace (en/ru) + requiredNamespaces registration → Tasks 4 + 1. ✓
- CSS Modules, design tokens, glassmorphism, backdrop-filter both-prefixed → Task 5 CSS. ✓
- Out of scope (waitlist, testimonials, FAQ) → not introduced. ✓

**Placeholder scan:** No TBD/TODO; all steps carry full code. The Task 1 `(marketing)/page.tsx` placeholder is intentional and explicitly replaced in Task 6.

**Type consistency:** `LandingPage` exported from `index.ts` (Task 5 Step 10) and imported in Task 6 Step 1 — names match. `setUserLocale` signature `(locale: string)` matches the existing feature API. `requiredNamespaces` includes `Landing` (Task 1) and the namespace is created (Task 4).
