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
| `profiles` | `id` (uuid, FK → auth.users), `public_id` (unique 8-char base62, used in `/profile/[publicId]` URLs), `full_name`, `avatar_url`, `updated_at`, `alias`, `display_as_alias` (bool — show alias instead of name app-wide), `icon` (lucide name, no privacy), `about`, `interests` (text[]), `socials` (jsonb `[{platform,value}]`), `birth_date` (date), `email` (text — denormalized copy of `auth.users.email`, synced via the `handle_new_user` / `handle_user_email_update` triggers), `last_seen_at` (timestamptz — presence; refreshed by a throttled heartbeat in `src/proxy.ts`, ≤ once per 5 min via the `ls_hb` cookie; not privacy-gated), `privacy` (jsonb map `field→'private'\|'guildmates'\|'public'`; visibility computed server-side, not via RLS; keys include `birth_date`, `email`) |
| `guilds` | `id`, `name`, `description`, `avatar_url`, `owner_id` (FK → profiles) |
| `guild_members` | `id`, `guild_id`, `user_id`, `role` (OWNER\|ADMIN\|MEMBER) |
| `events` | `id`, `guild_id`, `title`, `description`, `event_date`, `type`, `created_by` |
| `event_participants` | `id`, `event_id`, `user_id`, `status` (pending\|confirmed\|declined) |
| `polls` | `id`, `guild_id`, `created_by`, `title`, `description`, `is_anonymous`, `allow_multiple`, `allow_custom`, `allow_revote`, `closed_at`, `created_at` |
| `poll_options` | `id`, `poll_id`, `body`, `position`, `is_custom`, `created_by` |
| `poll_votes` | `id`, `poll_id`, `option_id`, `user_id` — `unique(option_id, user_id)` |
| `guild_messages` | `id`, `guild_id`, `user_id`, `body`, `attachment_url` (text, nullable — public URL of an optional image attachment in the `chat-attachments` bucket), `created_at`, `updated_at`. RLS: select/insert for guild members, update/delete own. |
| `announcements` | `id`, `guild_id`, `created_by`, `title`, `content` (markdown source), `is_pinned`, `created_at`, `updated_at`. RLS: select for guild members; insert/update/delete only `ADMIN`/`OWNER` (`has_guild_role`). Feed served on `/announcements`. |
| `announcement_comments` | `id`, `announcement_id` (cascade), `user_id`, `body`, `created_at`, `updated_at`. RLS: select for members, insert own, delete by author or `ADMIN`/`OWNER`. Not editable. |
| `announcement_reactions` | `id`, `announcement_id` (cascade), `user_id`, `type` (`like\|dislike\|heart\|celebrate\|insightful`) — `unique(announcement_id, user_id, type)`. RLS: select for members, insert/delete own. |
| `call_to_actions` | `id`, `guild_id` (cascade), `created_by`, `title`, `description`, `type` (event activity type), `event_date` (timestamptz — planned date+time), `target_count` (int ≥1), `event_id` (nullable FK → `events`, set on launch), `launched_at` (nullable), `created_at`, `updated_at`. RLS: select for members; insert by **any** member; update/delete by author or `ADMIN`/`OWNER` (`has_guild_role`). Feed served on `/call-to-action`. |
| `call_to_action_interests` | `id`, `cta_id` (cascade), `user_id`, `created_at` — `unique(cta_id, user_id)`. The "I'm in" presses. RLS: select for members, insert/delete own. |
| `announcement_reads` | `id`, `guild_id` (cascade), `user_id`, `last_read_at` — `unique(guild_id, user_id)`. Per-guild last-seen timestamp for the announcements feed; drives the sidebar unread dot. Mirror of `guild_message_reads`. RLS: select/insert/update own row only. |
| `call_to_action_reads` | `id`, `guild_id` (cascade), `user_id`, `last_read_at` — `unique(guild_id, user_id)`. Per-guild last-seen timestamp for the Call to Action feed; drives the sidebar unread dot. RLS: select/insert/update own row only. |

**Call to Action RPCs** (the page's mutations go through these, not direct table writes):
- `create_call_to_action(p_guild_id, p_title, p_description, p_type, p_event_date, p_target_count) → uuid` — inserts the CTA and the creator's own interest (counter starts at 1), then attempts launch. Member-gated.
- `toggle_call_to_action_interest(p_cta_id)` — adds/removes the caller's interest (cancel allowed only before launch), then attempts launch on add.
- `_maybe_launch_cta(p_cta_id)` — internal helper (EXECUTE revoked from `anon`/`authenticated`): when interested count ≥ `target_count` and not yet launched, creates an `events` row from the CTA, copies all interested users into `event_participants` (`confirmed`), and stamps `event_id`/`launched_at`. This is how a reached threshold auto-creates the calendar event.

All tables use RLS. Supabase client is created via `createServerClient` with `getAll/setAll` cookie methods.

## Storage Buckets

| Bucket | Public | Notes |
|---|---|---|
| `avatars` | yes | User avatars (`{userId}/...`); write restricted to own folder. |
| `guild-avatars` | yes | Guild avatars; write restricted to guild owners. |
| `chat-attachments` | yes | Guild-chat image attachments (`{userId}/...`); write/update/delete restricted to own folder, **no broad SELECT policy** (public bucket serves objects by URL without one — avoids the listing lint). Uploaded client-side via `uploadChatAttachment` (`entities/guild-message`). The file is removed in `deleteGuildMessage` when its message is deleted. |

## Scheduled Jobs (pg_cron)

- **`cleanup-chat-attachments-daily`** (03:17 UTC) — `net.http_post` (pg_net) invokes the `cleanup-chat-attachments` Edge Function with the public anon key (satisfies `verify_jwt`; the function uses the service role internally). It deletes `chat-attachments` files whose `guild_messages` row is older than 30 days and nulls their `attachment_url`. Retention policy: chat images do **not** persist beyond ~30 days.
- **`delete-expired-call-to-actions-hourly`** (every hour, `0 * * * *`) — runs `public.delete_expired_call_to_actions()` (SECURITY DEFINER, EXECUTE revoked from anon/authenticated), which deletes `call_to_actions` rows whose `event_date` is more than 1 day in the past. The card shows a "time's up" state once `event_date` passes, then disappears ~24h later when this job removes it. Interests cascade; the linked `events` row is left intact (the CTA's `event_id` FK is `on delete set null`, and deleting the CTA does not touch the event).

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