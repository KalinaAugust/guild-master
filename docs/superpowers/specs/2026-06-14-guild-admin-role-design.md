# Guild Admin Role Management — Design

**Date:** 2026-06-14
**Status:** Approved

## Goal

Let guild owners promote a `MEMBER` to `ADMIN` and revoke it, via interaction with
each member row in `GuildMembersSection`. An admin can do everything except deleting
the guild and removing/demoting the owner — but the admin role itself is fully
owner-controlled.

## Permission matrix

| Action | Allowed for |
|---|---|
| Promote MEMBER → ADMIN | OWNER |
| Revoke ADMIN → MEMBER | OWNER |
| Remove MEMBER | OWNER + ADMIN |
| Remove ADMIN | OWNER |
| Remove / demote OWNER | nobody |

## Interaction

Replace the single remove button (`⊖`) on each row with a Radix `DropdownMenu`
trigger (`⋮`), following the existing `UserMenu` pattern. Menu contents depend on
viewer role × target role:

| Viewer \ Target | MEMBER | ADMIN | OWNER / self |
|---|---|---|---|
| OWNER | Make admin · Remove | Revoke admin · Remove | no menu |
| ADMIN | Remove | no menu | no menu |

- No menu on the viewer's own row (leaving is handled by the existing leave flow).
- Menu items: `Make admin` / `Revoke admin` use the `Shield` icon; `Remove from
  guild` uses `UserMinus`.
- All three actions (make admin / revoke admin / remove) are confirmed via the
  existing `ConfirmModal`. Errors surface through `toast.error`.

## Implementation

### Backend — `src/app/api/guilds/[id]/members/[userId]/route.ts`

- **New `PATCH`**: body `{ role: 'ADMIN' | 'MEMBER' }` (validated). Auth:
  `requireUser` + `requireGuildOwner`. Reject changing an OWNER's role (403).
  Reject unknown role values (400). Update `guild_members.role`.
- **Amend `DELETE`**: after reading `targetMembership.role`, if target is `ADMIN`,
  require OWNER (currently OWNER+ADMIN). MEMBER removal stays OWNER+ADMIN. OWNER
  removal stays forbidden for everyone.

### entities/guild

- **`api/guildApi.ts`**: add `updateGuildMemberRole` mutation →
  `PATCH guilds/${guildId}/members/${userId}`, same `invalidatesTags` as
  add/remove member.
- **`lib/useGuildPermissions.ts`**: additionally return `isOwner`
  (`myRole === 'OWNER'`). `canManageMembers` unchanged.
- **`index.ts`**: export `useUpdateGuildMemberRoleMutation`.

### widgets/guild-members — `GuildMembersSection`

- Swap the inline remove `Button` for a Radix `DropdownMenu` (`⋮` trigger + items),
  styled via CSS Module (model on `UserMenu.module.css`).
- Compute menu items from viewer role (`isOwner` / `canManageMembers`) and target
  role; hide menu on own row, OWNER row, and ADMIN rows when viewer is ADMIN.
- Reuse `ConfirmModal` for make admin / revoke admin / remove. Single pending-action
  state holding `{ type, userId, name }`.
- Sort list OWNER → ADMIN → MEMBER (currently OWNER-first only).

### i18n — `messages/{en,ru}.json`, namespace `GuildMembers`

Add: `makeAdmin`, `revokeAdmin`, `promoteConfirm` ("Make {name} an admin?"),
`revokeConfirm` ("Revoke admin rights from {name}?"), `roleError`,
`memberActions` (aria-label for the `⋮` trigger).

### Tests

- Route: PATCH — owner ok, admin 403, target owner 403, bad role 400. DELETE — new
  case: admin cannot remove an admin.
- Widget: menu item sets per viewer/target role combination
  (`GuildMembersSection.test.tsx`).

## Out of scope (YAGNI)

Granular per-permission flags, ownership transfer, additional role tiers. Only the
ADMIN ↔ MEMBER toggle.
