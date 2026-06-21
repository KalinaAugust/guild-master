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
| `--glass-bg` | `rgba(255, 255, 255, 0.05)` | Semi-transparent white surface for outer shells |
| `--glass-bg-light` | `rgba(255, 255, 255, 0.03)` | Fill for nested surfaces (no backdrop-filter) |
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

### 3.3 Core Stacking & Layering Laws (The 5 Rules of Glass)
When building layouts with glassmorphism, transparencies and blurs multiply. A stacking mistake degrades readability, destroys the hierarchy, and kills rendering performance. Follow these 5 strict rules:

1. **Правило чередования материалов (Material Alternation)**
   * Glass is a convex, raised surface. **Never nest glass directly inside glass**.
   * Alternate materials using the "cutout" well approach: `glass panel` (raised) → `cutout well` (pressed-in, no blur, dark) → `glass-light chip` (flat).
   * The eye reads depth as raised → cut out → raised. Two adjacent raised layers break the hierarchy.
   * **Implementation:** Use `--glass-cutout` or `--glass-cutout-strong` combined with `--shadow-inset-cutout` for nested structural containers.

2. **Один blur на стекинг-контекст (Single Blur per Context)**
   * `backdrop-filter` must live **only** on the outermost shell/container.
   * Nested surfaces must take a semi-transparent background (`--glass-bg-light` or `--glass-cutout`) **without** their own `backdrop-filter`.
   * *Why:* Eliminates visual mud (double-blurring) and prevents severe performance drops (nested backdrop-filters are one of the most expensive browser rendering operations).

3. **Бюджет глубины (Depth Budget: Max 2 Glass Layers)**
   * Beyond the second nested level, transparency stops conveying hierarchy effectively. 
   * **Rule:** "Deeper than two glasses — become solid."
   * At the 3rd depth level and beyond, transition to opaque or near-opaque backgrounds (e.g., `--modal-bg` / `#0b1528`) to maintain high text contrast and readability.

4. **Бордер только на верхнем крае (Borders Are Glare, Not Frames)**
   * A light 1px border simulates light refraction on a raised glass edge.
   * On nested elements, **remove the outer light border** or replace it with an inner shadow (`--shadow-inset-cutout`).
   * *Why:* Stacking multiple white borders makes the UI look like a basic HTML table, destroying the illusion of glass.

5. **Рамп прозрачности по глубине (Transparency Ramp by Depth)**
   To make nesting predictable and scalable, map your layers explicitly to this token scale:

| Depth Level | Material Concept | Target CSS Token |
| :--- | :--- | :--- |
| **L0 (Base)** | Global gradient background | `--bg-gradient` |
| **L1 (Outer)** | Glass panel + Blur + Border + Drop Shadow | `--glass-bg` |
| **L2 (Inside L1)** | Cutout well, inset shadow, dark fill, NO border | `--glass-cutout` |
| **L3 (Inside L2)** | Flat glass chip/input, light fill | `--glass-bg-light` |
| **L4 (Deepest)** | Opaque solid overlay / dense container | `--modal-bg` |

### 3.4 Shadow Formulas
To support the rules above, use the designated shadow tokens:
* **Outer Panel Shadows (`--shadow-glass`):** Combines a soft outer drop shadow with a crisp inner glare highlight on the top edge (`inset 0 1px 0 rgba(255, 255, 255, 0.15)`) to simulate a 3D glass edge.
* **Cutout Shadows (`--shadow-inset-cutout`):** A soft inset drop shadow that pushes the element inward, creating a well (`inset 0 2px 4px rgba(0, 0, 0, 0.4)`).

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
| **Meeting** | `--event-meeting` | `#103d4a` | `--event-meeting-border` | `#22d3ee` |
| **Game** | `--event-game` | `#1e3a5f` | `--event-game-border` | `#60a5fa` |
| **Party** | `--event-party` | `#4d1a3a` | `--event-party-border` | `#f472b6` |
| **Sport** | `--event-sport` | `#14432a` | `--event-sport-border` | `#4ade80` |
| **DnD** | `--event-dnd` | `#3d2c0a` | `--event-dnd-border` | `#f59e0b` |
| **Boardgame** | `--event-boardgame`| `#2e2150` | `--event-boardgame-border`| `#a78bfa` |
| **Other** | `--event-other` | `#3d2024` | `--event-other-border` | `#f87171` |

---

## 6. Layout & Sizing Constants
*   `--header-height`: `3rem` (equivalent to 48px at base 16px)
*   `--rail-width`: `3.75rem` (equivalent to 60px at base 16px)

### Z-index scale (stacking order)

**Never hard-code a numeric `z-index` in a `*.module.css` file.** Every stacking layer uses a token from the single scale defined in `globals.css` (`:root`). This prevents the recurring bug where a dropdown opened from inside a dialog disappears behind it.

