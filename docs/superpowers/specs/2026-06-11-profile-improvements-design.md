# Profile Improvements — Design

**Date:** 2026-06-11
**Branch:** `profile-improvements`

## Goal

Expand the user profile (`/profile/[publicId]`) with richer fields, per-field privacy
controls, a "common guilds" block, and an owner settings panel. Match the project's
dark glassmorphism design system; layout/composition inspired by a card-based dashboard
reference (avatar card + stacked content blocks).

## Scope

In scope:

- New profile fields: **alias**, **display-as-alias** toggle, **icon** (lucide name),
  **about**, **interests** (tags), **socials** (curated platforms).
- Per-field **privacy** with 3 levels.
- **Common guilds** block (logged-in viewer vs anonymous).
- Owner **settings panel** (gear) to edit fields, icon, alias toggle, and privacy.
- Redesigned public profile + own profile layout in the dark glass theme.

Explicitly out of scope (future iterations):

- **Availability table** (free/busy by day with intervals) — deferred per user.
- Achievements / radar / learning-history widgets from the reference image.

## Data Model (Supabase)

**Variant 1 chosen:** everything on `profiles`, privacy as a single JSONB map.

Add columns to `profiles`:

| Column | Type | Notes |
|---|---|---|
| `alias` | `text` null | character name / nickname |
| `display_as_alias` | `boolean` default `false` | global toggle — when true, app-wide display name = alias |
| `icon` | `text` null | lucide-react icon name from a curated allow-list; **no privacy** |
| `about` | `text` null | free text, ≤ 500 chars |
| `interests` | `text[]` default `'{}'` | free tags, ≤ 10, each ≤ 30 chars |
| `socials` | `jsonb` default `'[]'` | array of `{ platform, value }` |
| `privacy` | `jsonb` default `'{}'` | map `field → 'private' \| 'guildmates' \| 'public'` |

Socials curated platforms: `discord`, `steam`, `twitch`, `telegram`, `twitter`,
`youtube`, `battlenet`. Each entry `{ platform: <one of above>, value: string }`
(handle or URL). `value` stored as entered; rendered as link when it is a URL.

Privacy-controlled fields (keys in `privacy`): `name` (real `full_name`), `alias`,
`about`, `interests`, `socials`, `joined`, `stats`, `common_guilds`.
**`icon` has no privacy** (always shown after the display name if set).
**`email` is never exposed** — visible only to the owner on their own profile.

### Privacy levels

| Stored value | Meaning |
|---|---|
| `private` | owner only |
| `guildmates` | owner + viewers who are logged in and share ≥ 1 guild |
| `public` | everyone, including anonymous viewers |

**Defaults** for fields not yet set in `privacy` (sensible, applied in code):
`name → guildmates`, `alias → public`, `about → public`, `interests → public`,
`socials → guildmates`, `joined → public`, `stats → public`,
`common_guilds → guildmates`.

### Migration

Apply via Supabase MCP `apply_migration`, then hand-edit `types.ts` per the project
migrations workflow (no CLI). Single additive migration; nullable columns + defaults,
no backfill needed. RLS: existing `profiles` select policy stays; per-field privacy is
**not** enforced by RLS — it is computed server-side (see below).

## Visibility Computation (server-side)

A pure helper resolves the **viewer relationship** to the profile, then filters fields:

```
relationship(viewer, profileOwner):
  'self'       if viewer.id === owner.id
  'guildmate'  if viewer logged in AND shares ≥1 guild with owner
  'public'     otherwise (other logged-in users AND anonymous)
```

`canSee(field, relationship, privacy)`:

- `self` → always true.
- level `public` → true for all.
- level `guildmates` → true for `self`/`guildmate`.
- level `private` → only `self`.

The fetch function returns only the fields the viewer may see; hidden fields are
omitted (not sent to the client). "Common guilds" list is fetched only for a logged-in
viewer and is subject to the `common_guilds` privacy level; anonymous viewers never get
it. When the viewer is logged in but shares no guilds, the block renders an explicit
"No common guilds" message (only if the block itself is visible to them).

## Alias semantics

- `display_as_alias = true`: the **display name** everywhere in the app (guild member
  lists, chat, header, events, profile title) is `alias`. The profile then shows the
  real `full_name` as a privacy-controlled "Real name" sub-field.
- `display_as_alias = false`: display name everywhere is `full_name`; `alias` (if set)
  may still appear on the profile as a privacy-controlled secondary field.
- App-wide display-name resolution will go through a single shared helper
  `resolveDisplayName(profile)` so all member/chat/header surfaces stay consistent.
- **Privacy interaction:** when `display_as_alias = true`, the alias is the public
  handle by definition — its app-wide use as the display name is **not** gated by the
  `alias` privacy level. The privacy level only controls whether the alias is shown as
  a separate field on the profile page (relevant mainly when the toggle is off).

## FSD Structure

- **`entities/user`** — extend `model/types.ts` (`UserProfile`, `PublicProfile`,
  add `ProfilePrivacy`, `SocialLink`, privacy level union). Extend
  `api/getPublicProfile.ts` to fetch new columns + compute visibility (add the
  relationship/`canSee` helpers under `entities/user/lib/`). Add
  `lib/resolveDisplayName.ts`. Add icon allow-list + socials platform config under
  `entities/user/config/`.
- **`features/update-profile-settings`** (new feature) — the gear settings panel:
  edit about/interests/alias/icon/socials + privacy map + display-as-alias toggle.
  RTK Query mutation via `injectEndpoints` on `baseApi`; route handler under
  `src/app/api/profile/` (PATCH) using the user-session client (RLS: a user may update
  only their own `profiles` row). Existing `update-profile-avatar` and
  `update-profile-name` features remain.
- **`entities/guild`** — add a query for "common guilds between viewer and owner"
  (`api/getCommonGuilds.ts`), used by the profile page composition. Server-side
  function, RLS-governed.
- **`app/profile/[publicId]`** — `page.tsx` composes public view; `OwnProfile.tsx`
  composes owner view with the settings panel entry point. New CSS modules for the
  redesigned blocks (glass cards). No inline styles.

## UI

Layout (mockup approved):

- **Header card** (glass): square avatar, display name + icon flair, real-name
  subtitle (if visible), online/status line, gear ⚙️ top-right (owner only).
- **Stacked blocks** (glass cards), each rendered only if visible to the viewer:
  About, Interests (chips), Socials (platform links), Common Guilds, Statistics.
- **Settings panel** (Radix Dialog, styled via CSS Modules): alias toggle, icon
  picker (curated lucide grid), and per-field 3-way privacy selector
  (🔒 private / 👥 guildmates / 🌍 public). Save persists via the PATCH endpoint.

Icons via `lucide-react` (already in project). Privacy selector is a segmented
3-option control per field.

## Testing

- Unit: `relationship`, `canSee`, `resolveDisplayName`, privacy-default merge,
  interests/about validation (length, count), socials platform validation.
- API: `getPublicProfile` returns only visible fields per relationship (self /
  guildmate / public / anonymous); `getCommonGuilds`; profile PATCH authorization
  (owner-only) and payload validation.
- Follow existing test patterns in `entities/user/api/*.test.ts`.

## Open Questions

None outstanding — availability table explicitly deferred.
