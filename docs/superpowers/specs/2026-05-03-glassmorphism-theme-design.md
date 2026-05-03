# Design Spec: Glassmorphism Dark Theme (Purple)

## 1. Vision & Goals
Transform the Guild Master application into a modern, visually stunning dark interface using **Glassmorphism** principles with a focus on purple amethyst accents. The goal is to create a premium "gaming guild" feel that is both aesthetic and functional.

## 2. Visual Identity

### 2.1 Color Palette
*   **Background (Global):**
    *   Deep Space: `#0f0c29`
    *   Midnight Purple: `#302b63`
    *   Dark Navy: `#24243e`
    *   *Implementation:* `linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)`
*   **Accents (Amethyst):**
    *   Primary: `#9d4edd` (Vibrant Purple)
    *   Secondary: `#c8b6ff` (Light Lavender)
*   **Typography:**
    *   Primary Text: `#ffffff`
    *   Muted Text: `rgba(255, 255, 255, 0.6)`
    *   Highlight Text: `#c8b6ff`

### 2.2 Glassmorphism Effects
*   **Surface Background:** `rgba(255, 255, 255, 0.05)`
*   **Background Blur:** `backdrop-filter: blur(16px)`
*   **Border:** `1px solid rgba(255, 255, 255, 0.1)`
*   **Shadow:** `0 25px 50px -12px rgba(0, 0, 0, 0.5)`

## 3. UI Component Details

### 3.1 Global Elements
*   **Animated Blobs:** 2-3 large, blurry circles with `opacity: 0.15` moving slowly in the background behind the main content to add depth.

### 3.2 Calendar Grid (`CalendarGrid.tsx`)
*   **Container:** Large glass card with rounded corners (`24px`).
*   **Day Cells:**
    *   Default: Transparent glass tiles.
    *   Hover: Increased opacity (`0.1`), 4px upward translation, and `rgba(255, 255, 255, 0.2)` border.
    *   Today: Accent border (`#9d4edd`) with a soft inner glow.
*   **Event Items:**
    *   Semi-transparent background matching event type.
    *   Thick left border (`3px`) using a solid accent color.
    *   Rounded corners (`6px`).

### 3.3 Navigation & Controls
*   **Buttons:** Glass style, turning solid amethyst on hover or when active.
*   **Selects:** Custom styled to match the dark theme, using the same glass effects for dropdowns.

## 4. Technical Implementation Plan

### 4.1 CSS Variables
Define all theme variables in `src/app/globals.css` within a `:root` or a specific theme class.

### 4.2 Component Updates
*   Update `src/app/globals.css` for global background and resets.
*   Refactor `src/widgets/calendar/ui/CalendarGrid.module.css` to use variables and implement glass effects.
*   Ensure `Select` component (`src/shared/ui/Select`) is compatible with the dark theme.

## 5. Success Criteria
*   The application has a consistent "Soft Glass" look.
*   Text remains highly readable (contrast ratio check).
*   Interactive elements (hover, active states) provide clear visual feedback.
*   Performance remains stable despite `backdrop-filter` usage.
