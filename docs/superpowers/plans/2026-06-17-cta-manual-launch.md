# CTA Manual Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a CTA author (and guild ADMIN/OWNER) manually launch the calendar event from a `/looking-for-group` card at any time, before the `target_count` threshold is reached.

**Architecture:** A new permission-gated RPC `launch_call_to_action` reuses the same event-creation logic as auto-launch (extracted into a shared `_do_launch_cta` helper). The transport mirrors the existing interest flow: route handler → entity data fn → RTK Query mutation. The card gains a "Create event now" button (for `canManage`) guarded by a `ConfirmModal`.

**Tech Stack:** Supabase Postgres (plpgsql, RLS, SECURITY DEFINER RPCs), Next.js 16 App Router route handlers, RTK Query, React 19, CSS Modules, next-intl, Vitest + Testing Library.

## Global Constraints

- FSD layers and import direction enforced; cross-slice same-layer imports forbidden; import slices only via `index.ts`.
- Data fetching only via RTK Query `injectEndpoints` on `baseApi`; Supabase calls live in the data layer / route handlers, never in client components.
- No `createAsyncThunk` for data fetching.
- CSS Modules only — **no inline styles**.
- TypeScript strict; `React.SubmitEvent` (not `FormEvent`) for submit handlers.
- Route dynamic segment for guild is `[id]` (resolved as `params.id`), not `[guildId]`.
- Supabase migrations: apply DDL via Supabase MCP (`apply_migration`), then hand-edit `src/shared/api/supabase/types.ts`. No CLI.
- New client-facing i18n keys go in **both** `messages/en.json` and `messages/ru.json` under the `CallToAction` namespace.
- Baseline `tsc` (3 pre-existing errors) and `lint:fsd` (2 insignificant-slice) failures on master are known — ignore them; do not "fix" unrelated ones.
- After code changes, run `graphify update .`.

---

## File Structure

- **DB (Supabase, via MCP migration):** new `_do_launch_cta(uuid)`, refactored `_maybe_launch_cta(uuid)`, new `launch_call_to_action(uuid)`.
- `src/shared/api/supabase/types.ts` — add `launch_call_to_action` to `Functions`.
- `src/entities/call-to-action/api/launchCallToAction.ts` — **create**, entity data fn.
- `src/entities/call-to-action/api/callToActionApi.ts` — **modify**, add `launchCallToAction` mutation + hook export.
- `src/app/api/guilds/[id]/call-to-actions/[ctaId]/launch/route.ts` — **create**, POST handler.
- `src/app/api/guilds/[id]/call-to-actions/[ctaId]/launch/route.test.ts` — **create**.
- `messages/en.json`, `messages/ru.json` — **modify**, new `CallToAction` keys.
- `src/features/call-to-action/ui/CallToActionCard.tsx` — **modify**, launch button + ConfirmModal.
- `src/features/call-to-action/ui/CallToActionCard.test.tsx` — **modify**, button tests.
- `src/widgets/call-to-action-board/ui/CallToActionBoard.tsx` — **modify**, wire launch mutation.

---

## Task 1: Database — extract `_do_launch_cta`, add `launch_call_to_action`

**Files:**
- DB migration via `mcp__supabase__apply_migration` (project `uzmyvxpjsfobqkcepygh`, name `cta_manual_launch`).
- Modify: `src/shared/api/supabase/types.ts` (the `Functions` block, near `toggle_call_to_action_interest` ~L985).

