# Design Spec: Guild Selection and Persistence

Implementation of a guild selection mechanism in the calendar interface with state persistence.

## Problem Statement
Currently, the application hardcodes the first available guild for the user. Users cannot switch between different guilds they belong to, and there is no visual representation (avatar) for guilds in the UI.

## Goals
- Allow users to switch between guilds using a dropdown in the calendar header.
- Persist the selected guild in `localStorage` so it remains active after page reload.
- Add visual support for guild avatars (using a placeholder for now).
- Integrate the selection with Redux for global state management.

## Architecture

### 1. State Management (Redux)
A new Redux slice will be created in `src/entities/guild` to manage the selected guild.

- **Slice Path**: `src/entities/guild/model/slice.ts`
- **Initial State**:
  ```typescript
  {
    currentGuildId: string | null; // Initially read from localStorage
  }
  ```
- **Actions**:
  - `setCurrentGuild(id: string)`: Updates the state and saves to `localStorage`.

### 2. UI Components

#### `CalendarGrid` Header Update
The header in `src/widgets/calendar/ui/CalendarGrid.tsx` will be modified to include the guild selector.

- **Layout**: `[Month Select] [Year Select] | [Guild Select]`
- **Separator**: A vertical line between Year and Guild selectors.
- **Avatar**: A 24x24px circular image next to the guild name.
- **Static Asset**: `public/assets/guild-placeholder.svg` (already created).

#### `Select` Component
The shared `Select` component already supports `React.ReactNode` for labels, so no major changes are needed to its API, but styling might need minor adjustments to ensure the avatar aligns perfectly with the text.

### 3. Data Flow
1. **Initial Load**: `StoreProvider` initializes Redux. The `guild` slice reads `currentGuildId` from `localStorage`.
2. **Page Component**: `src/app/page.tsx` fetches the list of guilds and dispatches an initialization action if no `currentGuildId` is set.
3. **Switching**: User selects a new guild. The `setCurrentGuild` action is dispatched, updating the store and `localStorage`.
4. **Reactive Update**: `CalendarGrid` observes `currentGuildId` from the store and re-fetches events whenever it changes.

## Testing Strategy
- **Unit Test**: Verify the guild slice correctly reads from/writes to `localStorage`.
- **Component Test**: Verify the `CalendarGrid` renders the guild selector with the correct initial value.
- **Integration Test**: Verify that switching the guild triggers a re-fetch of events.

## User Review Required
- [ ] Placement of the vertical separator.
- [ ] Behavior when the selected guild is no longer available (e.g., user left the guild). *Recommendation: Fallback to the first available guild.*
