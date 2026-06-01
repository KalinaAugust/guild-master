# Guild Detail Page — Design Spec

**Date:** 2026-06-01
**Branch:** guild-page

## Overview

Public-facing page at `/guilds/[id]` showing guild info. Non-members can apply to join; the guild owner approves or declines requests. Clicking a guild item in the Manage Guilds list navigates to this page.

---

## Routing & Auth

- Route: `src/app/guilds/[id]/page.tsx` — Server Component.
- `proxy.ts` gains an exception for `/guilds/` so unauthenticated users can visit.
- Server Component resolves `membershipStatus` from Supabase and passes it as a prop to `GuildDetailContent`.

| Visitor state | `membershipStatus` | Right-column UI |
|---|---|---|
| Not logged in | `'guest'` | Info text + "Apply to join" → redirect `/login` on click |
| Logged in, not a member, no pending request | `'none'` | "Apply to join" button |
| Logged in, pending request sent | `'pending'` | "Request sent" badge (disabled) |
| Logged in, member | `'member'` | "You are a member" badge |
| Logged in, owner | `'owner'` | "You are the owner" badge + pending requests section |

Back link → `/guilds`.

Server Component determines `membershipStatus` by checking in order:
1. No session → `'guest'`
2. Row in `guild_members` with role `OWNER` → `'owner'`
3. Row in `guild_members` with role `ADMIN`/`MEMBER` → `'member'`
4. Row in `guild_join_requests` with `status = 'pending'` → `'pending'`
5. Otherwise → `'none'`

---

## UI Layout

Mirrors `EventDetailContent` structure:

```
┌─────────────────────────────────────────────────┐
│ ‹ Back to guilds            [Guild Name]         │  ← header
├────────────────────────┬────────────────────────┤
│  Description           │  Member status /        │  ← body (2 cols)
│  Owner                 │  Join requests (owner)  │
│  Member count          │                         │
├─────────────────────────────────────────────────┤
│                        [Apply to join]           │  ← footer (non-members only)
└─────────────────────────────────────────────────┘
```

- **Left column:** description block, owner name, member count.
- **Right column (non-owner):** membership status badge or "Apply" CTA.
- **Right column (owner):** list of pending join requests — each row shows applicant name + "Accept" / "Decline" buttons. Empty state: "No pending requests".
- **Footer:** "Apply to join" button for `none` and `guest` states only. After successful submission → button becomes "Request sent" (disabled). Guest click → `router.push('/login')`.

---

## FSD Structure

```
src/
  app/
    guilds/
      [id]/
        page.tsx                  ← Server Component (auth check, membershipStatus)
        GuildDetailPage.module.css
  features/
    guild-detail/
      index.ts
      ui/
        GuildDetailContent.tsx    ← 'use client', main feature component
        GuildDetailContent.module.css
        JoinRequestItem.tsx       ← single pending request row (owner view)
        JoinRequestItem.module.css
```

`GuildList.tsx` (existing): each `<li>` becomes a `<Link href={/guilds/${guild.id}}>`. Edit/Delete icon buttons call `e.stopPropagation()`.

---

## Database

New table: `guild_join_requests`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `guild_id` | uuid FK → guilds | |
| `user_id` | uuid FK → profiles | |
| `status` | text | `pending` \| `approved` \| `declined` |
| `created_at` | timestamptz | default now() |

Unique constraint: `(guild_id, user_id)` where `status = 'pending'` — one active pending request per user per guild (partial unique index). Past approved/declined rows are kept for history; a user can re-apply after being declined or removed.

RLS:
- Owner of the guild can read all requests for their guild.
- User can read/insert their own requests.
- Only the guild owner can update `status`.

---

## API Route Handlers

### `GET /api/guilds/[id]`
- Public (RLS only, no `requireUser`).
- Returns `{ id, name, description, ownerId, ownerName, memberCount }`.
- `ownerName` fetched via join on `profiles`.

### `POST /api/guilds/[id]/join-requests`
- Requires auth (`requireUser`).
- Inserts row with `status: 'pending'`.
- Creates notification for guild owner (type: `join_request`, payload: `{ guildId, guildName, applicantName }`).
- Returns `{ id, status }`.

### `GET /api/guilds/[id]/join-requests`
- Requires auth + guild owner role (`requireGuildOwner`).
- Returns pending requests with applicant profile: `[{ id, userId, userName, avatarUrl, createdAt }]`.

### `PATCH /api/guilds/[id]/join-requests/[requestId]`
- Requires auth + guild owner role.
- Body: `{ action: 'approve' | 'decline' }`.
- `approve`: updates status → `approved`, inserts into `guild_members` with role `MEMBER`.
- `decline`: updates status → `declined`.
- Both: creates notification for the applicant (type: `join_request_resolved`, payload: `{ guildName, action }`).
- Returns `{ success: true }`.

---

## RTK Query Endpoints

All injected into `baseApi` via `entities/guild/api/guildApi.ts`:

| Endpoint | Type | Tags |
|---|---|---|
| `getGuildById(id)` | query | `Guild/id` |
| `submitJoinRequest(guildId)` | mutation | invalidates nothing |
| `getJoinRequests(guildId)` | query | `JoinRequest/LIST-guildId` |
| `resolveJoinRequest({ guildId, requestId, action })` | mutation | invalidates `JoinRequest/LIST-guildId`, `GuildMember/LIST-guildId` |

---

## Notifications

Reuse existing notification system (`notificationApi.ts`, `NotificationPanel`).

Two new notification events (server-side inserts into `notifications` table):
1. **Owner receives:** "User X applied to join [Guild Name]" — on `POST /join-requests`.
2. **Applicant receives:** "Your request to join [Guild Name] was approved/declined" — on `PATCH /join-requests/[id]`.

---

## Out of Scope

- Bulk approve/decline.
- Request expiry / auto-decline.
- Admin-role members approving requests (owner only).
