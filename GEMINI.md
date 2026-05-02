# Guild Master

Guild Master is a guild management system built with Next.js, following the **Feature-Sliced Design (FSD)** architectural pattern. It provides tools for organizing guild activities, starting with a comprehensive calendar system.

## Technology Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Architecture:** [Feature-Sliced Design (FSD)](https://feature-sliced.design/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **State Management:** [Redux Toolkit](https://redux-toolkit.js.org/) with `react-redux`
- **Styling:** [CSS Modules](https://github.com/css-modules/css-modules)
- **Runtime:** [Node.js](https://nodejs.org/)

## Project Structure

- `src/app/`: Next.js App Router directory (layouts, pages, and providers).
- `src/components/`: Reusable React components.
- `src/store/`: Redux store configuration, slices, and custom hooks.
- `src/types/`: TypeScript interface and type definitions.
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

## Development Conventions

- **Architecture:** Strictly adhere to **Feature-Sliced Design (FSD)** principles and Next.js App Router patterns. Organize code into standardized layers, keep business logic in slices, and keep components focused on rendering.
- **State Management:** Always use Redux Toolkit slices for global state. Custom hooks `useAppDispatch` and `useAppSelector` from `src/store/hooks.ts` should be used for type-safe store interaction.
- **Component Styling:** Use CSS Modules (`*.module.css`) for component-specific styles to ensure scoping and prevent collisions.
- **Type Safety:** Maintain strict TypeScript typing. Interfaces should be defined in `src/types/index.ts` or close to their usage if specific to a single module.
- **Client Components:** Use the `'use client';` directive only for components that require interactivity or browser APIs (like those using Redux hooks).
- **Testing:** We use Vitest and React Testing Library for unit and integration tests. Follow TDD principles: write a failing test before implementing the logic.

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