**Interfaces:**
- Produces SQL RPC `launch_call_to_action(p_cta_id uuid) returns uuid` (the launched event's id), callable by `authenticated`.
- Produces TS type `Database['public']['Functions']['launch_call_to_action'] = { Args: { p_cta_id: string }; Returns: string }`.

- [ ] **Step 1: Apply the migration**

Use `mcp__supabase__apply_migration` with name `cta_manual_launch` and this SQL (it refactors the existing launch logic — body copied verbatim from current `_maybe_launch_cta` into `_do_launch_cta`):

```sql
-- Shared launch body: create the event, copy interested users, stamp the CTA.
create or replace function public._do_launch_cta(p_cta_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare c record; v_event_id uuid;
begin
  select * into c from call_to_actions where id = p_cta_id for update;
  if c.id is null then return; end if;
  if c.event_id is not null then return; end if;
  insert into events (guild_id, title, description, type, event_date, created_by, week_days)
    values (c.guild_id, c.title, c.description, c.type, c.event_date, c.created_by, '{}')
    returning id into v_event_id;
  insert into event_participants (event_id, user_id, status)
    select v_event_id, user_id, 'confirmed' from call_to_action_interests where cta_id = p_cta_id;
  update call_to_actions set event_id = v_event_id, launched_at = now(), updated_at = now()
    where id = p_cta_id;
end; $function$;

revoke execute on function public._do_launch_cta(uuid) from anon, authenticated;

-- Auto-launch keeps only the threshold gate, then delegates.
create or replace function public._maybe_launch_cta(p_cta_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare c record; v_count int;
begin
  select * into c from call_to_actions where id = p_cta_id;
  if c.id is null then return; end if;
  if c.event_id is not null then return; end if;
  select count(*) into v_count from call_to_action_interests where cta_id = p_cta_id;
  if v_count < c.target_count then return; end if;
  perform _do_launch_cta(p_cta_id);
end; $function$;

-- Manual launch: permission-gated, no threshold.
create or replace function public.launch_call_to_action(p_cta_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare c record;
begin
  select * into c from call_to_actions where id = p_cta_id;
  if c.id is null then raise exception 'Call to action not found'; end if;
  if not (c.created_by = auth.uid()
          or has_guild_role(c.guild_id, array['ADMIN','OWNER'])) then
    raise exception 'Not authorized to launch this call to action';
  end if;
  if c.event_id is not null then raise exception 'Call to action already launched'; end if;
  if c.event_date < now() then raise exception 'Call to action has expired'; end if;
  perform _do_launch_cta(p_cta_id);
  return (select event_id from call_to_actions where id = p_cta_id);
end; $function$;

revoke execute on function public.launch_call_to_action(uuid) from anon;
grant execute on function public.launch_call_to_action(uuid) to authenticated;
```

- [ ] **Step 2: Verify the functions exist and auto-launch still works**

Run (via `mcp__supabase__execute_sql`):

```sql
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('_do_launch_cta','_maybe_launch_cta','launch_call_to_action')
order by proname;
```

Expected: three rows — `_do_launch_cta`, `_maybe_launch_cta`, `launch_call_to_action`.

- [ ] **Step 3: Add the RPC to generated types**

In `src/shared/api/supabase/types.ts`, inside `Functions`, immediately after the `toggle_call_to_action_interest` entry, add:

```ts
      launch_call_to_action: {
        Args: { p_cta_id: string }
        Returns: string
      }
```

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no **new** errors beyond the 3 known baseline errors.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/supabase/types.ts
git commit -m "feat(db): add launch_call_to_action RPC and _do_launch_cta helper"
```

---

## Task 2: Entity data fn `launchCallToAction`

**Files:**
- Create: `src/entities/call-to-action/api/launchCallToAction.ts`
- Modify: `src/entities/call-to-action/index.ts` (only if it re-exports api fns — check first; the API hook is exported from `callToActionApi`, so a fn re-export is likely NOT needed. Skip if absent.)

**Interfaces:**
- Consumes: `launch_call_to_action` RPC (Task 1), `getCallToActionById` from `./getCallToActions`, `createClient` from `@/shared/api/supabase/server`.
- Produces: `launchCallToAction(ctaId: string): Promise<CallToAction>`.

- [ ] **Step 1: Create the data fn**

Create `src/entities/call-to-action/api/launchCallToAction.ts` (mirrors `toggleInterest.ts`):

```ts
import { createClient } from '@/shared/api/supabase/server';
import type { CallToAction } from '../model/types';
import { getCallToActionById } from './getCallToActions';

export const launchCallToAction = async (ctaId: string): Promise<CallToAction> => {
  const supabase = await createClient();
  const { error } = await supabase.rpc('launch_call_to_action', { p_cta_id: ctaId });
  if (error) throw error;
  return getCallToActionById(ctaId);
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/entities/call-to-action/api/launchCallToAction.ts
git commit -m "feat(cta): add launchCallToAction entity data fn"
```

---

## Task 3: Route handler `POST /api/guilds/[id]/call-to-actions/[ctaId]/launch`

**Files:**
- Create: `src/app/api/guilds/[id]/call-to-actions/[ctaId]/launch/route.ts`
- Test: `src/app/api/guilds/[id]/call-to-actions/[ctaId]/launch/route.test.ts`

**Interfaces:**
- Consumes: `launchCallToAction` (Task 2), `requireUser` from `@/shared/api/guildAuth`.
- Produces: route `POST` returning the updated `CallToAction` JSON (200) or 500.

- [ ] **Step 1: Write the failing test**

Create `.../launch/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { launchCallToAction } from '@/entities/call-to-action/api/launchCallToAction';
import { requireUser } from '@/shared/api/guildAuth';

vi.mock('@/entities/call-to-action/api/launchCallToAction');
vi.mock('@/shared/api/guildAuth');
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: 'u1' } } as never);
});

