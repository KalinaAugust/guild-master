# Guild Announcements — Design

**Date:** 2026-06-15
**Status:** Approved (design)

## Summary

A new page `/announcements` showing a guild's announcement wall. Mirrors the
`guild-chat` page template: the `UpcomingEventsStrip` widget on top (next event)
and a guild switcher. Announcements are wall posts with a title and markdown
content. Admins/owner create, edit, pin, and delete them; every guild member can
comment and react. Posts can be pinned to the top of the feed.

## Decisions (locked)

- **Permissions:** Only `ADMIN`/`OWNER` can create, edit, pin, and delete
  announcements. All members can read, comment, and react.
- **Content format:** Markdown, rendered via `marked` + existing `dompurify`.
- **Create UI:** Single-screen modal form (not multi-step).
- **Comments/reactions storage:** Dedicated tables owned by the `announcement`
  entity. Event comment code is left untouched (STRICT SCOPE).
- **Comments:** Add + delete only — no editing.
- **Markdown library:** `marked` (lighter than `react-markdown`).
- **Sidebar icon:** `Megaphone`.

## Database (Supabase, 3 new tables)

### `announcements`
| column      | type        | notes                                  |
|-------------|-------------|----------------------------------------|
| id          | uuid pk     | default gen_random_uuid()              |
| guild_id    | uuid        | fk `guilds(id)` on delete cascade      |
| created_by  | uuid        | fk `profiles(id)`                      |
| title       | text        | not null                               |
| content     | text        | markdown source, not null              |
| is_pinned   | boolean     | default false                          |
| created_at  | timestamptz | default now()                          |
| updated_at  | timestamptz | default now()                          |

RLS:
- `select`: members of the guild (`is_member_of(guild_id)`).
- `insert` / `update` / `delete`: `has_guild_role(guild_id, 'ADMIN')` (covers
  OWNER per existing role hierarchy).

### `announcement_comments`
| column          | type        | notes                                |
|-----------------|-------------|--------------------------------------|
| id              | uuid pk     |                                      |
| announcement_id | uuid        | fk `announcements(id)` on delete cascade |
| user_id         | uuid        | fk `profiles(id)`                    |
| body            | text        | not null                             |
| created_at      | timestamptz | default now()                        |
| updated_at      | timestamptz | default now()                        |

RLS:
- `select`: guild members (via join to parent announcement's guild).
- `insert`: any guild member, `user_id = auth.uid()`.
- `delete`: author OR `ADMIN`/`OWNER` of the guild.
- No `update` policy (comments are not editable).

### `announcement_reactions`
| column          | type   | notes                                          |
|-----------------|--------|------------------------------------------------|
| id              | uuid pk|                                                |
| announcement_id | uuid   | fk `announcements(id)` on delete cascade       |
| user_id         | uuid   | fk `profiles(id)`                              |
| type            | text   | check in ('like','dislike','heart','doubt','poop') |

- `unique (announcement_id, user_id, type)` — one reaction of each type per
  user; a user may hold several distinct types at once. Toggling adds/removes a
  single (user, type) row.

RLS:
- `select`: guild members.
- `insert` / `delete`: own rows only (`user_id = auth.uid()`).

Feed ordering: `order by is_pinned desc, created_at desc`.

No unread tracking in this iteration (YAGNI). The sidebar `NavItem` already
supports a `badge`; unread counts can be added later, mirroring guild-chat.

## FSD Slices

### `entities/announcement`
- `model/types.ts`
  - `ReactionType = 'like' | 'dislike' | 'heart' | 'doubt' | 'poop'`
  - `ReactionSummary` — `{ type: ReactionType; count: number; reacted: boolean }`
  - `AnnouncementComment` — `{ id, announcementId, userId, body, createdAt, profile }`
  - `Announcement` — `{ id, guildId, createdBy, title, content, isPinned,
    createdAt, updatedAt, author profile, reactions: ReactionSummary[],
    commentCount, canManage }`
  - `CreateAnnouncementInput` — `{ title, content, isPinned }`
- `api/announcementApi.ts` — `injectEndpoints` on `baseApi`:
  - `getGuildAnnouncements(guildId)`
  - `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`, `setPinned`
  - `getAnnouncementComments(announcementId)`, `addAnnouncementComment`,
    `deleteAnnouncementComment`
  - `toggleReaction({ announcementId, type })` — optimistic update
- `api/*` server transport functions (Supabase) + `mapAnnouncementRow`,
  `mapAnnouncementCommentRow`. `canManage` computed server-side (author or
  ADMIN/OWNER via `has_guild_role`).
- `index.ts` public API barrel.

### `features/guild-announcement` (mirrors `features/guild-poll`)
- `ui/AnnouncementCard.tsx` — header (author avatar/name/date, pin badge, admin
  menu: pin/unpin, delete), title, `<Markdown>` content, `ReactionBar`, inline
  comments (list + composer).
- `ui/ReactionBar.tsx` — row of 5 emoji buttons (👍 👎 ❤️ 🤔 💩) with counts and
  active highlight; click toggles via `toggleReaction`.
- `ui/AnnouncementWizard.tsx` — single modal: title input, markdown editor with
  Write/Preview toggle (Preview uses `<Markdown>`), "pin" switch, Publish button.
- CSS Modules for each.

### `widgets/guild-announcements` (mirrors `widgets/guild-chat`)
- `ui/GuildAnnouncements.tsx` — `useGuildSelection` (guild switcher), "+ New
  announcement" button (visible only when the viewer can create, i.e. is
  ADMIN/OWNER of the active guild), feed of `AnnouncementCard` (pinned first),
  empty/loading states (skeletons), wizard mount.
