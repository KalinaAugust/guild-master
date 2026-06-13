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
| `--glass-border` | `rgba(255, 255, 255, 0.08)` | Subtle white border simulating glass edges |
| `--glass-blur` | `blur(5px) saturate(120%)` | Backdrop blur with color saturation effect |
| `--shadow-glass` | `0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.2)` | Multi-layered shadow (outer shadow, top glare highlight, bottom dark edge) |

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

### 3.3 Core Rules & Formulas for Glassmorphism
To ensure a high-end sci-fi aesthetic and maintain readability, developers must follow these standard properties and ratios:

1.  **Surface Opacities:**
    *   **Standard Panels:** `rgba(255, 255, 255, 0.05)` (Provides a premium, subtle glass shell).
    *   **Light Containers / Inner Elements:** `rgba(255, 255, 255, 0.02)` to `0.03` (Keeps UI light and readable).
    *   **Elevated Overlays / Focus Elements:** `rgba(255, 255, 255, 0.08)` or a subtle brand tint `rgba(56, 189, 248, 0.04)` to `0.08` (Pulls attention).
2.  **Backdrop Blur Strength:**
    *   Standard blur is `blur(8px) saturate(120%)`.
    *   Do not stack multiple backdrop blurs directly.
    *   For overlays, menus, and popups, use Strategy 1 (disable/minimize inner blur) to prevent visual artifacts and performance drops.
3.  **Light Refraction (Borders):**
    *   Glass borders must act as light highlights, not solid framing lines. Use `1px solid rgba(255, 255, 255, 0.08)` as the base.
    *   On hover or selection, borders highlight to `rgba(255, 255, 255, 0.15)` or `rgba(56, 189, 248, 0.35)`.
4.  **Dual-Shadow Depth:**
    *   Combine soft outer drop shadows (`rgba(0, 0, 0, 0.4)` to `0.5`) with a crisp inner glare highlight on the top edge (`inset 0 1px 0 rgba(255, 255, 255, 0.15)`) to simulate the reflection of light off a three-dimensional glass panel.

### 3.4 Nested Stacking & Layering Rules
When rendering a glass component inside another glass component, backdrop blurs and semi-transparent backgrounds stack. This reduces depth, creates visual mud, and degrades text legibility. To solve this, we define three nested glassmorphism strategies:

*   **Strategy 1: Elevation / "Higher is Lighter & Sharper" (Recommended for overlays)**
    *   *Concept:* Simulates depth by raising the nested card closer to the light source along the Z-axis.
    *   *Rules:* Set `backdrop-filter: none` (or keep under `2px`) on the nested card to avoid stacked blur. Make background slightly lighter/brand-tinted (`rgba(255, 255, 255, 0.08)` or `rgba(125, 211, 252, 0.06)`). Increase border visibility to `1px solid rgba(255, 255, 255, 0.15)` and add a deep drop shadow `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4)`.
    *   *When to use:* Floating panels, dropdown menus, context popups, or hover-triggered cards that need to look layered above the main interface.

*   **Strategy 2: Cutout / "Darker Semi-Transparent Plaquette" (Recommended for data containers)**
    *   *Concept:* Ground nested components by placing them in a "carved-out" space within the main glass panel.
    *   *Rules:* Disable backdrop-filter on the child card (`backdrop-filter: none`). Use a dark, semi-transparent background derived from the site's dark palette (`rgba(3, 13, 26, 0.5)` or `rgba(11, 21, 40, 0.6)`). Apply a very subtle border (`1px solid rgba(255, 255, 255, 0.05)`) and optionally an inner shadow (`box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4)`).
    *   *When to use:* Interactive inline widgets (e.g., PollCard inside chat aside, chat messages, event details list item) where high contrast is required for nested buttons, input fields, checkboxes, or colorful progress bars.

*   **Strategy 3: Outline / "Border Only"**
    *   *Concept:* Keep the layout light and minimal by eliminating the nested background entirely.
    *   *Rules:* Set `background: transparent`, use a thin, subtle border (`1px solid rgba(255, 255, 255, 0.08)`), disable drop shadows, and increase padding/white space to separate elements.
    *   *When to use:* Static read-only cards, text lists, or secondary settings items where no overlapping progress bars or dense inputs are present.

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
*   `--header-height`: `3rem` (equivalent to 48px at base 16px)
*   `--rail-width`: `3.75rem` (equivalent to 60px at base 16px)

---

## 7. Border Radii (Corner Rounding)

To maintain a soft, modern gaming interface, corner rounding should follow these standardized scales:

*   **`24px` / `20px` (Large):** Major page layouts, main landing content panels (e.g., `ProfilePage`, `EventPage` wrapper).
*   **`16px` (Medium-Large):** Modal overlays, login forms, cards containing nested lists (e.g., `EventCard`).
*   **`12px` (Medium):** Sub-panels, filter dropdowns, event wizard stages, comments input area.
*   **`10px` / `8px` (Small):** Interactive elements: buttons, form inputs, selector elements, dropdown items.
*   **`6px` / `4px` (Micro):** Inner components: badges, checkmarks, tooltip bubble cards, small icons.
*   **Avatars (squircle):** Avatars (user and guild) use a **square shape with a size-proportional radius**, not a circle, keeping ~25–30% radius-to-size ratio so the corner softness reads the same at every size: `24px → 6px`, `32px → 8px`, `40px → 10px`, `96px → 16px` (the `20px` guild avatar in `Select` uses `6px`). Upload previews must match the rendered avatar radius.
*   **`50%` / `999px` (Circle/Pill):** Pill badges, tag indicators, fully-rounded buttons, status dots, radio controls.

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

*   **`Spinner` (`src/shared/ui/Spinner`):** An SVG-based gooey-balls-2 animation loader. Supports customizable sizes (`sm` = 16px, `md` = 28px, `lg` = 40px, or custom numbers in pixels), color variables (passed down as color prop to fill elements via `currentColor`), CSS classes, and a `centered` layout modifier. Generates unique SVG filter IDs dynamically using React's `useId` to prevent collisions.
*   **`Button` (`src/shared/ui/Button`):** Standard styled action buttons (Primary, Secondary, Secondary Glass, Ghost, Danger, etc.) with support for loading states (automatically renders the `Spinner`) and unified hover physics.
*   **`GradientTitle` (`src/shared/ui/GradientTitle`):** Reusable heading with the signature white→accent gradient text fill (`linear-gradient(to right, #fff, var(--accent-secondary))` clipped to text). Renders an `h1` by default (override via `as`) and defaults to the display font (`--font-display`), `1.75rem`, weight `700`. Font size, family and weight are tunable through `fontSize` / `fontFamily` / `fontWeight` props, passed down as CSS custom properties so visual styling stays in the CSS module. Use this instead of re-declaring the gradient on local headings.
*   **`Select` (`src/shared/ui/Select`):** Custom dropdown selections matching the night sky theme with smooth arrow transitions.
*   **`Modal` / `ConfirmModal` (`src/shared/ui/Modal`):** Base overlays for dialogs and user confirmations.
*   **Toasts (`sonner`):** Mounted once in `layout.tsx` with `richColors` + `theme="dark"`. Success toasts are recolored from the default green to the brand blue (`--success-bg: #0e3460`, `--success-border: var(--accent-primary)`, `--success-text: var(--text-highlight)`, icon `var(--accent-secondary)`) via overrides in `globals.css`. Error/warning toasts keep sonner's defaults.

---

## 11. Form Inputs & Custom Controls

To maintain the Sci-Fi Night Sky theme, all inputs (text inputs, textareas) and selection controls (checkboxes, radio buttons) use glassmorphism styles rather than flat solid colors:

### 11.1 Text Inputs & Textareas
*   **Default State:** Background `rgba(255, 255, 255, 0.02)`, border `1px solid rgba(255, 255, 255, 0.08)`, border-radius `12px`.
*   **Hover State:** Background shifts to `rgba(56, 189, 248, 0.03)` and border-color to `rgba(56, 189, 248, 0.35)` (subtle brand blue highlight).
*   **Focus State:** Background `rgba(255, 255, 255, 0.04)`, border-color `var(--accent-primary)`, and a glowing shadow `box-shadow: 0 0 10px var(--accent-glow)`.
*   **Error States:** Border-color `#ff6b6b`. On hover, border-color `#ff8787` and background `rgba(255, 107, 107, 0.03)`. On focus, border-color `#ff6b6b`, background `rgba(255, 107, 107, 0.05)`, and a red glow `box-shadow: 0 0 10px rgba(255, 107, 107, 0.3)`.

### 11.2 Custom Checkboxes & Radio Buttons
*   **Default Unchecked State:** Background `rgba(255, 255, 255, 0.02)`, border `1.5px solid var(--glass-border)`, color `#fff`.
*   **Hover Unchecked State:** Background `rgba(56, 189, 248, 0.03)`, border-color `rgba(56, 189, 248, 0.4)`.
*   **Checked State:** Background is a translucent brand blue `rgba(56, 189, 248, 0.16)`, border-color `var(--accent-secondary)`, and a glowing shadow `box-shadow: 0 0 10px rgba(56, 189, 248, 0.25)`.
*   **Hover Checked State:** Background `rgba(56, 189, 248, 0.24)`, border-color `#93e3ff`, and a stronger glow `box-shadow: 0 0 14px rgba(56, 189, 248, 0.4)`.
*   **Shapes:** Checkboxes use a rounded squircle shape (`border-radius: 5px`), while radio buttons use a circle (`border-radius: 50%`).

---

## 12. Buttons & Hover Physics

To keep the interface cohesive and responsive, buttons adhere to strict styles and physics rules:

### 12.1 Base Button Sizing & Borders
All buttons have `border: 1px solid transparent` and `box-sizing: border-box` to avoid layout shifts when changing button variants.