| Token | Value | Use for |
|---|---|---|
| `--z-behind` | `-1` | decorative backgrounds (e.g. `ParticlesBackground`, bg blobs) |
| `--z-base` | `0` | normal in-flow content |
| `--z-sticky` | `10` | sticky table headers (e.g. `CalendarGrid`) |
| `--z-nav` | `200` | sidebar, side panels (notifications) |
| `--z-wizard` | `1100` | fullscreen wizard overlay (`WizardDialog`) |
| `--z-modal` | `1500` | modal backdrop (`Modal`) |
| `--z-modal-content` | `1501` | modal content box |
| `--z-tooltip` | `1600` | tooltips |
| `--z-popover` | `2000` | **dropdowns / selects / poppers** — sits above every dialog so it stays visible when triggered from inside one |

**Rule:** any Radix floating layer portaled to `document.body` (DropdownMenu, Select, Popover content) must use `--z-popover`. A purely local stack within one component (e.g. raising a link above a sibling) may use a small literal like `z-index: 1` — the scale governs cross-component layers, not intra-component ones.

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
*   **`DatePicker` (`src/shared/ui/DatePicker`):** Glassmorphism date picker — an `Input`-styled Radix Popover trigger over a `react-day-picker` calendar (themed via its `--rdp-*` CSS variables). Value contract is the `YYYY-MM-DD` string; takes a `locale` prop. `captionLayout="dropdown"` with `fromYear`/`toYear` enables year navigation (used for birth dates). Use this instead of `<input type="date">`.
*   **`TimePicker` (`src/shared/ui/TimePicker`):** Companion to `DatePicker` — `Input`-styled Radix Popover trigger over two scrollable hour/minute columns. Value contract is the `HH:mm` string; `minuteStep` (default 5) controls the minute granularity. Use this instead of `<input type="time">`.
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

## 13.4 Page Transitions (Native View Transitions API)

App Router navigations use the browser's native **View Transitions API** for a subtle route-change crossfade. It is enabled via `experimental.viewTransition: true` in `next.config.mjs`. The flag alone is not enough — React only engages `document.startViewTransition` when a `<ViewTransition>` boundary wraps the changing content.

The boundary lives in `src/app/PageTransition.tsx` (a client component) and is **keyed by `usePathname()`** with `default="none"`. Keying turns a navigation into an `exit` of the old path + `enter` of the new one, while a Suspense reveal (skeleton → content within the same route) is only an `update` and therefore stays silent — this is what prevents the double-transition "jump" when entering an async page. The sidebar/header stay outside the boundary and don't animate.

The `enter`/`exit` props expose the `page-enter` / `page-exit` view-transition classes, tuned in `globals.css` — a 0.35s crossfade where the incoming page also slides up 8px:

```css
@keyframes page-fade-out { to { opacity: 0; } }
@keyframes page-slide-in {
  from { opacity: 0; transform: translateY(8px); }
}

::view-transition-old(.page-exit) { animation: page-fade-out 0.35s ease both; }
::view-transition-new(.page-enter) { animation: page-slide-in 0.35s ease both; }
```

Rules:
- Keep transitions **short and subtle** (~0.35s, small offset). This is ambient polish, not a focal animation.
- Always guard with `@media (prefers-reduced-motion: reduce)` → `animation: none` for accessibility.
- Suspense reveals must stay silent (`default="none"`). Only route changes (`enter`/`exit`) animate.
- To scope a transition to a specific element (shared-element morph), assign it a unique `view-transition-name`.

## 14. Guidelines for Developers & Agents

When creating or modifying components, adhere to these rules:

1.  **Do Not Hardcode Colors:** Use `var(--color-name)` from `globals.css` and the tokens listed above.
2.  **Use CSS Modules:** Apply styles via `Component.module.css`. Inline styles are forbidden (except for dynamically computed layout positions).
3.  **Contrast & Accessibility:** Ensure all text overlaying glass backgrounds is legible. Use `var(--text-primary)` (`#ffffff`) or `var(--text-secondary)` (`rgba(255, 255, 255, 0.7)`) to maintain high contrast against deep gradients.
4.  **Glass Hover States:** When hover states are applied to glass panels, slightly increase the background opacity or accent borders, rather than changing the background to a solid color.
5.  **Follow Border Radii & Spacing Scales:** Always map paddings and border-radius styles to the scales in sections 7 and 8 to keep the UI visually cohesive.
6.  **Respect Unit Separation (`rem` vs `px`):** Adhere to the guidelines in section 9. Do not mix them randomly; use `rem` for text and layout spacing, and `px` for borders and rounded corners.
7.  **Synchronization:** If you update any global variables in `globals.css` (or standard spacing constants), immediately update this document to keep the design system synchronized.