const params = (id: string, ctaId: string) => ({ params: Promise.resolve({ id, ctaId }) });

describe('POST /api/guilds/[id]/call-to-actions/[ctaId]/launch', () => {
  it('launches the CTA and returns 200', async () => {
    vi.mocked(launchCallToAction).mockResolvedValue({ id: 'c1', eventId: 'e9' } as never);
    const res = await POST({} as never, params('g1', 'c1'));
    expect(res.status).toBe(200);
    expect(launchCallToAction).toHaveBeenCalledWith('c1');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) } as never);
    const res = await POST({} as never, params('g1', 'c1'));
    expect(res.status).toBe(401);
    expect(launchCallToAction).not.toHaveBeenCalled();
  });

  it('returns 500 on failure', async () => {
    vi.mocked(launchCallToAction).mockRejectedValue(new Error('nope'));
    expect((await POST({} as never, params('g1', 'c1'))).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/app/api/guilds/\[id\]/call-to-actions/\[ctaId\]/launch/route.test.ts`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 3: Write the route handler**

Create `.../launch/route.ts` (mirrors `interest/route.ts`):

```ts
import { NextRequest, NextResponse } from 'next/server';
import { launchCallToAction } from '@/entities/call-to-action/api/launchCallToAction';
import { requireUser } from '@/shared/api/guildAuth';

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; ctaId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { ctaId } = await params;
    const cta = await launchCallToAction(ctaId);
    return NextResponse.json(cta);
  } catch {
    return NextResponse.json({ error: 'Failed to launch call to action' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run src/app/api/guilds/\[id\]/call-to-actions/\[ctaId\]/launch/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/guilds/[id]/call-to-actions/[ctaId]/launch/"
git commit -m "feat(cta): add launch route handler"
```

---

## Task 4: RTK Query mutation + launched toast i18n key

**Files:**
- Modify: `src/entities/call-to-action/api/callToActionApi.ts`
- Modify: `messages/en.json`, `messages/ru.json` (`CallToAction` namespace)

**Interfaces:**
- Consumes: route `POST .../launch` (Task 3), existing `replaceInList` helper, `CallToAction` type.
- Produces: hook `useLaunchCallToActionMutation`; mutation arg `{ guildId: string; ctaId: string }`.

- [ ] **Step 1: Add the mutation**

In `src/entities/call-to-action/api/callToActionApi.ts`, inside `endpoints`, after `toggleCallToActionInterest` (before `deleteCallToAction`), add:

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
        } catch {
          /* surfaced via toast in the board */
        }
      },
    }),
```

- [ ] **Step 2: Export the hook**

In the same file's `export const { ... } = callToActionApi;` block, add `useLaunchCallToActionMutation,` after `useToggleCallToActionInterestMutation,`.

- [ ] **Step 3: Add i18n keys**

In `messages/en.json` under `CallToAction`, add:

```json
    "launchNowButton": "Create event now",
    "launchConfirmTitle": "Create event now?",
    "launchConfirmBody": "An event will be created with {count} participant(s). This can't be undone.",
    "launchConfirmConfirm": "Create event",
    "manualLaunchedToast": "Event created in the calendar!",
    "launchError": "Failed to create the event",
```

In `messages/ru.json` under `CallToAction`, add:

```json
    "launchNowButton": "Создать ивент сейчас",
    "launchConfirmTitle": "Создать ивент сейчас?",
    "launchConfirmBody": "Будет создан ивент с участниками: {count}. Это действие необратимо.",
    "launchConfirmConfirm": "Создать ивент",
    "manualLaunchedToast": "Ивент добавлен в календарь!",
    "launchError": "Не удалось создать ивент",
```

- [ ] **Step 4: Typecheck + run the CTA api tests**

Run: `pnpm tsc --noEmit && pnpm test:run src/entities/call-to-action`
Expected: no new tsc errors; existing CTA tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/entities/call-to-action/api/callToActionApi.ts messages/en.json messages/ru.json
git commit -m "feat(cta): add launchCallToAction RTK mutation and i18n keys"
```

---

## Task 5: `CallToActionCard` — launch button + confirm dialog

**Files:**
- Modify: `src/features/call-to-action/ui/CallToActionCard.tsx`
- Test: `src/features/call-to-action/ui/CallToActionCard.test.tsx`

**Interfaces:**
- Consumes: `ConfirmModal` from `@/shared/ui/ConfirmModal`, `cta.canManage`, `cta.interestedCount`.
- Produces: new optional props `onLaunch?: (ctaId: string) => void` and `isLaunching?: boolean` on `CallToActionCardProps`.

- [ ] **Step 1: Write the failing tests**

Append to `CallToActionCard.test.tsx` (inside the `describe`). Note the existing file mocks `Tooltip` and `ProfileLink`; add a `ConfirmModal` mock at the top-level mocks (after the `Tooltip` mock):

```ts
vi.mock('@/shared/ui/ConfirmModal', () => ({
  ConfirmModal: ({ isOpen, onConfirm, title }: { isOpen: boolean; onConfirm: () => void; title: string }) =>
    isOpen ? <button onClick={onConfirm}>{title}</button> : null,
}));
```

New tests:

```ts
  it('shows the launch button for canManage and launches after confirm', () => {
    const onLaunch = vi.fn();
    render(
      <CallToActionCard
        cta={{ ...base, canManage: true }}
        onToggleInterest={vi.fn()}
        onLaunch={onLaunch}
      />,
    );
    fireEvent.click(screen.getByText('launchNowButton'));
    fireEvent.click(screen.getByText('launchConfirmTitle')); // mocked ConfirmModal confirm
    expect(onLaunch).toHaveBeenCalledWith('c1');
  });

  it('does not show the launch button when canManage is false', () => {
    render(<CallToActionCard cta={base} onToggleInterest={vi.fn()} onLaunch={vi.fn()} />);
    expect(screen.queryByText('launchNowButton')).not.toBeInTheDocument();
  });

  it('hides the launch button when launched', () => {
    render(
      <CallToActionCard
        cta={{ ...base, canManage: true, eventId: 'e9', launchedAt: '2026-06-17T00:00:00.000Z' }}
        onToggleInterest={vi.fn()}
        onLaunch={vi.fn()}
      />,
    );
    expect(screen.queryByText('launchNowButton')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/features/call-to-action/ui/CallToActionCard.test.tsx`
Expected: FAIL — `launchNowButton` not found.

- [ ] **Step 3: Implement the button + ConfirmModal**

In `CallToActionCard.tsx`:

a) Add imports near the other shared-ui imports:

```ts
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
```

b) Extend the props interface:

```ts
interface CallToActionCardProps {
  cta: CallToAction;
  onToggleInterest: (ctaId: string) => void;
  onDelete?: (ctaId: string) => void;
  onLaunch?: (ctaId: string) => void;
  isToggling?: boolean;
  isLaunching?: boolean;
}
```

c) Destructure the new props in the component signature:

```tsx
export const CallToActionCard: React.FC<CallToActionCardProps> = ({
  cta,
  onToggleInterest,
  onDelete,
  onLaunch,
  isToggling,
  isLaunching,
}) => {
```

d) Add confirm-dialog state near the existing `useState(0)` tick state:

```tsx
  const [confirmLaunch, setConfirmLaunch] = useState(false);
```

e) In the footer, the current `!launched && !expired` branch renders only the want `<Button>`. Wrap it so the launch button shows for managers. Replace:

```tsx
        ) : (
          !expired && (
            <Button
              type="button"
              variant={cta.interested ? 'secondary' : 'primary'}
              onClick={() => onToggleInterest(cta.id)}
              isLoading={isToggling}
              className={styles.wantButton}
            >
              {cta.interested ? (
                <>
                  <CheckCircle2 size={16} />
                  {t('wantedButton')}
                </>
              ) : (
                t('wantButton')
              )}
            </Button>
          )
        )}
```

with:

```tsx
        ) : (
          !expired && (
            <div className={styles.footActions}>
              <Button
                type="button"
                variant={cta.interested ? 'secondary' : 'primary'}
                onClick={() => onToggleInterest(cta.id)}
                isLoading={isToggling}
                className={styles.wantButton}
              >
                {cta.interested ? (
                  <>
                    <CheckCircle2 size={16} />
                    {t('wantedButton')}
                  </>
                ) : (
                  t('wantButton')
                )}
              </Button>
              {onLaunch && cta.canManage && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setConfirmLaunch(true)}
                  isLoading={isLaunching}
                  className={styles.launchButton}
                >
                  <CalendarCheck size={16} />
                  {t('launchNowButton')}
                </Button>
              )}
            </div>
          )
        )}
```

f) Render the ConfirmModal just before the closing `</article>`:

```tsx
      {onLaunch && cta.canManage && (
        <ConfirmModal
          isOpen={confirmLaunch}
          onClose={() => setConfirmLaunch(false)}
          onConfirm={() => onLaunch(cta.id)}
          title={t('launchConfirmTitle')}
          description={t('launchConfirmBody', { count: cta.interestedCount })}
          confirmLabel={t('launchConfirmConfirm')}
          variant="primary"
          isLoading={isLaunching}
        />
      )}
```

(`CalendarCheck` is already imported in this file.)

- [ ] **Step 4: Add the layout styles**

In `CallToActionCard.module.css`, add (match existing footer spacing conventions — use a gap variable consistent with the file; if none, use `0.5rem`):

```css
.footActions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
```

(No `launchButton`-specific rule needed unless visual tuning is wanted; `wantButton` styles already cover sizing. Add `.launchButton {}` only if a manager-specific style emerges — otherwise omit.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:run src/features/call-to-action/ui/CallToActionCard.test.tsx`
Expected: PASS (all old + 3 new tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/call-to-action/ui/CallToActionCard.tsx src/features/call-to-action/ui/CallToActionCard.test.tsx src/features/call-to-action/ui/CallToActionCard.module.css
git commit -m "feat(cta): add manual launch button with confirm dialog to card"
```

---

## Task 6: Wire launch into `CallToActionBoard`

**Files:**
- Modify: `src/widgets/call-to-action-board/ui/CallToActionBoard.tsx`

**Interfaces:**
- Consumes: `useLaunchCallToActionMutation` (Task 4), `CallToActionCard` `onLaunch`/`isLaunching` props (Task 5).

- [ ] **Step 1: Import the hook**

In the `@/entities/call-to-action` import block, add `useLaunchCallToActionMutation,` to the named imports.

- [ ] **Step 2: Add state, mutation, and handler**

After the existing `const [deleteCallToAction] = useDeleteCallToActionMutation();` line add:

```tsx
  const [launchCallToAction] = useLaunchCallToActionMutation();
```

After the `togglingId` state add:

```tsx
  const [launchingId, setLaunchingId] = useState<string | null>(null);
```

After `handleDelete` add:

```tsx
  const handleLaunch = async (ctaId: string) => {
    if (!activeGuildId) return;
    setLaunchingId(ctaId);
    try {
      await launchCallToAction({ guildId: activeGuildId, ctaId }).unwrap();
      toast.success(t('manualLaunchedToast'));
    } catch {
      toast.error(t('launchError'));
    } finally {
      setLaunchingId(null);
    }
  };
```

- [ ] **Step 3: Pass the props to the card**

In the `<CallToActionCard ... />` JSX, add:

```tsx
              onLaunch={handleLaunch}
              isLaunching={launchingId === cta.id}
```

- [ ] **Step 4: Run board tests + typecheck**

Run: `pnpm tsc --noEmit && pnpm test:run src/widgets/call-to-action-board`
Expected: no new tsc errors; existing board tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/call-to-action-board/ui/CallToActionBoard.tsx
git commit -m "feat(cta): wire manual launch into call-to-action board"
```

---

## Task 7: Full verification

- [ ] **Step 1: Lint, typecheck, full test run**

Run: `pnpm lint && pnpm tsc --noEmit && pnpm test:run`
Expected: lint clean; only the 3 known baseline tsc errors; all tests pass.

- [ ] **Step 2: Update the knowledge graph**

Run: `graphify update .`

- [ ] **Step 3: Update project docs**

In `src/CLAUDE.md`, in the "Call to Action RPCs" list, add a bullet for `launch_call_to_action(p_cta_id) → uuid` (author/ADMIN/OWNER gated; raises if already launched or expired; delegates to `_do_launch_cta`) and note that `_maybe_launch_cta`/manual launch now share `_do_launch_cta`. Commit:

```bash
git add src/CLAUDE.md
git commit -m "docs: document launch_call_to_action RPC"
```

---

## Self-Review Notes

- **Spec coverage:** DB refactor + RPC (Task 1) ✓; entity fn (Task 2) ✓; route handler + test (Task 3) ✓; RTK mutation (Task 4) ✓; UI button + ConfirmModal (Task 5) ✓; board wiring (Task 6) ✓; i18n keys (Task 4) ✓; tests (Tasks 3, 5) ✓. Spec said reuse `launchedToast`, but its copy ("Target reached…") is inaccurate for manual launch — plan introduces `manualLaunchedToast` instead. Intentional deviation.
- **Route segment:** uses `[id]` (not `[guildId]`) per the actual filesystem; handler reads `ctaId` only.
- **Permission parity:** RPC gate (author or ADMIN/OWNER) mirrors `cta.canManage` used to show the button; RLS + the RPC's explicit check are the real enforcement.
