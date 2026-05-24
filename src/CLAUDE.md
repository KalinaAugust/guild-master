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
| `profiles` | `id` (uuid, FK → auth.users), `full_name`, `avatar_url`, `updated_at` |
| `guilds` | `id`, `name`, `description`, `owner_id` (FK → profiles) |
| `guild_members` | `id`, `guild_id`, `user_id`, `role` (OWNER\|ADMIN\|MEMBER) |
| `events` | `id`, `guild_id`, `title`, `description`, `event_date`, `type`, `created_by` |
| `event_participants` | `id`, `event_id`, `user_id`, `status` (pending\|confirmed\|declined) |

All tables use RLS. Supabase client is created via `createServerClient` with `getAll/setAll` cookie methods.

## Styling and UI

1. **CSS Modules:** Use CSS Modules only (`*.module.css`).
2. **Inline styles:** Strictly forbidden.
3. **Naming:** Follow BEM-like class naming inside modules where it aids readability.
4. **Radix UI:** Style Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`) via CSS Modules, never Tailwind.
5. **clsx + tailwind-merge:** Only allowed in `shared/ui` utility components. Features/entities/widgets use CSS Modules only.

## State Management

1. Use Redux Toolkit.
2. Business logic (actions, thunks, selectors) belongs inside the relevant slices in `entities` or `features`.
3. Type selectors and hooks using `useAppSelector` and `useAppDispatch`.