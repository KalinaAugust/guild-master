# Day View Implementation Design

## 1. Overview
The goal is to enhance the calendar grid by separating the "Create Event" action from the "View Day" action, and to implement a dedicated, shareable page for viewing a specific day's events.

## 2. Changes to CalendarGrid
- **UI Updates:**
  - Introduce a "Plus" icon (using `lucide-react`) in the top right corner of each day cell.
  - The icon will be hidden by default (`opacity: 0`) and will appear only when the user hovers over the day cell.
- **Interaction Updates:**
  - **Clicking the "Plus" icon:** Triggers the existing `CreateEventModal` for the selected date. This click event will use `stopPropagation` to prevent triggering the cell's background click handler.
  - **Clicking the Day Cell background:** Navigates the user to the new Day View page using Next.js router.

## 3. New Route & Page: `/day/[date]`
- **Route Structure:** `src/app/day/[date]/page.tsx`
- **Slug Format:** The slug will be the date in `YYYY-MM-DD` format (e.g., `/day/2026-05-14`). This allows the URL to be easily shared.
- **Page Content:**
  - A header displaying the formatted date.
  - A list of events scheduled for that specific day.
  - A "Back to Calendar" button to return to the main view.
- **Data Fetching:** The page will need to fetch or display events specific to the `params.date` and the current guild.

## 4. Dependencies & Technical Details
- **Routing:** Use `next/navigation` (`useRouter` for client-side navigation or `Link` component).
- **Styling:** Update `CalendarGrid.module.css` to handle the hover state for the add button.

## 5. Implementation Steps
1. Update `CalendarGrid.tsx` and its CSS module to add the hoverable "+" button and adjust click handlers.
2. Create the new dynamic route structure `src/app/day/[date]/page.tsx`.
3. Implement the UI for the day view page, fetching and displaying the events.