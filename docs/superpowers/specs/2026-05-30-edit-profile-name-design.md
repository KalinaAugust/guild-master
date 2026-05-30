# Edit Profile Name

Date: 2026-05-30

## Goal

Let a user edit their `full_name` inline on the profile page.

## Context

- `src/app/profile/page.tsx` is a server component. It fetches `profiles.full_name` and shows a "Name" info item **only when a name exists**. The big `<h1>` shows the email prefix, not the name.
- Profile mutations in this codebase are done with a **direct Supabase client call** from `entities/user/api/*` (see `updateAvatar.ts`), not RTK Query or a route handler. The feature slice (`update-profile-avatar`) provides a client component that calls it, shows a `toast`, and `router.refresh()`.
- This new feature mirrors that established pattern.

> Convention note: CLAUDE.md prefers RTK Query / route handlers for server data. The existing avatar mutation already bypasses that with a direct client call. To stay consistent with the avatar precedent, name editing follows the same direct-client pattern.

## Approach

### entities layer

`src/entities/user/api/updateFullName.ts`:

```ts
updateFullName(userId: string, fullName: string): Promise<void>
```
- Creates the browser Supabase client (`@/shared/api/supabase/client`).
- `supabase.from('profiles').update({ full_name: fullName }).eq('id', userId)`.
- Throws on error (caller handles the toast).

Export it from `src/entities/user/index.ts`.

### feature slice: `src/features/update-profile-name/`

- `ui/EditableName/EditableName.tsx` — `'use client'` component.
  - Props: `initialFullName: string | null`, `userId: string`.
  - **View mode:** `<span>` showing the name, or the placeholder `Add your name` when empty/null, plus a pencil icon button (lucide `Pencil`) to enter edit mode.
  - **Edit mode:** shared `Input` (controlled, `maxLength={50}`) seeded from `initialFullName`, plus shared `Button` Save and Cancel.
  - **Save:** call `updateFullName(userId, trimmedValue)`; on success `toast.success`, `router.refresh()`, return to view mode; on error `toast.error` and stay in edit mode. Buttons are `disabled` while the request is in flight.
  - **Save disabled** when the trimmed value equals the initial value (no change). Empty value is allowed (clears the name).
  - **Cancel:** reset the input to `initialFullName` and return to view mode.
- `ui/EditableName/EditableName.module.css` — styles for the view row (name + pencil) and the edit row (input + buttons).
- `ui/EditableName/index.ts` — re-export `EditableName`.
- `index.ts` — public API: `export * from './ui/EditableName';`

### page change: `src/app/profile/page.tsx`

- Remove the `{profile?.full_name && (...)}` conditional so the "Name" info item always renders.
- Keep the info-item wrapper, the `User` icon, and the `Name` label on the page.
- Replace `<p>{profile.full_name}</p>` with:
  ```tsx
  <EditableName initialFullName={profile?.full_name ?? null} userId={user.id} />
  ```
- Import `EditableName` from `@/features/update-profile-name`.

## Data flow

Server page → `initialFullName` prop → client `EditableName` → on Save calls `entities/user` `updateFullName` (direct Supabase client) → `router.refresh()` re-renders the server page with the new name.

## Error handling

- Supabase update error → `toast.error('Failed to update name')`, stay in edit mode, re-enable buttons.
- In-flight: Save/Cancel disabled to prevent double submit.

## Reuse

- `shared/ui` `Input`, `Button`.
- lucide-react `Pencil`.

## Out of scope

- No change to the `<h1>` header title (stays email prefix).
- No RTK Query refactor of the avatar mutation.
- No new tests (project rule).
- No validation beyond trim + `maxLength`.

## Verification

- Profile page shows a "Name" row even when no name is set (placeholder `Add your name`).
- Pencil → input + Save/Cancel. Editing and Save updates `profiles.full_name`, toast appears, the displayed name updates after refresh.
- Cancel discards changes. Save is disabled when unchanged.
- `npm run lint` passes.
