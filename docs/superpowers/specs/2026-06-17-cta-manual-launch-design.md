# CTA Manual Launch — Design

**Date:** 2026-06-17

## Problem

A Call to Action on `/looking-for-group` currently becomes a calendar event **only**
when its interested count reaches `target_count` (auto-launch via `_maybe_launch_cta`).
The creator cannot start the event earlier — e.g. to add participants manually later or
let users join the event themselves once it exists.

## Goal

Let the CTA author (and guild `ADMIN`/`OWNER`) manually launch the event at any time,
with as few as 1 participant (the author always counts), without waiting for the
threshold. Launch is irreversible and guarded by a confirmation dialog.

## Decisions

- **Who can launch:** author OR `ADMIN`/`OWNER` — same set as `cta.canManage`.
- **Minimum participants:** 1 (author is always interested; no lower bound).
- **Expiry:** launching is blocked once `event_date` is in the past (no events in the past).
- **Already launched:** blocked (`event_id IS NOT NULL`).
- **UI:** a "Create event now" button in the card footer, alongside the existing
  "I'm in" button, shown only for `canManage` when not launched and not expired.
- **Confirmation:** a `ConfirmModal` ("Create event with N participants?") precedes launch.
- **Post-launch behavior:** identical to auto-launch — the same `events` row creation,
  interested users copied into `event_participants` (`confirmed`), card flips to the
  launched state ("Open event"). Further joining happens on the event page (existing flow).

## Database (Supabase)

Refactor to avoid duplicating event-creation logic:

1. Extract the launch body of `_maybe_launch_cta` into a private helper
   `_do_launch_cta(p_cta_id)` — creates the `events` row from the CTA, copies all
   interested users into `event_participants` (`confirmed`), stamps `event_id`/`launched_at`.
   `_maybe_launch_cta` keeps only the threshold check and calls `_do_launch_cta`.
   (EXECUTE on `_do_launch_cta` revoked from `anon`/`authenticated`.)
2. New `launch_call_to_action(p_cta_id) → uuid` (SECURITY DEFINER, EXECUTE revoked from
   `anon`, granted to `authenticated`):
   - raise unless `auth.uid()` is the CTA's `created_by` OR holds `ADMIN`/`OWNER`
     (`has_guild_role`) in the CTA's guild;
   - raise if already launched (`event_id IS NOT NULL`);
   - raise if expired (`event_date < now()`);
   - otherwise call `_do_launch_cta(p_cta_id)`. No threshold check.

Applied via Supabase MCP migration; `src/shared/api/supabase/types.ts` hand-edited to add
the new RPC signature.

## Application layers

Mirror the existing interest flow.

- **Entity fn** `src/entities/call-to-action/api/launchCallToAction.ts`:
  ```ts
  export const launchCallToAction = async (ctaId: string): Promise<CallToAction> => {
    const supabase = await createClient();
    const { error } = await supabase.rpc('launch_call_to_action', { p_cta_id: ctaId });
    if (error) throw error;
    return getCallToActionById(ctaId);
  };
  ```
- **Route handler** `src/app/api/guilds/[guildId]/call-to-actions/[ctaId]/launch/route.ts`
  — copy of the `.../interest/route.ts` handler, calling `launchCallToAction`.
- **RTK Query** — new `launchCallToAction` mutation in `callToActionApi.ts`, modeled on
  `toggleCallToActionInterest`:
  ```ts
  launchCallToAction: builder.mutation<CallToAction, { guildId: string; ctaId: string }>({
    query: ({ guildId, ctaId }) => ({
      url: `guilds/${guildId}/call-to-actions/${ctaId}/launch`,
      method: 'POST',
    }),
    invalidatesTags: () => ['Event'],
    async onQueryStarted({ guildId }, { dispatch, queryFulfilled }) {
      try {
        const { data: updated } = await queryFulfilled;
        dispatch(replaceInList(guildId, updated));
      } catch { /* surfaced via toast in the board */ }
    },
  }),
  ```
  Export `useLaunchCallToActionMutation`.

## UI

- **`CallToActionCard`** — new props `onLaunch?: (ctaId: string) => void` and
  `isLaunching?: boolean`. In the footer's `!launched && !expired` branch, for
  `cta.canManage`, render a "Create event now" button (`variant="primary"`) next to the
  existing "I'm in" button. Clicking opens a local `ConfirmModal`
  ("Create event with {count} participants?", count = `cta.interestedCount`); on confirm,
  call `onLaunch(cta.id)`. Confirm state is local to the card.
- **`CallToActionBoard`** — `useLaunchCallToActionMutation`, a `launchingId` state, a
  `handleLaunch` (modeled on `handleToggle`: success toast `launchedToast`, error toast
  `launchError`), wiring `onLaunch`/`isLaunching` into the card.

## i18n

New keys in the `CallToAction` namespace (all locales): `launchNowButton`,
`launchConfirmTitle`, `launchConfirmBody` (with `{count}`), `launchConfirmConfirm`,
`launchError`. Reuse the existing `launchedToast`.

## Tests

- `route.test.ts` for the launch endpoint (modeled on the interest route test).
- Update `CallToActionCard.test.tsx`: button visible for `canManage`, hidden otherwise;
  click → confirm → `onLaunch` called.
- RPC SQL logic is verified manually (the project has no unit tests over SQL functions).

## Out of scope

- Changing how users join the event after launch (existing event-detail flow).
- Any change to auto-launch threshold behavior.
