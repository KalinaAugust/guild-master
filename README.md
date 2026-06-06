# Guild Master

A guild management system built with Next.js and Feature-Sliced Design. Helps guilds organize activities, manage members, and coordinate events.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, React Server Components)
- **UI Library:** [React 19](https://react.dev/)
- **Architecture:** [Feature-Sliced Design (FSD)](https://feature-sliced.design/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **State Management:** [Redux Toolkit](https://redux-toolkit.js.org/) + RTK Query
- **Database:** [Supabase](https://supabase.com/) (Postgres + Auth + RLS)
- **Styling:** CSS Modules
- **Testing:** [Vitest](https://vitest.dev/)
- **i18n:** [next-intl](https://next-intl.dev/) (English + Russian)
- **Package Manager:** [pnpm](https://pnpm.io/)

## Getting Started

**Prerequisites:** Node.js v18+, pnpm, a Supabase project.

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Copy the environment template and fill in your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```

3. Start the dev server:
   ```bash
   pnpm dev
   ```

App runs at [http://localhost:3000](http://localhost:3000).

## Project Structure

Follows [Feature-Sliced Design](https://feature-sliced.design/) layers:

```
src/
├── app/          # Next.js App Router — layouts, pages, providers, API route handlers
├── widgets/      # Composed UI blocks (calendar, header, day-events)
├── features/     # User-facing feature slices (auth, create-event, guild-detail, …)
├── entities/     # Domain models + RTK Query API slices (calendar, event, guild, user)
└── shared/       # No-business-logic reusables — ui/, api/, lib/, types/
```

RTK Query endpoints live in `entities/*/api/` and `features/*/api/`, all injected onto the single `baseApi` instance at `src/shared/api/baseApi.ts`. Supabase calls belong in `src/app/api/` route handlers, not in client components.

## Key Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm lint` | ESLint check |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run all tests once |
| `pnpm test:ui` | Vitest UI for interactive debugging |

## Contributing

- Branch off `master`, name branches by feature (e.g. `guild-detail`, `event-form-fix`)
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
- All data fetching via RTK Query — no `createAsyncThunk` for server data
- No inline styles — CSS Modules only
- See `CLAUDE.md` for full architecture conventions
