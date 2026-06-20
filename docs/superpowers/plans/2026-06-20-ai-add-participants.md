# AI Helper Add-Participants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two AI-helper tools (`findMembers`, `addParticipants`) so the assistant can add guild members to an existing event from the chat modal.

**Architecture:** Follow the existing AI-helper tool pattern — each tool is a `*Tool.ts` OpenAI function schema plus an `execute*.ts` server executor that calls existing `entities/*` data functions. `route.ts` wires schemas into the `tools` array and dispatches in `handleToolCall`. Add-participants is union-only and gated to OWNER/ADMIN.

**Tech Stack:** Next.js route handler, OpenAI SDK (DeepSeek), RTK Query, Vitest.

## Global Constraints

- Permission gate for `addParticipants`: only OWNER/ADMIN (`canManageEvents` in `route.ts`), same as `createEvent`/`editEvent`. `findMembers` is read-only, no gate.
- Add-only semantics: union new ids with current participants, never remove. New non-creator participants get status `pending` (via existing `syncParticipants`).
- Only real ACCEPTED guild members may be added; filter out anything else.
- No new user-facing translated strings; do not touch `requiredNamespaces`.
- STRICT SCOPE: only files listed below.

---

### Task 1: `findMembers` tool

**Files:**
- Create: `src/app/api/ai-helper/tools/findMembersTool.ts`
- Create: `src/app/api/ai-helper/tools/executeFindMembers.ts`
- Test: `src/app/api/ai-helper/tools/executeFindMembers.test.ts`

**Interfaces:**
- Consumes: `getGuildMembers(guildId)` from `@/entities/guild/api/getGuildMembers` returning `{ userId, role, profile: { publicId, fullName, avatarUrl, alias, displayAsAlias, icon, about } }[]`.
- Produces: `executeFindMembers(args: FindMembersArgs, guildId: string): Promise<{ members: { userId: string; name: string; alias: string | null }[]; error?: string }>`; `interface FindMembersArgs { keyword?: string }`; `findMembersTool` (`ChatCompletionTool`, function name `findMembers`).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeFindMembers } from './executeFindMembers';
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';

vi.mock('@/entities/guild/api/getGuildMembers');

const member = (over: Partial<{ userId: string; fullName: string | null; alias: string | null; displayAsAlias: boolean }>) => ({
  userId: over.userId ?? 'u1',
  role: 'MEMBER' as const,
  profile: {
    publicId: 'p1',
    fullName: over.fullName ?? 'Alice Smith',
    avatarUrl: null,
    alias: over.alias ?? null,
    displayAsAlias: over.displayAsAlias ?? false,
    icon: null,
    about: null,
  },
});

