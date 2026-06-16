# Call to Action — Participant Slots — Design Spec

Date: 2026-06-16
Status: Approved

## Summary

Show who has confirmed participation on a Call to Action card: a row of circular
slots equal to the target participant count. Each joined participant fills a slot
with their avatar; remaining slots are empty circles. Hovering an avatar shows a
tooltip with the participant's name + icon; clicking opens their profile. The row
is capped at 15 slots; when more than 15 participants join, the first 15 avatars
are shown plus an overflow chip whose tooltip lists the hidden participants.

## Decisions (from brainstorming)

1. **Placement:** a dedicated row between the description and the footer. The
   footer keeps event date/time, `N / target`, and the action button.
2. **Cap:** at most 15 slots, always. Empty slots beyond 15 are not drawn. When
   participants > 15: show 15 avatars + an overflow chip (tooltip lists the rest).

## Data

`CallToAction` gains `participants: CtaParticipant[]` — the confirmed users,
ordered by join time:

```ts
interface CtaParticipant {
  userId: string;
  publicId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  alias: string | null;
  displayAsAlias: boolean;
  icon: string | null;
}
```

`mapCallToActionRow`:
- `CTA_SELECT` interest embed becomes
  `call_to_action_interests(user_id, created_at, profiles(public_id, full_name, avatar_url, alias, display_as_alias, icon))`.
- Build `participants` sorted by `created_at` ascending (join order).
- `interestedCount = participants.length`; `interested = participants.some(p => p.userId === currentUserId)`.

The `call_to_action_interests.user_id → profiles` FK already exists, so the
profile embed resolves. RLS already lets guild members select interests.

## Component: `ParticipantSlots` (`features/call-to-action/ui/`)

Props: `{ participants: CtaParticipant[]; targetCount: number }`.

Rendering rules:
- `cap = 15`.
- If `participants.length <= cap`:
  - `slots = min(targetCount, cap)`.
  - Render one avatar per participant (in order), then empty circles up to `slots`
    (so at least `participants.length` avatars even if `targetCount < length`,
    which cannot normally happen but is handled by `max`).
- If `participants.length > cap`:
  - Render the first `cap` (15) avatars + one overflow chip. No empty circles.

Pieces:
- **Avatar slot:** `UserAvatar size="sm"` wrapped in `ProfileLink` (→
  `/profile/[publicId]`), wrapped in `Tooltip` whose content is `NameWithIcon`
  (display name via `resolveDisplayName` + icon).
- **Empty slot:** a bordered empty circle (same size).
- **Overflow chip:** a circle with a `Users` icon and `+N` (N = `length - 15`),
  wrapped in a `Tooltip` whose content is a vertical list of `NameWithIcon` for
  participants from index 15 onward.

Avatars overlap slightly (negative margin) like a typical stacked avatar group;
empty circles use the same footprint.

## Card Integration

`CallToActionCard` renders `<ParticipantSlots participants={cta.participants}
targetCount={cta.targetCount} />` between the description and the footer.

## FSD

`ParticipantSlots` lives in `features/call-to-action/ui`, using `shared/ui`
(`UserAvatar`, `ProfileLink`, `Tooltip`, `NameWithIcon`), `entities/user`
(`resolveDisplayName`), and the `CtaParticipant` type from
`entities/call-to-action`. Feature → entity/shared only — no violations.

## Testing

Unit tests for `ParticipantSlots`:
- empty slots count = `targetCount - participants.length` (no overflow case).
- one avatar rendered per participant.
- with > 15 participants: exactly 15 avatars + an overflow chip; no empty slots.
- `targetCount` capped at 15 empty slots when no participants.

## Out of Scope

- Removing a participant from the card.
- Showing participants for a launched CTA differently (same display).
