# Guild Master - Application Design Document

## 1. Overview
**Guild Master** is a web application featuring a calendar system designed for planning shared raids, games, and various group activities.

## 2. Architecture & Technology Stack
*   **Framework:** Next.js (version 14+) utilizing the modern App Router (`app` directory).
*   **Language:** TypeScript for strong typing of application state and data models.
*   **State Management:** Redux Toolkit.
    *   *Implementation Note:* Due to Next.js App Router defaulting to Server Components, Redux will be implemented via a specialized Client Component Provider that wraps the application layout, ensuring interactive state is handled on the client.
*   **Styling:** CSS Modules (Vanilla CSS with local scoping).

## 3. Core Interface Components
*   **Calendar View:** The primary interface displaying a monthly or weekly grid with visual indicators for scheduled activities.
*   **Event Modal/Form:** An interactive dialog for creating, viewing, and modifying events. It will capture details like title, date, time, activity type (e.g., raid, game, meeting), and description.
*   **Upcoming Events Panel:** A sidebar or list view providing quick access to impending activities without navigating the calendar grid.

## 4. State Management (Redux Store)
The application state will be divided into logical slices:
*   **`eventsSlice`:** Manages the core data entities. Handles fetching, storing, adding, updating, and deleting calendar events.
*   **`uiSlice`:** Manages transient UI state, such as whether the event creation modal is currently open, and the currently selected/viewed date in the calendar.

## 5. Directory Structure
The project will follow a structured organization within the `/src` directory:
*   `/src/app`: Next.js App Router routing (pages, layouts, globals.css).
*   `/src/components`: Reusable UI components (e.g., `CalendarGrid`, `EventModal`, generic UI elements), each with their accompanying `[name].module.css`.
*   `/src/store`: Redux store configuration (`store.ts`) and feature slices (`slices/`).
*   `/src/styles`: Global styles or variables (if any, beyond CSS modules).
*   `/src/types`: Global TypeScript interfaces and type definitions (e.g., the `ActivityEvent` interface).
