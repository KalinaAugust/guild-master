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
- npm (installed with Node.js)

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Building for Production

```bash
npm run build
npm run start
```

## Git Workflow

- **No mid-task commits:** Do NOT create git commits after completing individual subtasks or plan steps. Only commit when explicitly asked by the user.

## Development Conventions

- **Architecture:** Strictly adhere to **Feature-Sliced Design (FSD)** principles and Next.js App Router patterns. Organize code into standardized layers, keep business logic in slices, and keep components focused on rendering.
- **Data Fetching:** Use RTK Query for all server data. Add endpoints via `injectEndpoints` on `baseApi` (`src/shared/api/baseApi.ts`) within the relevant FSD slice (`entities/*/api/*Api.ts`, `features/*/api/*Api.ts`). Never use `createAsyncThunk` for data fetching. Route handlers in `src/app/api/` are the transport layer — Supabase calls belong there, not in client components.
- **State Management:** Use Redux Toolkit slices only for pure UI/client state (e.g., selected date, active guild). Custom hooks `useAppDispatch` and `useAppSelector` from `src/shared/lib/hooks.ts` should be used for type-safe store interaction.
- **Component Styling:** Use CSS Modules (`*.module.css`) for component-specific styles to ensure scoping and prevent collisions. **NEVER use inline styles.**
- **Type Safety:** Maintain strict TypeScript typing. Interfaces should be defined in `src/shared/types/index.ts` or close to their usage if specific to a single module. `React.FormEvent` is deprecated in React 19 — use `React.SubmitEvent` for form submit handlers instead. `React.MouseEvent` is not deprecated and can be used as-is.
- **Client Components:** Use the `'use client';` directive only for components that require interactivity or browser APIs (like those using Redux hooks).
- **Testing:** Do NOT write new unit tests or add new test cases. Existing tests must be kept passing — update mocks and assertions in existing test files when production code changes break them, but do not add new `it()`/`test()` blocks or new test files.
- **Browser verification:** Do NOT launch the browser to verify changes unless the user explicitly asks. Make the code change and stop; let the user check it in the browser themselves.
- **CLAUDE.md hygiene:** After any task that changes infrastructure, global state patterns, routing conventions, or other project-wide rules — update this file to reflect the new reality before closing the task.

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the development server with hot-reloading. |
| `npm run build` | Compiles the application for production deployment. |
| `npm run start` | Runs the production-ready build. |
| `npm run lint` | Runs ESLint to check for code quality and style issues. |
| `npm test` | Runs tests in watch mode. |
| `npm run test:run` | Runs all tests once. |
| `npm run test:ui` | Starts Vitest UI for interactive test debugging. |
