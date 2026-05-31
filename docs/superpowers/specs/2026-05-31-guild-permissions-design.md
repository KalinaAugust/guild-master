# Guild Permissions: Restrict Edit and Event Creation

## Goal

Only OWNER and ADMIN roles may create, edit, or delete events. Only the guild OWNER may edit or delete the guild itself. Regular MEMBERs see read-only UI. Design is future-proof: a per-guild settings table can extend `useGuildPermissions` without touching call sites.

## Core abstraction: `useGuildPermissions`

**Location:** `src/shared/lib/useGuildPermissions.ts`

```ts
useGuildPermissions(guildId: string | null | undefined, userId: string | null | undefined)
// Returns: { canManageEvents: boolean, canManageMembers: boolean }
```

- Uses `useGetGuildMembersQuery(guildId)` — RTK Query deduplicates the fetch.
- Finds the caller's `GuildMember` entry by `userId`.
- `canManageEvents` = role is `OWNER` or `ADMIN`.
- `canManageMembers` = role is `OWNER` or `ADMIN`.
- When `guildId` or `userId` is absent, both flags are `false`.
- **Future extension:** add a `guild_permissions` table; this hook is the single place to query it.

## Data flow for event permissions

```
DayPage (server component)
  ↓ creates Supabase client, reads user.id
  ↓ userId prop
DayEventsList (widget)
  ↓ useGuildPermissions(activeGuildId, userId)
  → Add Event button: render only if canManageEvents
  → EventCard onEdit: pass only if canManageEvents
  → EventCard onDelete: pass only if canManageEvents
```

## Data flow for guild edit permissions

```
GuildManagePage (client component, already has userId)
  owned[] → GuildList with onEdit + onDelete
  member[] → GuildList WITHOUT onEdit + onDelete (props omitted)
```

`GuildList` makes `onEdit` and `onDelete` optional; renders the actions `<div>` only when at least one is defined.

## GuildMembersSection (defense-in-depth)

- `EditGuildWizard` receives `userId` from `GuildManagePage`.
- `GuildMembersSection` receives `userId`, calls `useGuildPermissions`.
- Add-member form and Remove button hidden when `!canManageMembers`.
- In practice this gate is never reached by MEMBERs (they can't open the wizard), but the component stays self-contained.

## Files changed

| File | Change |
|------|--------|
| `src/shared/lib/useGuildPermissions.ts` | **NEW** |
| `src/app/day/[date]/page.tsx` | Fetch `userId` via `createClient`, pass to `DayEventsList` |
| `src/widgets/day-events/ui/DayEventsList.tsx` | Accept `userId`, gate buttons on `canManageEvents` |
| `src/features/manage-guilds/ui/GuildList.tsx` | `onEdit?`, `onDelete?` optional |
| `src/features/manage-guilds/ui/GuildManagePage.tsx` | Omit handlers for member section |
| `src/features/manage-guilds/ui/EditGuildWizard.tsx` | Add `userId` prop, forward to `GuildMembersSection` |
| `src/features/manage-guilds/ui/GuildMembersSection.tsx` | Accept `userId`, hide mutating UI via hook |

## Out of scope

- Server-side RLS already blocks unauthorized mutations; these are UI-only changes.
- No new API routes or Supabase schema changes required.
- No new unit tests (per project conventions).
