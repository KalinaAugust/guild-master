# Guild Member Management — Design Spec

**Date:** 2026-05-25
**Branch:** participant-selection
**Scope:** Add member-management UI to EditGuildWizard; backend endpoints for add/remove by email.

---

## Goal

Allow guild owners and admins to add members by email and remove them from within the EditGuildWizard's right panel.

---

## Architecture

### Right panel: tab interface

Replace the three stacked "Coming soon" sections (Avatar / Members / Settings) with a two-tab switcher at the top of the right column:

- **Members** — member list + add by email
- **Settings** — avatar placeholder ("Coming soon") + future settings

Tab state: local `useState<'members' | 'settings'>` inside `EditGuildWizard`. No Radix — plain `<button>` elements styled via CSS Modules. Icons: `Users` and `Settings` from lucide-react (already imported).

### Members tab: behavior

- Only active (non-empty) when `guild !== null` (edit mode). In create mode: show "Save guild first to manage members."
- Email input + "Add" button at the top.
- Current member list below: avatar → name (or email fallback) → role badge → remove button.
- Remove button hidden for OWNER row.
- Errors (user not found, already a member, forbidden) shown via `toast.error`.
- List auto-refreshes via RTK Query cache invalidation after add/remove.

### Settings tab

- Avatar section: "Coming soon" placeholder (identical to current state).
- Retained for future use; no new logic.

---

## API

### POST `/api/guilds/[id]/members`

**Body:** `{ email: string }`

**Logic:**
1. Authenticate caller via `supabase.auth.getUser()`.
2. Verify caller is OWNER or ADMIN of the guild (query `guild_members`).
3. Look up target user: `supabase.auth.admin.getUserByEmail(email)` — requires service role key (server-side only, safe).
4. Return 404 if user not found.
5. Check for duplicate membership; return 409 if already a member.
6. Insert into `guild_members` with role `MEMBER`.
7. Return new member record.

**Errors:** 401 Unauthorized, 403 Forbidden, 404 user not found, 409 already a member, 500 server error.

### DELETE `/api/guilds/[id]/members/[userId]`

**Logic:**
1. Authenticate caller.
2. Verify caller is OWNER or ADMIN.
3. Reject if target userId is the guild OWNER (cannot remove owner).
4. Delete row from `guild_members`.
5. Return `{ success: true }`.

**Errors:** 401, 403, 404 (member not found), 500.

---

## Data layer

`entities/guild/api/guildApi.ts` — add two mutations:

```ts
addGuildMember: builder.mutation<GuildMember, { guildId: string; email: string }>
removeGuildMember: builder.mutation<{ success: boolean }, { guildId: string; userId: string }>
```

Both invalidate `{ type: 'GuildMember', id: 'LIST-{guildId}' }` so the member list refreshes automatically.

The existing `useGetGuildMembersQuery` is reused for the member list.

---

## New files

| File | Purpose |
|---|---|
| `src/features/manage-guilds/ui/GuildMembersSection.tsx` | Members tab content (list + add form) |
| `src/features/manage-guilds/ui/GuildMembersSection.module.css` | Styles for members section |
| `src/app/api/guilds/[id]/members/[userId]/route.ts` | DELETE endpoint |

## Modified files

| File | Change |
|---|---|
| `src/features/manage-guilds/ui/EditGuildWizard.tsx` | Replace right panel with tab switcher; render `GuildMembersSection` or Settings placeholder |
| `src/features/manage-guilds/ui/EditGuildWizard.module.css` | Tab bar styles |
| `src/entities/guild/api/guildApi.ts` | Add `addGuildMember`, `removeGuildMember` mutations |
| `src/app/api/guilds/[id]/members/route.ts` | Add `POST` handler alongside existing `GET` |
| `src/entities/guild/index.ts` | Export new hooks |

---

## Error handling

- Network/server errors: `toast.error` with generic message.
- "User not found": `toast.error('User with this email not found')`.
- "Already a member": `toast.error('User is already a member')`.
- Loading state: "Add" button shows spinner / disabled during mutation.

---

## Testing

- No unit tests for route handlers (Supabase admin client is hard to mock).
- `GuildMembersSection` gets a unit test covering: renders member list, add button disabled when input empty, shows error message on failed add.
- Existing `GuildList.test.tsx` pattern is the reference.
