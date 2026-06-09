# Guild Master - Design System

This document serves as the **Single Source of Truth** for the visual identity, styling conventions, design tokens, and user experience (UX) guidelines of the Guild Master application.

---

## 1. Design Concept: Sci-Fi Night Sky

The visual identity of Guild Master is inspired by a premium, futuristic "gaming guild" dashboard. It features a deep dark environment mimicking the **night sky / outer space**, accentuated with semi-transparent **glassmorphism** panels and vibrant **blue-sky/cyan glow** highlights.

---

## 2. Color Palette & Tokens

All colors are defined as CSS variables in [src/app/globals.css](file:///Users/deniskalinin/frontend/guild-master/src/app/globals.css). Always use these variables instead of hardcoding raw HEX/RGB values.

### 2.1 Backgrounds & Gradients
| CSS Variable | Value | Description |
| :--- | :--- | :--- |
| `--bg-gradient` | `linear-gradient(135deg, #030d1a 0%, #0a2540 50%, #0e3460 100%)` | Global body gradient (Deep space / Midnight blue) |
| `--modal-bg` | `#0b1528` | Solid opaque background for modals and overlay cards |

### 2.2 Accents & Glows
| CSS Variable | Value | Description |
| :--- | :--- | :--- |
| `--accent-primary` | `#2d9ed0` | Active buttons, primary actions, and key borders (Vibrant Blue) |
| `--accent-hover` | `#2589b6` | Hover state for primary buttons/elements |
| `--accent-secondary`| `#7dd3fc` | Secondary icons, labels, and highlights (Light Sky Blue) |
| `--accent-yellow` | `#f59e0b` | Star icons, warning states, gold highlights |
| `--accent-glow` | `rgba(56, 189, 248, 0.3)` | Soft glow effect for borders and highlights |

### 2.3 Typography Colors
| CSS Variable | Value | Description |
| :--- | :--- | :--- |
| `--text-primary` | `#ffffff` | Headings, main button labels, primary text |
| `--text-secondary` | `rgba(255, 255, 255, 0.7)` | Body text, sub-labels, secondary metadata |
| `--text-muted` | `rgba(255, 255, 255, 0.6)` | Input placeholders, inactive states, footer text |
| `--text-highlight` | `#bae6fd` | Focused items, active navigation links |

---

## 3. Glassmorphism Styling

Cards, panels, calendars, and other container surfaces use a **Glassmorphism** styling approach to give a layered, floating-in-space feeling.

### 3.1 Glass Properties
| CSS Variable | Value | Description |
| :--- | :--- | :--- |
| `--glass-bg` | `rgba(255, 255, 255, 0.05)` | Semi-transparent white surface |
| `--glass-border` | `rgba(255, 255, 255, 0.1)` | Subtle white border simulating glass edges |
| `--glass-blur` | `blur(2px)` | Backdrop blur effect |
| `--shadow-glass` | `0 25px 50px -12px rgba(0, 0, 0, 0.5)` | Large soft shadow under the card |

### 3.2 Standard Glass Container Class Example
```css
.glassPanel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-glass);
  border-radius: 12px; /* Standard panel radius */
}
```

---

## 4. Typography

We use two primary typefaces imported via Next.js Google Fonts:
*   **Body & Interface Text:** `Manrope` (`--font-body`), sans-serif. Designed for readability.
*   **Display & Headings:** `Unbounded` (`--font-display`), sans-serif. Gives the app a bold, futuristic look.

---

## 5. Event Categories

Guild Master color-codes calendar events by their type. Each event type has a background fill and a matching accent border:

| Event Type | Background Variable | Value | Border Variable | Value |
| :--- | :--- | :--- | :--- | :--- |
| **Raid** | `--event-raid` | `#5c3030` | `--event-raid-border` | `#b06060` |
| **Meeting** | `--event-meeting` | `#1e4d80` | `--event-meeting-border` | `#5a90b8` |
| **Game** | `--event-game` | `#254d38` | `--event-game-border` | `#4a9068` |
| **Dungeon** | `--event-dungeon` | `#2d1250` | `--event-dungeon-border` | `#a855f7` |
| **Party** | `--event-party` | `#4d1a3a` | `--event-party-border` | `#f472b6` |
| **Sport** | `--event-sport` | `#0f3d2e` | `--event-sport-border` | `#34d399` |
| **DnD** | `--event-dnd` | `#3d2c0a` | `--event-dnd-border` | `#f59e0b` |
| **Boardgame** | `--event-boardgame`| `#232450` | `--event-boardgame-border`| `#818cf8` |
| **Other** | `--event-other` | `#1a5272` | `--event-other-border` | `#4a85a8` |

---

## 6. Layout & Sizing Constants
*   `--header-height`: `48px`
*   `--rail-width`: `60px`

---

## 7. Border Radii (Corner Rounding)

To maintain a soft, modern gaming interface, corner rounding should follow these standardized scales:

*   **`24px` / `20px` (Large):** Major page layouts, main landing content panels (e.g., `ProfilePage`, `EventPage` wrapper).
*   **`16px` (Medium-Large):** Modal overlays, login forms, cards containing nested lists (e.g., `EventCard`).
*   **`12px` (Medium):** Sub-panels, filter dropdowns, event wizard stages, comments input area.
*   **`10px` / `8px` (Small):** Interactive elements: buttons, form inputs, selector elements, dropdown items.
*   **`6px` / `4px` (Micro):** Inner components: badges, checkmarks, tooltip bubble cards, small icons.
*   **`50%` / `999px` (Circle/Pill):** Avatars, pill badges, tag indicators, fully-rounded buttons.

---

## 8. Spacings & Paddings (8-Point Grid)

We adhere to an **8-point grid system** (e.g., `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`) to ensure rhythm and consistency across layouts:

*   **`40px` (2.5rem) / `32px` (2rem):** Global page wrapper padding, main outer content margins.
*   **`24px` (1.5rem) / `20px` (1.25rem):** Modals padding, wizard container borders, large form paddings.
*   **`16px` (1rem):** Card inner padding, list item spacing, main container gaps.
*   **`12px` / `10px` / `8px`:** Buttons padding (horizontal/vertical ratios like `10px 24px` or `8px 16px`), input field paddings, comments content padding.
*   **`4px` / `2px`:** Mini-badges, tiny gaps between related text tags, inline icons.

---

## 9. Sizing Units: `rem` vs `px`

To support accessibility, responsive scaling, and browser-level zoom configurations, we divide unit usage as follows:

### 9.1 Use `rem` for:
*   **Typography:** All `font-size` and `line-height` declarations (e.g., `font-size: 1rem`, `font-size: 1.25rem`, `line-height: 1.5rem`). This ensures fonts scale dynamically according to user browser accessibility preferences.
*   **Global Layout Spacing & Large Paddings:** Margins and paddings of large wrappers, modules, pages, or components (e.g., page paddings of `2rem` or modal card inner padding of `1.5rem`).

### 9.2 Use `px` for:
*   **Border Radii:** Corner rounding (e.g., `12px`, `8px`, `4px`). Rounding shapes should remain visually fixed and sharp, irrespective of the system font scale.
*   **Border Widths:** Outline and divider line thicknesses (e.g., `1px`, `2px`). Lines must not blur or disappear when browser fonts are scaled.
*   **Micro Spacings & Tiny Elements:** Fine gaps, minor padding offsets, or fixed icon sizes (e.g., icon heights `16px`, `24px` or mini badge padding `2px 8px`).

---

## 10. Reusable UI Components

To maintain UI consistency and reduce code duplication, always check and reuse existing components in `src/shared/ui/` before building any new custom elements:

*   **`Spinner` (`src/shared/ui/Spinner`):** The standard loading indicator. Supports customizable sizes (`sm` = 16px, `md` = 28px, `lg` = 40px, or a custom number in pixels), color variables (defaults to `var(--accent-primary)`), CSS classes, and a `centered` prop to easily align it in the middle of a container.
*   **`Button` (`src/shared/ui/Button`):** Standard styled action buttons (Primary, Secondary, Ghost, Danger, etc.) with support for loading states (automatically renders the `Spinner`).
*   **`Select` (`src/shared/ui/Select`):** Custom dropdown selections matching the night sky theme with smooth arrow transitions.
*   **`Modal` / `ConfirmModal` (`src/shared/ui/Modal`):** Base overlays for dialogs and user confirmations.

---

## 11. Guidelines for Developers & Agents

When creating or modifying components, adhere to these rules:

1.  **Do Not Hardcode Colors:** Use `var(--color-name)` from `globals.css` and the tokens listed above.
2.  **Use CSS Modules:** Apply styles via `Component.module.css`. Inline styles are forbidden (except for dynamically computed layout positions).
3.  **Contrast & Accessibility:** Ensure all text overlaying glass backgrounds is legible. Use `var(--text-primary)` (`#ffffff`) or `var(--text-secondary)` (`rgba(255, 255, 255, 0.7)`) to maintain high contrast against deep gradients.
4.  **Glass Hover States:** When hover states are applied to glass panels, slightly increase the background opacity or accent borders, rather than changing the background to a solid color.
5.  **Follow Border Radii & Spacing Scales:** Always map paddings and border-radius styles to the scales in sections 7 and 8 to keep the UI visually cohesive.
6.  **Respect Unit Separation (`rem` vs `px`):** Adhere to the guidelines in section 9. Do not mix them randomly; use `rem` for text and layout spacing, and `px` for borders and rounded corners.
7.  **Synchronization:** If you update any global variables in `globals.css` (or standard spacing constants), immediately update this document to keep the design system synchronized.


