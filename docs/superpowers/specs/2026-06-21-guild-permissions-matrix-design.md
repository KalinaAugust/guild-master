# Guild Permissions Matrix — Design

**Date:** 2026-06-21
**Status:** Approved, ready for implementation plan

## Summary

Add a configurable per-action permissions matrix to a guild. The guild owner picks, in the
**Settings** tab of the create/edit guild overlay, **who may create** each of four content types.
Each action has three levels: **all members**, **officers**, **owner**.

This replaces today's hard-coded, inconsistent gates (events/announcements = officers only;
polls/CTA = any member) with a setting the owner controls.

## Decisions (locked)

1. **Enforcement depth:** UI gating **and** server enforcement in route handlers. RLS stays the
   baseline membership gate (unchanged). No RLS rewrite.
2. **Semantics:** the setting controls **creation only**. Authors always edit/delete their own
   content; ADMIN/OWNER moderation of others' content is unchanged.
3. **Defaults (preserve current behavior):** `events=officers`, `announcements=officers`,
   `polls=all`, `call_to_actions=all`. Existing guilds keep `permissions = NULL` and fall back to
   these defaults — nothing breaks.
4. **Who edits the matrix:** **OWNER only** (server gate `requireGuildOwner`).
5. **Where shown:** the Permissions section appears in the Settings tab in **both** create and edit
   modes (in create mode the creator is the owner).

## Levels → roles

| Level      | Allowed roles            |
|------------|--------------------------|
| `all`      | MEMBER, ADMIN, OWNER     |
| `officers` | ADMIN, OWNER             |
| `owner`    | OWNER                    |

Actions: `events`, `announcements`, `polls`, `call_to_actions`.

## Data model

- New column **`guilds.permissions`** — `jsonb`, **nullable**, no default.
- Shape (any subset of keys may be present):
  ```json
  { "events": "officers", "announcements": "officers", "polls": "all", "call_to_actions": "all" }
  ```
- `NULL` column or a missing key → resolve to the per-action default above.
- Migration applied via Supabase MCP (`apply_migration`); hand-edit `types.ts` to add the column to
  the `guilds` row type. No CLI.

## Server — enforcement

New helper in `src/shared/api/guildAuth.ts`, mirroring `requireGuildRole`:

```ts
type GuildAction = 'events' | 'announcements' | 'polls' | 'call_to_actions';

// 403 NextResponse if the caller's role is not allowed by the guild's permission level
// for `action`; null if allowed. Reads guilds.permissions + the caller's guild_members.role.
requireGuildPermission(supabase, guildId, userId, action): Promise<NextResponse | null>;
```

- A small pure resolver maps `permissions + action → required level → allowed roles`, applying
  defaults for NULL/missing keys. Reused on the client.

Wire into the four POST route handlers (all already `requireUser` except events):

| Route | Change |
|---|---|
| `src/app/api/events/route.ts` POST | add `requireUser`; read `guildId` from body; `requireGuildPermission(.., 'events')` |
| `src/app/api/guilds/[id]/announcements/route.ts` POST | replace `requireGuildRole(['ADMIN','OWNER'])` with `requireGuildPermission(id, 'announcements')` |
| `src/app/api/guilds/[id]/polls/route.ts` POST | add `requireGuildPermission(id, 'polls')` |
| `src/app/api/guilds/[id]/call-to-actions/route.ts` POST | replace `requireGuildRole(['MEMBER',...])` with `requireGuildPermission(id, 'call_to_actions')` |

**Out of scope / unchanged:** edit & delete routes, the CTA threshold auto-launch (system action,
SECURITY DEFINER RPC creates the event — not a user `events` create), the AI helper.

## Server — saving the matrix

Extend the existing guild update path (`PATCH /api/guilds/[id]` → `updateGuild`):

- Accept an optional `permissions` field in the body.
- When `permissions` is present, gate with `requireGuildOwner` before persisting (other guild
  fields keep their current authorization).
- Persist the JSONB as-is (validated to the known action keys + level enum).

## Client — UX gating

- Add `permissions?: GuildPermissions` to the `Guild` type (`entities/guild/model/types.ts`) and
  map it in `getGuilds` (and any guild-by-id read the wizard/hook relies on).
- Pure resolver `resolveGuildPermission(permissions, action, role): boolean` in `entities/guild`
  (shared with the server helper's logic / same defaults).
- Extend `useGuildPermissions(guildId, userId)` to also surface per-action create flags:
  `canCreateEvents`, `canCreateAnnouncements`, `canCreatePolls`, `canCreateCallToActions`.
  It already loads members for the role; it additionally needs the guild's `permissions`
  (from the loaded guild entry / a guild query). Keep existing `canManageEvents`,
  `canManageMembers`, `isOwner`.
- Create buttons/entry points for the four content types read the matching `canCreate*` flag.

## UI — Settings tab Permissions section

In `src/features/manage-guilds/ui/EditGuildWizard.tsx`, Settings tab:

- New **Permissions** section, rendered when the viewer is the owner (in create mode the creator is
  owner → always shown).
- Four rows, in order: **Events, Announcements, Polls, Looking for group (CTA)**. Each row is a
  `shared/ui/Select` with three options (all / officers / owner).
- Local state in the wizard, initialized from `guild.permissions` (or defaults).
- On submit:
  - Edit mode → include `permissions` in the `updateGuild` call.
  - Create mode → after the guild is created, apply `permissions` via `updateGuild` (same
    post-create pattern already used for the avatar). Defaults apply if untouched.
- CSS Modules only; align with design-system. No inline styles.

## i18n

Add keys to the existing **`Guild`** namespace in **both** `messages/en.json` and `messages/ru.json`
(full key parity):

- Section title (e.g. `permissionsSection`).
- Four action labels: events, announcements, polls, looking-for-group.
- Three level labels: all members / officers / owner.

`Guild` is already a registered client namespace — no `layout.tsx` change needed.

## Out of scope

- RLS policy rewrites (baseline membership RLS unchanged).
- Per-action edit/delete permissions and moderation changes.
- CTA threshold auto-launch behavior.
- Any new content type beyond the four listed.

## Testing

- Unit: `resolveGuildPermission` — defaults for NULL/missing keys, each level→role mapping.
- Unit/integration as feasible for `requireGuildPermission` (allowed vs 403 per level/role).
- Verify the four POST routes reject under-privileged callers and allow privileged ones.
- Client: `useGuildPermissions` returns correct `canCreate*` flags per role × level.