### 12.2 Hover Physics (Lift-Up effect)
To simulate elevation and mechanical response, **all standard buttons** (Primary, Secondary, Secondary Glass, Ghost, Icon, Danger) must animate when hovered:
*   **Hover State:** `transform: translateY(-2px);` combined with a smooth transition `transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)`.
*   **Active State:** `transform: translateY(0);` (depressed when clicked).
*   *Exception:* Inline message actions (like edit/delete icons in message bubbles) do not lift on hover to maintain chat text block stability.
*   *Exception — icon-only buttons:* Buttons sized `icon` / `icon_sm` (e.g. the profile settings gear, inline edit icons) **never lift on hover**. Their feedback is opacity/color only — no `translateY`. This is enforced in `Button.module.css` via a `transform: none` override on the icon sizes.

### 12.3 Primary Button Redesign
The Primary action button is styled as a glowing glassmorphic energy panel:
*   **Default State:** Background `linear-gradient(135deg, rgba(45, 158, 208, 0.28) 0%, rgba(14, 82, 114, 0.45) 100%)`, border `1px solid rgba(56, 189, 248, 0.65)`, glow `box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 10px rgba(56, 189, 248, 0.25)`.
*   **Hover State:** Background `linear-gradient(135deg, rgba(45, 158, 208, 0.38) 0%, rgba(14, 82, 114, 0.6) 100%)`, border-color `rgba(56, 189, 248, 0.95)`, glow `box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 0 18px rgba(56, 189, 248, 0.45)`.
*   **Hover Shine Effect:** A glint of light glides from left to right across the button body.

---

## 13. Chat UI & Message Bubble Guidelines

For chat components and messages, we apply specific formatting and structural guidelines to ensure optimal layout stability, contrast, and visual rhythm:

### 13.1 Message Bubbles
*   **Other User's Message:** Background `rgba(3, 13, 26, 0.35)`, border `1px solid rgba(255, 255, 255, 0.06)`, and border-radius `16px 16px 16px 4px` (tail pointing to the avatar).
*   **Own Message:** Background `rgba(45, 158, 208, 0.12)`, border `1px solid rgba(125, 211, 252, 0.15)`, border-radius `16px 16px 4px 16px` (tail pointing to the opposite side), and a subtle glow `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 10px rgba(56, 189, 248, 0.05)`.

### 13.2 Message Editing UI
*   When editing a message, the input field uses the standard glassmorphic `Textarea` styled component, but has an explicit margin-top offset (`margin-top: 8px`) to prevent it from overlapping or cramming against the author/time headers.
*   **Control Icons:** Action text buttons are replaced by enlarged vector/icon checkmarks and cancel crosses:
    *   **Checkmark / Save Button:** Uses the Lucide `Check` icon (`size={20}`), colored in sky blue `var(--accent-secondary)`. On hover, the color changes to brand blue `var(--accent-primary)` and gets a light background fill `rgba(56, 189, 248, 0.1)`.
    *   **Cross / Cancel Button:** Uses the Lucide `X` icon (`size={20}`), colored in muted text color `var(--text-muted)`. On hover, the color changes to primary text `var(--text-primary)` and gets a light gray background fill `rgba(255, 255, 255, 0.08)`.
*   Both icons have a fixed layout footprint (`width: 28px !important`, `height: 28px !important`) and are positioned at the bottom-left with a slight top spacing (`margin-top: 2px`) to sit close to the field without overlapping boundaries.

### 13.3 Inline Action Icons Hover Exceptions
*   To prevent text reflow, distracting cursor shifts, or layout jumps within active text zones, all inline action buttons (such as edit and delete icon buttons inside the bubble, or save and cancel buttons during draft edits):
    *   **Must disable vertical translation/lift** on hover: `transform: none !important`.
    *   **Must not use rounded outline borders/backgrounds** on hover unless explicitly defined (e.g. they hover with a clean color change and a subtle box/circle background, never lifting along the Y-axis).

---

## 14. Guidelines for Developers & Agents

When creating or modifying components, adhere to these rules:

1.  **Do Not Hardcode Colors:** Use `var(--color-name)` from `globals.css` and the tokens listed above.
2.  **Use CSS Modules:** Apply styles via `Component.module.css`. Inline styles are forbidden (except for dynamically computed layout positions).
3.  **Contrast & Accessibility:** Ensure all text overlaying glass backgrounds is legible. Use `var(--text-primary)` (`#ffffff`) or `var(--text-secondary)` (`rgba(255, 255, 255, 0.7)`) to maintain high contrast against deep gradients.
4.  **Glass Hover States:** When hover states are applied to glass panels, slightly increase the background opacity or accent borders, rather than changing the background to a solid color.
5.  **Follow Border Radii & Spacing Scales:** Always map paddings and border-radius styles to the scales in sections 7 and 8 to keep the UI visually cohesive.
6.  **Respect Unit Separation (`rem` vs `px`):** Adhere to the guidelines in section 9. Do not mix them randomly; use `rem` for text and layout spacing, and `px` for borders and rounded corners.
7.  **Synchronization:** If you update any global variables in `globals.css` (or standard spacing constants), immediately update this document to keep the design system synchronized.
