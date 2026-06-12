# Instructions for /src

This file contains directives for working with Guild Master source code. All rules are mandatory.

## Architecture: Feature-Sliced Design (FSD)

Maintain strict layer isolation:
1. **Layers:** `shared`, `entities`, `features`, `widgets`, `app`.
2. **Public API:** Cross-module interaction is ONLY allowed through each slice's `index.ts`.
3. **Cross-imports:** Imports between slices on the same layer are forbidden (e.g. one `feature` cannot import another `feature`). Use composition in `widgets` or `app`.
4. **Shared:** Code with no business logic goes in `shared`.

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
| `profiles` | `id` (uuid, FK → auth.users), `public_id` (unique 8-char base62, used in `/profile/[publicId]` URLs), `full_name`, `avatar_url`, `updated_at`, `alias`, `display_as_alias` (bool — show alias instead of name app-wide), `icon` (lucide name, no privacy), `about`, `interests` (text[]), `socials` (jsonb `[{platform,value}]`), `birth_date` (date), `privacy` (jsonb map `field→'private'\|'guildmates'\|'public'`; visibility computed server-side, not via RLS; keys include `birth_date`) |
| `guilds` | `id`, `name`, `description`, `avatar_url`, `owner_id` (FK → profiles) |
| `guild_members` | `id`, `guild_id`, `user_id`, `role` (OWNER\|ADMIN\|MEMBER) |
| `events` | `id`, `guild_id`, `title`, `description`, `event_date`, `type`, `created_by` |
| `event_participants` | `id`, `event_id`, `user_id`, `status` (pending\|confirmed\|declined) |
| `polls` | `id`, `guild_id`, `created_by`, `title`, `description`, `is_anonymous`, `allow_multiple`, `allow_custom`, `allow_revote`, `closed_at`, `created_at` |
| `poll_options` | `id`, `poll_id`, `body`, `position`, `is_custom`, `created_by` |
| `poll_votes` | `id`, `poll_id`, `option_id`, `user_id` — `unique(option_id, user_id)` |

All tables use RLS. Supabase client is created via `createServerClient` with `getAll/setAll` cookie methods.

## Styling and UI

1. **CSS Modules:** Use CSS Modules only (`*.module.css`).
2. **Inline styles:** Strictly forbidden.
3. **Naming:** Follow BEM-like class naming inside modules where it aids readability.
4. **Radix UI:** Style Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`) via CSS Modules, never Tailwind.
5. **clsx + tailwind-merge:** Only allowed in `shared/ui` utility components. Features/entities/widgets use CSS Modules only.

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