- `index.ts` barrel.

### `shared/ui/Markdown`
- Domain-agnostic component: `marked.parse(source)` → `DOMPurify.sanitize` →
  `dangerouslySetInnerHTML`. Constrained renderer (no raw HTML passthrough).
- CSS Module for typographic styles aligned with design-system.md.

## Page & Navigation

- `src/app/announcements/page.tsx` — server component, mirror of
  `src/app/guild-chat/page.tsx`:
  - `getUser()` → `getMyGuilds(user.id)`; redirect to `/guilds` if none.
  - Resolve `defaultGuildId` from `lastActiveGuildId`.
  - `getServerEvents(defaultGuildId)` for the strip.
  - Render `UpcomingEventsStrip` + `GuildAnnouncements` inside `main`.
  - Matching `*.module.css` for layout.
- `src/widgets/sidebar/model/navItems.ts` — add
  `{ href: '/announcements', icon: Megaphone, labelKey: 'Common.announcements' }`.

## Transport (route handlers, mirror polls)

```
/api/guilds/[id]/announcements                       GET, POST
/api/guilds/[id]/announcements/[aId]                 PATCH (edit/pin), DELETE
/api/guilds/[id]/announcements/[aId]/comments        POST
/api/guilds/[id]/announcements/[aId]/comments/[cId]  DELETE
/api/guilds/[id]/announcements/[aId]/reactions       POST (toggle)
```

Supabase calls live in the route handlers (transport layer). RTK Query endpoints
in `entities/announcement` call these. Reaction toggle uses an optimistic
`onQueryStarted` patch against the cached `getGuildAnnouncements` list (mirrors
poll voting). Comment composer reuses `shared/ui/MessageComposer`.

## Reactions UI

Five toggle buttons rendered with emoji glyphs:
`👍 like · 👎 dislike · ❤️ heart · 🤔 doubt · 💩 poop`, each with a count and an
active-state highlight when the current user has reacted. Clicking toggles the
viewer's reaction of that type.

## Permissions flow

`canManage` (per announcement) and `canCreate` (per guild) are derived
server-side from `has_guild_role`. The widget hides the "New announcement" button
for non-admins; the card hides the admin menu (pin/delete) for non-managers.
RLS enforces the same rules at the database layer.

## i18n

New next-intl namespace `Announcements` (titles, buttons, empty/loading,
reaction labels, wizard fields, confirm-delete) and `Common.announcements` for
the sidebar label. Add to all existing locale files.

## Testing

- Unit: `mapAnnouncementRow`, reaction-toggle reducer/optimistic logic, markdown
  sanitization (ensures script/dangerous HTML is stripped).
- Component (vitest, matching existing style): `AnnouncementCard` (render,
  reaction toggle, admin menu visibility), `AnnouncementWizard` (validation,
  preview toggle, submit).

## Out of scope

- Unread/notification badges for announcements.
- Comment editing.
- Generalizing the event comment system.
- Reaction analytics / who-reacted modal (polls have voter modal; not requested
  here).
