# Guild Management Page — Design Spec

**Date:** 2026-05-24

## Overview

Replace the `/guilds/create` route with a full Guild Management page at `/guilds`. The page shows two lists of guilds (owned vs. member), allows creating a new guild via a fullscreen wizard, editing a guild via a fullscreen wizard (stubs), and deleting a guild with a confirmation modal.

---

## Route & Navigation

- **New route:** `src/app/guilds/page.tsx` (server component, auth-guarded)
- **Delete:** `src/app/guilds/create/` (entire folder removed)
- **UserMenu:** href `/guilds/create` → `/guilds`; label key `Guild.createTitle` → `Guild.manageTitle`
- **Proxy:** add `/guilds` to the list of protected routes in `src/proxy.ts`

---

## FSD Structure

### New feature slice: `src/features/manage-guilds/`

```
src/features/manage-guilds/
  ui/
    GuildManagePage.tsx       — client component, page root, owns all local state
    GuildManagePage.module.css
    GuildList.tsx             — renders one titled list with edit/delete icons per row
    GuildList.module.css
    CreateGuildWizard.tsx     — fullscreen overlay, real create logic
    CreateGuildWizard.module.css
    EditGuildWizard.tsx       — fullscreen overlay, stubs only
    EditGuildWizard.module.css
  index.ts
```

### Delete: `src/features/create-guild/`

Entire slice removed; logic migrated into `CreateGuildWizard`.

---

## Components

### `GuildManagePage`

- Client component (`'use client'`)
- Calls `useGetGuildsQuery()` (new RTK Query endpoint)
- Gets current user id from Supabase client (`supabase.auth.getUser()`) once on mount, stored in local state
- Splits guilds into two arrays client-side: `owned = guilds.filter(g => g.ownerId === userId)` and `member = guilds.filter(g => g.ownerId !== userId)`
- Local state:
  ```ts
  const [createOpen, setCreateOpen] = useState(false)
  const [editingGuild, setEditingGuild] = useState<Guild | null>(null)
  const [deletingGuild, setDeletingGuild] = useState<Guild | null>(null)
  ```
- Renders:
  - "Create Guild" button (primary, top-right)
  - `<GuildList title={ownerSectionLabel} guilds={owned} onEdit={...} onDelete={...} />`
  - `<GuildList title={memberSectionLabel} guilds={member} onEdit={...} onDelete={...} />`
  - `<CreateGuildWizard open={createOpen} onClose={() => setCreateOpen(false)} />`
  - `<EditGuildWizard guild={editingGuild} onClose={() => setEditingGuild(null)} />`
  - `<ConfirmModal isOpen={!!deletingGuild} onClose={...} onConfirm={handleDelete} />`

### `GuildList`

Props: `{ title: string; guilds: Guild[]; onEdit: (g: Guild) => void; onDelete: (g: Guild) => void }`

- Section heading (`<h2>`)
- If empty: short empty-state message
- Each row: Shield icon + guild name + optional description + Edit button (Pencil icon) + Delete button (Trash icon)
- Uses lucide-react icons: `Shield`, `Pencil`, `Trash2`
- CSS Modules only, no inline styles

### `CreateGuildWizard`

Props: `{ open: boolean; onClose: () => void }`

- Fullscreen overlay via `@radix-ui/react-dialog` — same pattern as `EventWizard`
- Layout: header / body / footer
- Body: single column (no sidebar needed for create)
  - Name input (required)
  - Description textarea (optional)
- Footer: Cancel + Create buttons
- On submit: calls `useCreateGuildMutation`, on success calls `onClose()` and shows `toast.success`
- Invalidates `'Guild'` tag on success

### `EditGuildWizard`

Props: `{ guild: Guild | null; onClose: () => void }`

- Open when `guild !== null`
- Fullscreen overlay, same pattern as `CreateGuildWizard`
- Body: two-column grid (like EventWizard)
  - Left column: Name field (pre-filled, read-only stub), Description field (pre-filled, read-only stub)
  - Right column: three stub sections — Avatar, Members, Settings (each rendered as a stub placeholder div)
- Footer: Cancel + Save (Save is disabled — stub)
- No API calls, no mutations

---

## API Changes

### `src/shared/api/baseApi.ts`

Add `'Guild'` to `tagTypes`:
```ts
tagTypes: ['Event', 'Participant', 'GuildMember', 'Guild']
```

### `src/entities/guild/api/guildApi.ts`

Add three new endpoints:

1. **`getGuilds`** — `GET /api/guilds` → returns `Guild[]`
   - `providesTags: [{ type: 'Guild', id: 'LIST' }]`

2. **`createGuild`** (mutation) — `POST /api/guilds` body `{ name, description? }`
   - `invalidatesTags: [{ type: 'Guild', id: 'LIST' }]`

3. **`deleteGuild`** (mutation) — `DELETE /api/guilds/:id`
   - `invalidatesTags: [{ type: 'Guild', id: 'LIST' }]`

Export: `useGetGuildsQuery`, `useCreateGuildMutation`, `useDeleteGuildMutation`

### New route handler: `src/app/api/guilds/route.ts`

- `GET`: query `guild_members` joined with `guilds` for current user → return `Guild[]` (reuse logic from `getMyGuilds` server action)
- `POST`: create guild + insert owner as MEMBER with role OWNER (reuse logic from `createGuild` server action, **without** the `redirect('/')`)

### Existing route handler: `src/app/api/guilds/[id]/route.ts`

Does not exist yet (only `[id]/members/route.ts` exists). Create it with:
- `DELETE`: delete guild by id (check ownership via RLS)

---

## i18n Keys

Add to both `en` and `ru` message files:

| Key | EN | RU |
|-----|----|----|
| `Guild.manageTitle` | Manage Guilds | Управление гильдиями |
| `Guild.ownerSection` | You are the owner | Вы владелец |
| `Guild.memberSection` | You are a member | Вы участник |
| `Guild.createButton` | Create Guild | Создать гильдию |
| `Guild.editTitle` | Edit Guild | Редактировать гильдию |
| `Guild.deleteSuccess` | Guild deleted | Гильдия удалена |
| `Guild.deleteConfirm` | Are you sure you want to delete this guild? | Вы уверены, что хотите удалить эту гильдию? |
| `Guild.emptyOwned` | You don't own any guilds yet | У вас нет своих гильдий |
| `Guild.emptyMember` | You are not a member of any guilds | Вы не состоите ни в одной гильдии |

---

## Existing Server Actions — fate

| File | Action |
|------|--------|
| `entities/guild/api/getGuilds.ts` (`getMyGuilds`) | Keep as-is; RTK Query route handler reuses its Supabase query logic |
| `entities/guild/api/createGuild.ts` | Keep as-is (still used if referenced elsewhere); RTK Query route handler reuses logic without `redirect` |

---

## Testing

- Unit test `GuildList`: renders title, guild rows, calls `onEdit`/`onDelete`
- Unit test `CreateGuildWizard`: submits form, calls mutation, shows toast
- RTK Query endpoint tests follow existing patterns in `getGuilds.test.ts`
