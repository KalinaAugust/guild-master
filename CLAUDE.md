# Guild Master

Guild Master is a guild management system built with Next.js, following the **Feature-Sliced Design (FSD)** architectural pattern. It provides tools for organizing guild activities, starting with a comprehensive calendar system.

## Technology Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library:** [React 19.2.4](https://react.dev/)
- **Architecture:** [Feature-Sliced Design (FSD)](https://feature-sliced.design/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **State Management:** [Redux Toolkit](https://redux-toolkit.js.org/) with RTK Query (`@reduxjs/toolkit/query/react`) and `react-redux`
- **Styling:** [CSS Modules](https://github.com/css-modules/css-modules)
- **Runtime:** [Node.js](https://nodejs.org/)

## Project Structure

- `src/app/`: Next.js App Router directory (layouts, pages, and providers). Store is configured in `src/app/providers/StoreProvider/`.
- `src/shared/`: Reusable code with no business logic — `ui/` (Button, Modal, Select, Tooltip, …), `api/` (baseApi, Supabase clients), `lib/` (hooks, dayjs), `types/`.
- `src/entities/`: Domain entities (calendar, event, guild, user) — data models and RTK Query API slices.
- `src/features/`: Feature slices (auth, create-event, event-detail, language-switcher, update-profile-avatar, create-guild).
- `src/widgets/`: Composed UI blocks (calendar, day-events, header).
- `src/shared/api/baseApi.ts`: Single RTK Query `createApi` instance; all feature APIs extend it via `injectEndpoints`.
- `src/app/api/`: Next.js route handlers that serve as the HTTP transport layer for RTK Query.
- `public/`: Static assets (images, icons, etc.).
- `docs/`: Project documentation and implementation plans.

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- pnpm (recommended package manager)

### Installation

```bash
pnpm install
```

### Running the Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Building for Production

```bash
pnpm build
pnpm start
```

## Development Conventions

- **Architecture:** Strictly adhere to **Feature-Sliced Design (FSD)** principles and Next.js App Router patterns. Organize code into standardized layers, keep business logic in slices, and keep components focused on rendering. The detailed FSD rules below are enforced — the `fsd-reviewer` agent provides an automated check, and `pnpm lint:fsd` runs steiger.

### FSD Rules

- **Layer order (top → bottom):** `app` → `pages` → `widgets` → `features` → `entities` → `shared`. This project uses the Next.js App Router, so `pages` is replaced by `src/app/` (route handlers + page composition); active slice layers are `widgets`, `features`, `entities`, `shared`. The `processes` layer is deprecated (FSD v2.1) — do not introduce it.
- **Import direction:** A module may import from another slice **only if that slice is on a strictly lower layer.** Same-layer cross-imports are forbidden — a feature must not import another feature, a widget another widget, an entity another entity. Lift shared logic down a layer or compose both in a higher one. `shared` (no slices, segments only) and `app` (may import everything) are exempt.
- **Public API:** Import a slice only through its `index.ts` barrel — never reach into its internal files (e.g. import from `entities/event`, not `entities/event/ui/EventCard`).
- **Entity cross-imports (`@x`):** The only legitimate same-layer import, and only on `entities`. When entity A needs entity B, expose `entities/B/@x/A` and import `import type { ... } from "entities/B/@x/A"`. Keep these minimal; never use `@x` outside `entities`.
- **Segments (technical purpose, not type):** Inside a slice use `ui/`, `model/` (store, schemas, business logic), `api/`, `lib/` (internal helpers), `config/`. Do not create top-level segments named after types (`components/`, `hooks/`, `types/`).
- **Slices** are named by business domain and must be mutually independent within a layer. **`shared`** holds only reusable, domain-agnostic code — never let business-coupled code accumulate there.
- **Data Fetching:** Use RTK Query for all server data. Add endpoints via `injectEndpoints` on `baseApi` (`src/shared/api/baseApi.ts`) within the relevant FSD slice (`entities/*/api/*Api.ts`, `features/*/api/*Api.ts`). Never use `createAsyncThunk` for data fetching. Route handlers in `src/app/api/` are the transport layer — Supabase calls belong there, not in client components.
- **State Management:** Use Redux Toolkit slices only for pure UI/client state (e.g., selected date, active guild). Custom hooks `useAppDispatch` and `useAppSelector` from `src/shared/lib/hooks.ts` should be used for type-safe store interaction.
- **Internationalization (i18n):** ALWAYS add translations — never hardcode user-facing strings. This covers visible text, placeholders, `toast` messages, and accessibility text (`aria-label`, `alt`). Every string must go through `next-intl`: keys live in `messages/en.json` AND `messages/ru.json` (keep both files in full key parity), consumed via `useTranslations('<Namespace>')` in client components or `getTranslations` in server components. New client-facing namespaces MUST be registered in `requiredNamespaces` in `src/app/layout.tsx`, or they throw `MISSING_MESSAGE`. Reuse generic verbs/nouns from the `Common` namespace (`edit`, `save`, `cancel`, …) instead of duplicating them per slice. Exception: purely technical identifiers that are never shown as prose (e.g. lucide icon names used as `aria-label`).
- **Component Styling:** Use CSS Modules (`*.module.css`) for component-specific styles to ensure scoping and prevent collisions. **NEVER use inline styles.** All styles must align with [design-system.md](file:///Users/deniskalinin/frontend/guild-master/docs/design-system.md).
- **Design System:** Strictly adhere to the colors, typography, glassmorphism, and styling conventions defined in [design-system.md](file:///Users/deniskalinin/frontend/guild-master/docs/design-system.md). Update this file in sync with any modifications to `src/app/globals.css`.
- **Type Safety:** Maintain strict TypeScript typing. Interfaces should be defined in `src/shared/types/index.ts` or close to their usage if specific to a single module. `React.FormEvent` is deprecated in React 19 — use `React.SubmitEvent` for form submit handlers instead. `React.MouseEvent` is not deprecated and can be used as-is.
- **Client Components:** Use the `'use client';` directive only for components that require interactivity or browser APIs (like those using Redux hooks).
- **Browser verification:** Do NOT launch the browser to verify changes unless the user explicitly asks. Make the code change and stop; let the user check it in the browser themselves.
- **Changes and Modifications:** Do NOT make any code modifications, fixes, or changes without explicit instruction or request from the user.
- **Clarification first:** If you do not know how to proceed, face ambiguous requirements, or have multiple implementation paths, ALWAYS stop and ask the user clarifying questions. Do not make assumptions. Start working on the code only after receiving answers to all questions.
- **CLAUDE.md hygiene:** After any task that changes infrastructure, global state patterns, routing conventions, or other project-wide rules — update this file to reflect the new reality before closing the task.


## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Starts the development server with hot-reloading. |
| `pnpm build` | Compiles the application for production deployment. |
| `pnpm start` | Runs the production-ready build. |
| `pnpm lint` | Runs ESLint to check for code quality and style issues. |
| `pnpm test` | Runs tests in watch mode. |
| `pnpm test:run` | Runs all tests once. |
| `pnpm test:ui` | Starts Vitest UI for interactive test debugging. |

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Authentication and Proxy Logic

This project does **NOT** use the standard `middleware.ts`.
1. All request interception, route protection, and locale handling lives in **`src/proxy.ts`**.
2. To protect new routes or change redirect logic — edit `src/proxy.ts`.
3. Do not create `middleware.ts` in the project root.
4. **Content-Security-Policy** is also set in `src/proxy.ts` — a per-request, nonce-based policy (`script-src 'nonce-…' 'strict-dynamic'`). Next.js auto-applies the nonce to its own scripts; app code can read it via `headers().get('x-nonce')`. Any new inline `<script>` must carry that nonce or it will be blocked. External script/img/connect origins must be added to the matching directive in `buildCsp()`. Static, route-agnostic headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) live in `next.config.mjs` → `headers()`.

## Route Handler Authorization Model

Authorization in `src/app/api/*` route handlers follows a two-tier model — do not add redundant checks that contradict it:

1. **Baseline (RLS):** Every data-layer function (`fetchEvents`, `createEvent`, `getGuildMembers`, …) talks to Supabase through the **user-session** `createClient()`. Row-Level Security therefore governs every read and write. Plain read endpoints (`GET /api/events`, `GET /api/guilds/[id]/members`) rely on RLS alone and intentionally carry no explicit `auth.getUser()` call.
2. **Role elevation:** Endpoints that mutate guild membership or settings add an **explicit** role gate on top of RLS via the helpers in `src/shared/api/guildAuth.ts`:
   - `requireUser()` → resolves the session or returns a 401 response.
   - `requireGuildRole(supabase, guildId, userId, roles)` → 403 unless the caller holds one of `roles`.
   - `requireGuildOwner(supabase, guildId, userId)` → 403 unless the caller owns the guild.
   - `requireGuildPermission(supabase, guildId, userId, action)` → 403 unless the guild's **permissions matrix** admits the caller's role for `action` (one of `events` \| `announcements` \| `polls` \| `call_to_actions`). Reads `guilds.permissions` + the caller's role and delegates to the pure resolver `canPerform` in `src/shared/api/guildPermissions.ts` (the single source of truth, also used client-side by `useGuildPermissions` and by the `getGuildAnnouncements`/`getCallToActions` `canCreate` flags). Levels → roles: `all`=MEMBER/ADMIN/OWNER, `officers`=ADMIN/OWNER, `owner`=OWNER. Defaults for a NULL/missing key preserve prior behavior: `events`/`announcements`=officers, `polls`/`call_to_actions`=all. The matrix governs **creation only** (the four create routes `POST /api/events`, `…/announcements`, `…/polls`, `…/call-to-actions` use it); edit/delete and ADMIN/OWNER moderation are unchanged. The owner edits the matrix via `PATCH /api/guilds/[id]` (already owner-gated — no extra check) in the guild wizard's Settings tab.

The AI helper (`POST /api/ai-helper`) is an authenticated, guild-scoped endpoint: it requires a session and guild membership, and validates that any event it edits belongs to the requested `guildId`.

When adding a route, pick the tier deliberately: pure reads → RLS only; privileged mutations → `requireUser` + the matching role helper.

## Supabase (SSR)

When creating a Supabase client on the server (Server Components or `proxy.ts`):
1. Always use `getAll()` and `setAll()` for cookie handling.
2. **Forbidden:** legacy `get`, `set`, and `remove` methods — incompatible with async cookie APIs in Next.js 15+.
3. Client initialization example:
    ```typescript
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          )
        },
      },
    })
    ```

## Database Schema (Supabase)

| Table | Key columns |
|---|---|
| `profiles` | `id` (uuid, FK → auth.users), `public_id` (unique 8-char base62, used in `/profile/[publicId]` URLs), `full_name`, `avatar_url`, `updated_at`, `alias`, `display_as_alias` (bool — show alias instead of name app-wide), `icon` (lucide name, no privacy), `about`, `interests` (text[]), `socials` (jsonb `[{platform,value}]`), `birth_date` (date), `email` (text — denormalized copy of `auth.users.email`, synced via the `handle_new_user` / `handle_user_email_update` triggers), `last_seen_at` (timestamptz — presence; refreshed by a throttled heartbeat in `src/proxy.ts`, ≤ once per 5 min via the `ls_hb` cookie; not privacy-gated), `privacy` (jsonb map `field→'private'\|'guildmates'\|'public'`; visibility computed server-side, not via RLS; keys include `birth_date`, `email`) |
| `guilds` | `id`, `public_id` (unique 8-char base62, default `generate_public_id()`, NOT NULL, used in `/guilds/[publicId]` URLs), `name`, `description`, `avatar_url`, `owner_id` (FK → profiles), `permissions` (jsonb, nullable — per-action **create** permissions map `{events\|announcements\|polls\|call_to_actions: 'all'\|'officers'\|'owner'}`; NULL or a missing key falls back to app defaults; resolved via `canPerform` in `src/shared/api/guildPermissions.ts`, enforced server-side by `requireGuildPermission`) |
| `guild_members` | `id`, `guild_id`, `user_id`, `role` (OWNER\|ADMIN\|MEMBER), `status` (PENDING\|ACCEPTED\|REJECTED) |
| `events` | `id`, `public_id` (unique 8-char base62, default `generate_public_id()`, NOT NULL, used in `/events/[publicId]` URLs; recurring occurrences are addressed as `{public_id}_{YYYY-MM-DD}`), `guild_id`, `title`, `description`, `event_date`, `end_date` (timestamptz, nullable — optional event end; when the end time is ≤ the start time it rolls to the next day; for recurring events the per-occurrence end is derived by shifting `end_date` by the occurrence's day offset), `type`, `created_by` |
| `event_participants` | `id`, `event_id`, `user_id`, `status` (pending\|confirmed\|declined) |
| `polls` | `id`, `guild_id`, `created_by`, `title`, `description`, `is_anonymous`, `allow_multiple`, `allow_custom`, `allow_revote`, `closed_at`, `created_at` |
| `poll_options` | `id`, `poll_id`, `body`, `position`, `is_custom`, `created_by` |
| `poll_votes` | `id`, `poll_id`, `option_id`, `user_id` — `unique(option_id, user_id)` |
| `guild_messages` | `id`, `guild_id`, `user_id`, `body`, `attachment_url` (text, nullable — public URL of an optional image attachment in the `chat-attachments` bucket), `created_at`, `updated_at`. RLS: select/insert for guild members, update/delete own. **Realtime-enabled** (in the `supabase_realtime` publication, `REPLICA IDENTITY FULL`): the chat subscribes to Postgres Changes filtered by `guild_id`; RLS gates delivery. |
| `direct_messages` | `id`, `user_id`, `target_user_id`, `body`, `attachment_url` (nullable), `created_at`, `updated_at`. RLS: select/insert for sender or receiver, update/delete own. **Realtime-enabled**. |
| `announcements` | `id`, `guild_id`, `created_by`, `title`, `content` (markdown source), `is_pinned`, `created_at`, `updated_at`. RLS: select for guild members; insert/update/delete only `ADMIN`/`OWNER` (`has_guild_role`). Feed served on `/announcements`. |
| `announcement_comments` | `id`, `announcement_id` (cascade), `user_id`, `body`, `created_at`, `updated_at`. RLS: select for members, insert own, delete by author or `ADMIN`/`OWNER`. Not editable. |
| `announcement_reactions` | `id`, `announcement_id` (cascade), `user_id`, `type` (`like\|dislike\|heart\|celebrate\|insightful`) — `unique(announcement_id, user_id, type)`. RLS: select for members, insert/delete own. |
| `call_to_actions` | `id`, `guild_id` (cascade), `created_by`, `title`, `description`, `type` (event activity type), `event_date` (timestamptz — planned date+time), `end_date` (timestamptz, nullable — optional planned end, copied into the launched event), `target_count` (int ≥1), `event_id` (nullable FK → `events`, set on launch), `launched_at` (nullable), `created_at`, `updated_at`. RLS: select for members; insert by **any** member; update/delete by author or `ADMIN`/`OWNER` (`has_guild_role`). Feed served on `/looking-for-group`. |
| `call_to_action_interests` | `id`, `cta_id` (cascade), `user_id`, `created_at` — `unique(cta_id, user_id)`. The "I'm in" presses. RLS: select for members, insert/delete own. |
| `announcement_reads` | `id`, `guild_id` (cascade), `user_id`, `last_read_at` — `unique(guild_id, user_id)`. Per-guild last-seen timestamp for the announcements feed; drives the sidebar unread dot. Mirror of `guild_message_reads`. RLS: select/insert/update own row only. |
| `call_to_action_reads` | `id`, `guild_id` (cascade), `user_id`, `last_read_at` — `unique(guild_id, user_id)`. Per-guild last-seen timestamp for the Call to Action feed; drives the sidebar unread dot. RLS: select/insert/update own row only. |
| `direct_message_reads` | `id`, `user_id`, `target_user_id`, `last_read_at` — `unique(user_id, target_user_id)`. Per-conversation last-seen timestamp for DMs. RLS: select/insert/update own row only. |
| `user_notes` | `user_id` (FK → profiles, cascade — note author), `target_user_id` (FK → profiles, cascade — who the note is about; FK named `user_notes_target_user_id_fkey`), `note` (text, 1–2000 chars), `created_at`, `updated_at`. Composite **PK `(user_id, target_user_id)`** so the PATCH upsert (`/api/user-notes/[targetUserId]`) dedupes per author/target without an explicit `onConflict`. Private per-author notes shown on `/profile/[publicId]`. RLS: author may select/insert/update/delete only rows where `user_id = auth.uid()`. |

**Notification triggers:** INSERT on `call_to_actions` fires `trg_notify_new_call_to_action` → `notify_new_call_to_action()`; INSERT on `announcements` fires `trg_notify_new_announcement` → `notify_new_announcement()`. Both insert a `new_call_to_action` / `new_announcement` row into `notifications` for every guild member except `created_by`. Matching cleanup triggers (`trg_delete_call_to_action_notifications`, `trg_delete_announcement_notifications`) remove those notifications on DELETE.

**Call to Action RPCs** (the page's mutations go through these, not direct table writes):
- `create_call_to_action(p_guild_id, p_title, p_description, p_type, p_event_date, p_target_count, p_end_date default null) → uuid` — inserts the CTA (including the optional `end_date`) and the creator's own interest (counter starts at 1), then attempts launch. Member-gated.
- `toggle_call_to_action_interest(p_cta_id)` — adds/removes the caller's interest (cancel allowed only before launch), then attempts launch on add.
- `launch_call_to_action(p_cta_id) → uuid` — SECURITY DEFINER (EXECUTE revoked from `anon`, granted to `authenticated`): manually launches a CTA before `target_count` is reached. Permission-gated: caller must be the CTA's `created_by` OR hold `ADMIN`/`OWNER` via `has_guild_role`. Raises if the CTA is already launched (`event_id IS NOT NULL`) or expired (`event_date < now()`). Delegates actual event creation to `_do_launch_cta(p_cta_id)` and returns the new event's uuid. Exposed via `POST /api/guilds/[id]/call-to-actions/[ctaId]/launch`.
- `_do_launch_cta(p_cta_id)` — internal shared helper (EXECUTE revoked from `anon`/`authenticated`): creates the `events` row from the CTA (carrying over the CTA's `end_date`), copies all interested users into `event_participants` (`confirmed`), and stamps `event_id`/`launched_at`. Called by both `launch_call_to_action` (manual path) and `_maybe_launch_cta` (threshold path).
- `_maybe_launch_cta(p_cta_id)` — internal helper (EXECUTE revoked from `anon`/`authenticated`): when interested count ≥ `target_count` and not yet launched, delegates to `_do_launch_cta` (shared with the manual launch path). This is how a reached threshold auto-creates the calendar event.

**Guild RPC:**
- `transfer_guild_ownership(p_guild_id, p_new_owner_id)` — SECURITY DEFINER (EXECUTE revoked from `anon`, granted to `authenticated`). Atomically reassigns ownership: sets `guilds.owner_id` to the new owner, promotes that member to `OWNER`, and demotes the caller to `ADMIN`. Raises unless `auth.uid()` is the current owner and the target is an existing member. Exposed via `POST /api/guilds/[id]/transfer-ownership` (owner-only, body `{ newOwnerId }`); the UI triggers it from the per-member dropdown in `GuildMembersSection`.

All tables use RLS. Supabase client is created via `createServerClient` with `getAll/setAll` cookie methods.

## Storage Buckets

| Bucket | Public | Notes |
|---|---|---|
| `avatars` | yes | User avatars (`{userId}/...`); write restricted to own folder. |
| `guild-avatars` | yes | Guild avatars; write restricted to guild owners. |
| `chat-attachments` | yes | Guild-chat image attachments (`{userId}/...`); write/update/delete restricted to own folder, **no broad SELECT policy** (public bucket serves objects by URL without one — avoids the listing lint). Uploaded client-side via `uploadChatAttachment` (`entities/guild-message`). The file is removed in `deleteGuildMessage` when its message is deleted. |

## Scheduled Jobs (pg_cron)

- **`cleanup-chat-attachments-daily`** (03:17 UTC) — `net.http_post` (pg_net) invokes the `cleanup-chat-attachments` Edge Function with the public anon key (satisfies `verify_jwt`; the function uses the service role internally). It deletes `chat-attachments` files whose `guild_messages` or `direct_messages` row is older than 30 days and nulls their `attachment_url`. Retention policy: chat images do **not** persist beyond ~30 days.
- **`delete-expired-call-to-actions-hourly`** (every hour, `0 * * * *`) — runs `public.delete_expired_call_to_actions()` (SECURITY DEFINER, EXECUTE revoked from anon/authenticated), which deletes `call_to_actions` rows whose `event_date` is more than 1 day in the past. The card shows a "time's up" state once `event_date` passes, then disappears ~24h later when this job removes it. Interests cascade; the linked `events` row is left intact (the CTA's `event_id` FK is `on delete set null`, and deleting the CTA does not touch the event).

## Styling and UI

1. **CSS Modules:** Use CSS Modules only (`*.module.css`).
2. **Inline styles:** Strictly forbidden.
3. **Naming:** Follow BEM-like class naming inside modules where it aids readability.
4. **Radix UI:** Style Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`) via CSS Modules, never Tailwind.
5. **clsx + tailwind-merge:** Only allowed in `shared/ui` utility components. Features/entities/widgets use CSS Modules only.
6. **Page transitions:** App Router navigations use the native **View Transitions API**, enabled by `experimental.viewTransition: true` in `next.config.mjs`. The flag is necessary but not sufficient — content is wrapped in a `<ViewTransition>` (from `react`) in `src/app/PageTransition.tsx`, a client component keyed by `usePathname()` with `default="none"`. Keying makes only route changes animate (`enter`/`exit`); Suspense reveals (skeleton → content) are an `update` and stay silent, avoiding a double-transition jump. The crossfade is tuned in `globals.css` on the `::view-transition-old(.page-exit)` / `::view-transition-new(.page-enter)` classes and guarded by `prefers-reduced-motion`. See [design-system.md](docs/design-system.md) §13.4.

## CSS Vendor Prefixes

Never add `-webkit-` prefixes for properties that are fully standard — they add noise and trigger deprecation warnings in Chrome DevTools.

**Drop entirely (no prefix needed in any modern browser):**
`transform`, `transition`, `animation` / `@keyframes`, `border-radius`, `box-shadow`, `flex` / `flexbox`, `grid`, `user-select`, `background-size`, `calc()`, `linear-gradient` / `radial-gradient`, `columns`.

**Keep BOTH prefixed + unprefixed:**
- `backdrop-filter` — Safari 17 and below still require `-webkit-backdrop-filter`. Write both until Safari 17 share drops (~2026):
  ```css
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  ```
- `appearance` — write both for reliable form-control resets on iOS Safari.

**`-webkit-` only (no standard equivalent, keep as-is):**
`-webkit-text-stroke`, `-webkit-text-fill-color`, `-webkit-tap-highlight-color`, `-webkit-touch-callout`.

## State Management

1. Use Redux Toolkit.
2. Business logic (actions, thunks, selectors) belongs inside the relevant slices in `entities` or `features`.
3. Type selectors and hooks using `useAppSelector` and `useAppDispatch`.