# Color Scheme: Night Sky (Ocean Night)

**Date:** 2026-05-25
**Branch:** change-color-scheme

## Goal

Replace the current purple color scheme with a dark blue "night ocean sky" theme. All color tokens live in CSS custom properties in `src/app/globals.css`; particle colors are in `ParticlesBackground.tsx`. No component logic changes.

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Background direction | Ocean Night (#030d1a → #0a2540 → #0e3460) | Deep sea-blue, softer than pure midnight |
| Primary accent | Sky blue #38bdf8 | High contrast on dark bg, cohesive with ocean theme |
| Secondary accent | #7dd3fc | Lighter variant of primary for hover states, links |
| Yellow accent | Golden amber #f59e0b | Warmer than #ffcc33, harmonizes with deep blue |
| Particles | White/silver #e2e8f0, links rgba(255,255,255,0.3) | Star-like appearance on night sky |
| Event "other" | rgba(56,189,248,0.2) / #38bdf8 | Was purple; now consistent with new accent |
| Other event colors | Unchanged | Red (raid), blue (meeting), green (game) are neutral |

## Token Mapping

| Token | Old value | New value |
|---|---|---|
| `--bg-gradient` | `linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)` | `linear-gradient(135deg, #030d1a 0%, #0a2540 50%, #0e3460 100%)` |
| `--accent-primary` | `#9d4edd` | `#38bdf8` |
| `--accent-secondary` | `#c8b6ff` | `#7dd3fc` |
| `--accent-yellow` | `#ffcc33` | `#f59e0b` |
| `--accent-glow` | `rgba(157, 78, 221, 0.3)` | `rgba(56, 189, 248, 0.3)` |
| `--text-highlight` | `#c8b6ff` | `#bae6fd` |
| `--modal-bg` | `#1a0b2e` | `#051020` |
| `--event-other` | `rgba(157, 78, 221, 0.3)` | `rgba(56, 189, 248, 0.2)` |
| `--event-other-border` | `#9d4edd` | `#38bdf8` |
| Particles color | `#9d4edd` | `#e2e8f0` |
| Particles links color | `#c8b6ff` | `rgba(255, 255, 255, 0.3)` |
| `--bg-blob` background | `var(--accent-primary)` (purple) | stays as `var(--accent-primary)` — picks up new value automatically |

Tokens not touched: `--glass-bg`, `--glass-border`, `--glass-blur`, `--shadow-glass`, `--text-primary`, `--text-secondary`, `--text-muted`, all `--event-raid-*`, `--event-meeting-*`, `--event-game-*`.

## Files to Change

1. `src/app/globals.css` — update 9 CSS custom property values
2. `src/shared/ui/ParticlesBackground/ParticlesBackground.tsx` — update `color` and `links.color` in `particlesOptions`

## Out of Scope

- No component structure changes
- No layout changes
- No new tokens — only value updates to existing ones