describe('executeFindMembers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all members with derived display name when no keyword', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue([
      member({ userId: 'u1', fullName: 'Alice Smith' }),
      member({ userId: 'u2', fullName: 'Bob Jones', alias: 'bobby' }),
    ] as never);
    const result = await executeFindMembers({}, 'g1');
    expect(result).toEqual({
      members: [
        { userId: 'u1', name: 'Alice Smith', alias: null },
        { userId: 'u2', name: 'Bob Jones', alias: 'bobby' },
      ],
    });
  });

  it('prefers alias when displayAsAlias is true', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue([
      member({ userId: 'u2', fullName: 'Bob Jones', alias: 'bobby', displayAsAlias: true }),
    ] as never);
    const result = await executeFindMembers({}, 'g1');
    expect(result.members[0]).toEqual({ userId: 'u2', name: 'bobby', alias: 'bobby' });
  });

  it('filters by keyword over name and alias, case-insensitive', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue([
      member({ userId: 'u1', fullName: 'Alice Smith' }),
      member({ userId: 'u2', fullName: 'Bob Jones', alias: 'dragonborn' }),
    ] as never);
    const byName = await executeFindMembers({ keyword: 'alice' }, 'g1');
    expect(byName.members.map((m) => m.userId)).toEqual(['u1']);
    const byAlias = await executeFindMembers({ keyword: 'DRAGON' }, 'g1');
    expect(byAlias.members.map((m) => m.userId)).toEqual(['u2']);
  });

  it('returns empty members with error on failure', async () => {
    vi.mocked(getGuildMembers).mockRejectedValue(new Error('db error'));
    const result = await executeFindMembers({}, 'g1');
    expect(result).toEqual({ members: [], error: 'db error' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/app/api/ai-helper/tools/executeFindMembers.test.ts`
Expected: FAIL — cannot find module `./executeFindMembers`.

- [ ] **Step 3: Write the executor**

`src/app/api/ai-helper/tools/executeFindMembers.ts`:

```typescript
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';

export interface FindMembersArgs {
  keyword?: string;
}

interface FoundMember {
  userId: string;
  name: string;
  alias: string | null;
}

export const executeFindMembers = async (
  args: FindMembersArgs,
  guildId: string,
): Promise<{ members: FoundMember[]; error?: string }> => {
  try {
    const members = await getGuildMembers(guildId);

    const mapped: FoundMember[] = members.map((m) => {
      const { fullName, alias, displayAsAlias } = m.profile;
      const name = (displayAsAlias && alias ? alias : fullName ?? alias) ?? 'Unknown';
      return { userId: m.userId, name, alias };
    });

    const keyword = args.keyword?.toLowerCase().trim();
    if (!keyword) return { members: mapped };

    const filtered = mapped.filter((m) =>
      m.name.toLowerCase().includes(keyword) ||
      (m.alias?.toLowerCase().includes(keyword) ?? false),
    );
    return { members: filtered };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { members: [], error: message };
  }
};
```

- [ ] **Step 4: Write the tool schema**

`src/app/api/ai-helper/tools/findMembersTool.ts`:

```typescript
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const findMembersTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'findMembers',
    description:
      'Search guild members by name or alias. Use to resolve people mentioned by the user to their userId before adding them to an event. Returns userId, display name, and alias.',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Case-insensitive substring to match against member name or alias. Omit to list all members.',
        },
      },
      required: [],
    },
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:run src/app/api/ai-helper/tools/executeFindMembers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ai-helper/tools/findMembersTool.ts src/app/api/ai-helper/tools/executeFindMembers.ts src/app/api/ai-helper/tools/executeFindMembers.test.ts
git commit -m "feat(ai-helper): add findMembers tool"
```

---

### Task 2: `addParticipants` tool

**Files:**
- Create: `src/app/api/ai-helper/tools/addParticipantsTool.ts`
- Create: `src/app/api/ai-helper/tools/executeAddParticipants.ts`
- Test: `src/app/api/ai-helper/tools/executeAddParticipants.test.ts`

**Interfaces:**
- Consumes: `getGuildMembers(guildId)`; `getEventParticipantUserIds(eventId)` from `@/entities/event/api/getEventParticipantUserIds` → `Promise<string[]>`; `syncParticipants(eventId, userIds)` from `@/entities/event/api/syncParticipants` → `Promise<void>`.
- Produces: `executeAddParticipants(args: AddParticipantsArgs, guildId: string): Promise<{ success: boolean; eventId?: string; addedCount?: number; error?: string }>`; `interface AddParticipantsArgs { eventId: string; userIds: string[] }`; `addParticipantsTool` (`ChatCompletionTool`, function name `addParticipants`).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeAddParticipants } from './executeAddParticipants';
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';
import { getEventParticipantUserIds } from '@/entities/event/api/getEventParticipantUserIds';
import { syncParticipants } from '@/entities/event/api/syncParticipants';

vi.mock('@/entities/guild/api/getGuildMembers');
vi.mock('@/entities/event/api/getEventParticipantUserIds');
vi.mock('@/entities/event/api/syncParticipants');

const members = (ids: string[]) =>
  ids.map((id) => ({
    userId: id,
    role: 'MEMBER' as const,
    profile: { publicId: null, fullName: id, avatarUrl: null, alias: null, displayAsAlias: false, icon: null, about: null },
  }));

describe('executeAddParticipants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unions new members with existing participants and syncs', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue(members(['u1', 'u2', 'u3']) as never);
    vi.mocked(getEventParticipantUserIds).mockResolvedValue(['u1']);
    vi.mocked(syncParticipants).mockResolvedValue(undefined);

    const result = await executeAddParticipants({ eventId: 'e1', userIds: ['u2', 'u3'] }, 'g1');

    expect(syncParticipants).toHaveBeenCalledWith('e1', ['u1', 'u2', 'u3']);
    expect(result).toEqual({ success: true, eventId: 'e1', addedCount: 2 });
  });

  it('ignores ids that are not guild members', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue(members(['u1', 'u2']) as never);
    vi.mocked(getEventParticipantUserIds).mockResolvedValue([]);
    vi.mocked(syncParticipants).mockResolvedValue(undefined);

    const result = await executeAddParticipants({ eventId: 'e1', userIds: ['u2', 'stranger'] }, 'g1');

    expect(syncParticipants).toHaveBeenCalledWith('e1', ['u2']);
    expect(result).toEqual({ success: true, eventId: 'e1', addedCount: 1 });
  });

  it('does not count already-present members as added', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue(members(['u1', 'u2']) as never);
    vi.mocked(getEventParticipantUserIds).mockResolvedValue(['u1', 'u2']);
    vi.mocked(syncParticipants).mockResolvedValue(undefined);

    const result = await executeAddParticipants({ eventId: 'e1', userIds: ['u2'] }, 'g1');

    expect(result).toEqual({ success: true, eventId: 'e1', addedCount: 0 });
  });

  it('errors when userIds is empty', async () => {
    const result = await executeAddParticipants({ eventId: 'e1', userIds: [] }, 'g1');
    expect(result.success).toBe(false);
    expect(syncParticipants).not.toHaveBeenCalled();
  });

  it('errors when no requested id is a guild member', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue(members(['u1']) as never);
    const result = await executeAddParticipants({ eventId: 'e1', userIds: ['stranger'] }, 'g1');
    expect(result.success).toBe(false);
    expect(syncParticipants).not.toHaveBeenCalled();
  });

  it('returns error on failure', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue(members(['u1']) as never);
    vi.mocked(getEventParticipantUserIds).mockRejectedValue(new Error('db error'));
    const result = await executeAddParticipants({ eventId: 'e1', userIds: ['u1'] }, 'g1');
    expect(result).toEqual({ success: false, error: 'db error' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run src/app/api/ai-helper/tools/executeAddParticipants.test.ts`
Expected: FAIL — cannot find module `./executeAddParticipants`.

- [ ] **Step 3: Write the executor**

`src/app/api/ai-helper/tools/executeAddParticipants.ts`:

```typescript
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';
import { getEventParticipantUserIds } from '@/entities/event/api/getEventParticipantUserIds';
import { syncParticipants } from '@/entities/event/api/syncParticipants';

export interface AddParticipantsArgs {
  eventId: string;
  userIds: string[];
}

export const executeAddParticipants = async (
  args: AddParticipantsArgs,
  guildId: string,
): Promise<{ success: boolean; eventId?: string; addedCount?: number; error?: string }> => {
  if (!Array.isArray(args.userIds) || args.userIds.length === 0) {
    return { success: false, error: 'No userIds provided' };
  }
  try {
    const members = await getGuildMembers(guildId);
    const memberIds = new Set(members.map((m) => m.userId));
    const validIds = [...new Set(args.userIds)].filter((id) => memberIds.has(id));
    if (validIds.length === 0) {
      return { success: false, error: 'No valid guild members in the provided list' };
    }

    const current = await getEventParticipantUserIds(args.eventId);
    const currentSet = new Set(current);
    const addedCount = validIds.filter((id) => !currentSet.has(id)).length;
    const union = [...new Set([...current, ...validIds])];

    await syncParticipants(args.eventId, union);
    return { success: true, eventId: args.eventId, addedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
};
```

- [ ] **Step 4: Write the tool schema**

`src/app/api/ai-helper/tools/addParticipantsTool.ts`:

```typescript
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const addParticipantsTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'addParticipants',
    description:
      'Adds guild members to an existing event as participants. Obtain eventId via findEvents and userIds via findMembers. This only adds people — it never removes existing participants.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The id of the event to add participants to. Obtain it via findEvents.',
        },
        userIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'User ids of guild members to add. Obtain them via findMembers.',
        },
      },
      required: ['eventId', 'userIds'],
    },
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:run src/app/api/ai-helper/tools/executeAddParticipants.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ai-helper/tools/addParticipantsTool.ts src/app/api/ai-helper/tools/executeAddParticipants.ts src/app/api/ai-helper/tools/executeAddParticipants.test.ts
git commit -m "feat(ai-helper): add addParticipants tool"
```

---

### Task 3: Wire tools into the route handler

**Files:**
- Modify: `src/app/api/ai-helper/route.ts`

**Interfaces:**
- Consumes: `findMembersTool`, `executeFindMembers`, `FindMembersArgs` (Task 1); `addParticipantsTool`, `executeAddParticipants`, `AddParticipantsArgs` (Task 2); existing `getEventById`.
- Produces: HTTP JSON response now includes `participantsUpdated: boolean`.

- [ ] **Step 1: Add imports**

After the existing tool imports (around line 11) add:

```typescript
import { findMembersTool } from './tools/findMembersTool';
import { executeFindMembers, FindMembersArgs } from './tools/executeFindMembers';
import { addParticipantsTool } from './tools/addParticipantsTool';
import { executeAddParticipants, AddParticipantsArgs } from './tools/executeAddParticipants';
```

- [ ] **Step 2: Extend `ToolOutcome`**

Replace the `ToolOutcome` type:

```typescript
type ToolOutcome = {
  content: string;
  eventCreated?: boolean;
  eventUpdated?: boolean;
  participantsUpdated?: boolean;
};
```

- [ ] **Step 3: Add tool dispatch cases**

In `handleToolCall`'s `switch`, add these two cases before `default:`:

```typescript
    case 'findMembers': {
      const result = await executeFindMembers(args as FindMembersArgs, guildId);
      return { content: JSON.stringify(result) };
    }
    case 'addParticipants': {
      if (!canManageEvents) {
        return { content: 'Permission denied: only guild owners and admins can add participants.' };
      }
      const addArgs = args as AddParticipantsArgs;
      const found = await getEventById(addArgs.eventId);
      if (!found || found.guildId !== guildId) {
        return { content: 'Failed to add participants: event not found in this guild' };
      }
      const result = await executeAddParticipants(addArgs, guildId);
      return {
        content: result.success
          ? `Added ${result.addedCount} participant(s) to the event`
          : `Failed to add participants: ${result.error}`,
        participantsUpdated: result.success,
      };
    }
```

- [ ] **Step 4: Register tool schemas**

Replace the `tools` array in `client.chat.completions.create`:

```typescript
        tools: [createEventTool, findEventsTool, editEventTool, findMembersTool, addParticipantsTool],
```

- [ ] **Step 5: Track and return `participantsUpdated`**

Add the tracking variable next to `eventUpdated` (around line 125):

```typescript
    let participantsUpdated = false;
```

In the parallel tool-results map, forward the flag — add to the returned object inside `toolCalls.map`:

```typescript
            participantsUpdated: outcome.participantsUpdated,
```

In the `toolResults.forEach` aggregation block add:

```typescript
        if (r.participantsUpdated) participantsUpdated = true;
```

Update both `NextResponse.json` success returns (the text-response branch and any other returning the message) to include the flag:

```typescript
        return NextResponse.json({ message, eventCreated, eventUpdated, participantsUpdated });
```

- [ ] **Step 6: Verify the full AI-helper suite and typecheck**

Run: `pnpm test:run src/app/api/ai-helper && pnpm exec tsc --noEmit`
Expected: existing AI-helper tests still PASS; tsc shows no NEW errors (baseline has 3 pre-existing errors unrelated to these files).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/ai-helper/route.ts
git commit -m "feat(ai-helper): wire findMembers and addParticipants into route"
```

---

### Task 4: System prompt guidance

**Files:**
- Modify: `src/app/api/ai-helper/systemPrompt.ts`

**Interfaces:**
- Consumes: nothing new. Produces: updated prompt text only.

- [ ] **Step 1: Add the adding-participants guidance**

In `getSystemPrompt`, after the "When editing events" block (before the "Formatting:" block), insert:

```
  When adding participants:
  - Use the findMembers tool to resolve the people the user mentions (by name or alias) to their userId; pass a keyword to narrow the search
  - Use the addParticipants tool with the event id (from findEvents) and the resolved userIds to add them
  - addParticipants only ADDS members — it never removes existing participants
  - If a name is ambiguous or no member matches, ask the user to clarify instead of guessing
  - Only guild owners and admins can add participants; if the tool reports a permission error, relay that politely
```

- [ ] **Step 2: Typecheck the file**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors (baseline 3 pre-existing).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai-helper/systemPrompt.ts
git commit -m "feat(ai-helper): document add-participants flow in system prompt"
```

---

### Task 5: Client refresh on participant changes

**Files:**
- Modify: `src/features/ai-helper/api/aiHelperApi.ts`
- Modify: `src/features/ai-helper/ui/AiHelperModal.tsx`

**Interfaces:**
- Consumes: `participantsUpdated: boolean` from the route response (Task 3).
- Produces: open event-detail roster refreshes after the AI adds participants.

- [ ] **Step 1: Extend the response type**

In `aiHelperApi.ts`, update `SendAiMessageResponse`:

```typescript
interface SendAiMessageResponse {
  message: string;
  eventCreated: boolean;
  eventUpdated: boolean;
  participantsUpdated: boolean;
}
```

- [ ] **Step 2: Invalidate the Participant tag in the modal**

In `AiHelperModal.tsx`, replace the post-reply invalidation block in `handleSubmit`:

```typescript
      setMessages((prev) => [...prev, { role: 'assistant', content: result.message }]);
      if (result.eventCreated || result.eventUpdated) {
        dispatch(baseApi.util.invalidateTags([{ type: 'Event', id: 'LIST' }]));
      }
      if (result.participantsUpdated) {
        dispatch(baseApi.util.invalidateTags(['Participant']));
      }
```

- [ ] **Step 3: Run the AI-helper feature tests**

Run: `pnpm test:run src/features/ai-helper`
Expected: PASS (existing modal/button tests unaffected).

- [ ] **Step 4: Commit**

```bash
git add src/features/ai-helper/api/aiHelperApi.ts src/features/ai-helper/ui/AiHelperModal.tsx
git commit -m "feat(ai-helper): refresh participants after AI adds them"
```

---

## Self-Review Notes

- **Spec coverage:** findMembers (T1), addParticipants + union/filter/permission (T2, T3), event-in-guild guard (T3), participantsUpdated flag + client invalidation (T3, T5), system prompt (T4), tests (T1, T2). All spec sections mapped.
- **Type consistency:** `executeFindMembers` / `executeAddParticipants` signatures and the `participantsUpdated` flag are used identically in `route.ts` (T3) and the client (T5). `getEventById` returns `{ event, guildId }` — guard uses `found.guildId`, matching the existing `editEvent` case.
- **Placeholders:** none — every code step is complete.
