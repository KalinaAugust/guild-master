# Event Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fullscreen dialog `EventDetailView` with a dedicated page at `/events/[id]` with a shareable URL, server-side access control, and the same edit/delete/confirm/decline functionality.

**Architecture:** Server Component at `app/events/[id]/page.tsx` fetches the event and checks guild membership via Supabase. If no access, renders `AccessDenied`. If access granted, renders the client component `EventDetailContent` that subscribes to RTK Query for live updates. Clicking an event card in `DayEventsList` navigates to this page instead of opening the old dialog.

**Tech Stack:** Next.js 15 App Router, RTK Query (`baseApi.injectEndpoints`), Supabase SSR client, next-intl, CSS Modules, Vitest + React Testing Library.

---

## File Map

**Create:**
- `src/entities/event/api/getEventById.ts` — Supabase server helper, returns `{ event, guildId } | null`
- `src/entities/event/api/getEventById.test.ts` — unit tests for the helper
- `src/features/event-detail/ui/EventDetailContent.tsx` — client component, replaces EventDetailView
- `src/features/event-detail/ui/EventDetailContent.module.css` — styles
- `src/features/event-detail/ui/EventDetailContent.test.tsx` — component tests
- `src/app/events/[id]/page.tsx` — Server Component, fetch + access check
- `src/app/events/[id]/AccessDenied.tsx` — server-rendered access denied UI
- `src/app/events/[id]/EventPage.module.css` — page-level styles

**Modify:**
- `src/app/api/events/[id]/route.ts` — add GET handler
- `src/entities/event/api/eventApi.ts` — add `getEventById` RTK Query endpoint
- `src/entities/event/index.ts` — export `useGetEventByIdQuery`
- `src/features/event-detail/index.ts` — export `EventDetailContent`, remove `EventDetailView`
- `src/widgets/day-events/ui/DayEventsList.tsx` — replace `dispatch(openEventDetail)` with `router.push`
- `src/entities/calendar/model/slice.ts` — remove `openEventDetail`, `closeEventDetail`, `isEventDetailOpen`, `viewingEvent`
- `src/entities/calendar/index.ts` — remove `openEventDetail`, `closeEventDetail` exports
- `src/shared/types/index.ts` — remove `isEventDetailOpen`, `viewingEvent` from `UIState`
- `src/app/day/[date]/page.tsx` — remove `EventDetailView` import and usage
- `messages/en.json` — add translation keys
- `messages/ru.json` — add translation keys

**Delete:**
- `src/features/event-detail/ui/EventDetailView.tsx`
- `src/features/event-detail/ui/EventDetailView.test.tsx`

---

## Task 1: getEventById server helper

**Files:**
- Create: `src/entities/event/api/getEventById.ts`
- Create: `src/entities/event/api/getEventById.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/entities/event/api/getEventById.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getEventById } from './getEventById';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

const rawRow = {
  id: 'e1',
  title: 'Morning Raid',
  description: 'Bring potions',
  type: 'raid',
  event_date: '2026-05-28T20:00:00+00:00',
  guild_id: 'g1',
};

function makeSupabaseMock(resolvedValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
  return chain;
}

describe('getEventById', () => {
  it('returns transformed event and guildId when found', async () => {
    const mock = makeSupabaseMock({ data: rawRow, error: null });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getEventById('e1');

    expect(result).not.toBeNull();
    expect(result!.event.id).toBe('e1');
    expect(result!.event.title).toBe('Morning Raid');
    expect(result!.event.type).toBe('raid');
    expect(result!.event.date).toBe('2026-05-28');
    expect(result!.event.time).toBe('20:00');
    expect(result!.event.description).toBe('Bring potions');
    expect(result!.guildId).toBe('g1');
  });

  it('returns null when event not found', async () => {
    const mock = makeSupabaseMock({ data: null, error: { code: 'PGRST116' } });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getEventById('nonexistent');

    expect(result).toBeNull();
  });

  it('omits description when null', async () => {
    const mock = makeSupabaseMock({ data: { ...rawRow, description: null }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getEventById('e1');

    expect(result!.event.description).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/entities/event/api/getEventById.test.ts
```
Expected: FAIL — `Cannot find module './getEventById'`

- [ ] **Step 3: Implement the helper**

```typescript
// src/entities/event/api/getEventById.ts
import { createClient } from '@/shared/api/supabase/server';
import { ActivityEvent } from '@/shared/types';
import dayjs from '@/shared/lib/dayjs';

type RawEventRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  event_date: string;
  guild_id: string;
};

export const getEventById = async (
  id: string
): Promise<{ event: ActivityEvent; guildId: string } | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, type, event_date, guild_id')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const raw = data as RawEventRow;
  const d = dayjs.utc(raw.event_date);
  return {
    event: {
      id: raw.id,
      title: raw.title,
      description: raw.description ?? undefined,
      type: raw.type as ActivityEvent['type'],
      date: d.format('YYYY-MM-DD'),
      time: d.format('HH:mm'),
    },
    guildId: raw.guild_id,
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/entities/event/api/getEventById.test.ts
```
Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/entities/event/api/getEventById.ts src/entities/event/api/getEventById.test.ts
git commit -m "feat(event): add getEventById Supabase server helper"
```

---

## Task 2: GET /api/events/[id] route handler

**Files:**
- Modify: `src/app/api/events/[id]/route.ts`

- [ ] **Step 1: Add the GET export to the route file**

The file currently has `PATCH` and `DELETE`. Add `GET` at the top, importing `getEventById`:

```typescript
// src/app/api/events/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getEventById } from '@/entities/event/api/getEventById';
import { updateEvent } from '@/entities/event/api/updateEvent';
import { deleteEvent } from '@/entities/event/api/deleteEvent';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getEventById(id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await updateEvent(id, body);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteEvent(id);
    return NextResponse.json({ deleted: id });
  } catch {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```
Expected: no TypeScript errors related to the route file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/events/\[id\]/route.ts
git commit -m "feat(event): add GET /api/events/[id] route handler"
```

---

## Task 3: RTK Query getEventById endpoint

**Files:**
- Modify: `src/entities/event/api/eventApi.ts`
- Modify: `src/entities/event/index.ts`

- [ ] **Step 1: Add the endpoint to eventApi.ts**

In `src/entities/event/api/eventApi.ts`, add `getEventById` inside `injectEndpoints`. The route returns `{ event: ActivityEvent, guildId: string }` already transformed, so no `transformResponse` needed.

Add to the `endpoints` builder (after `syncParticipants`):

```typescript
getEventById: builder.query<{ event: ActivityEvent; guildId: string }, string>({
  query: (id) => `events/${id}`,
  providesTags: (_, __, id) => [{ type: 'Event' as const, id }],
}),
```

Add to the exports at the bottom of the file:

```typescript
export const {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useGetParticipantsQuery,
  useSyncParticipantsMutation,
  useGetEventByIdQuery,  // ← add this
} = eventApi;
```

- [ ] **Step 2: Export from the entity's public API**

In `src/entities/event/index.ts`, add `useGetEventByIdQuery`:

```typescript
export { EventCard } from './ui/EventCard';
export {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useGetParticipantsQuery,
  useSyncParticipantsMutation,
  useGetEventByIdQuery,
} from './api/eventApi';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/entities/event/api/eventApi.ts src/entities/event/index.ts
git commit -m "feat(event): add getEventById RTK Query endpoint"
```

---

## Task 4: Translation keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add keys to en.json**

Add `backToDay` to `Common` and new keys to `EventDetail`:

```json
"Common": {
  ...existing keys...,
  "backToCalendar": "Back to calendar",
  "backToDay": "Back to day"
},
"EventDetail": {
  ...existing keys...,
  "accessDenied": "You don't have access to this event.",
  "guildLeaderContact": "Contact the guild leader for access: {name}",
  "goHome": "Go home"
}
```

Full updated `messages/en.json`:

```json
{
  "Common": {
    "title": "Guild Master",
    "logout": "Logout",
    "profile": "Profile",
    "language": "Language",
    "cancel": "Cancel",
    "save": "Save",
    "create": "Create",
    "confirm": "Confirm",
    "delete": "Delete",
    "confirmDelete": "Are you sure you want to delete this event?",
    "backToCalendar": "Back to calendar",
    "backToDay": "Back to day",
    "locales": {
      "en": "English",
      "ru": "Russian"
    }
  },
  "Auth": {
    "login": "Login",
    "email": "Email",
    "password": "Password",
    "submit": "Login"
  },
  "Event": {
    "createTitle": "New Event",
    "editTitle": "Edit Event",
    "dayTitle": "Day Events",
    "addEvent": "Add Event",
    "noEvents": "Nothing scheduled for this day",
    "createFirst": "Create first event",
    "titleLabel": "Title",
    "titlePlaceholder": "Enter title...",
    "dateLabel": "Date",
    "timeLabel": "Time",
    "typeLabel": "Event Type",
    "descriptionLabel": "Description",
    "descriptionPlaceholder": "Add details about the event...",
    "submit": "Create Event",
    "successCreated": "Event created successfully",
    "successUpdated": "Event updated",
    "successDeleted": "Event deleted",
    "error": "An error occurred",
    "types": {
      "game": "Game",
      "raid": "Raid",
      "meeting": "Meeting",
      "other": "Other"
    },
    "wizard": {
      "mainColumn": "Main",
      "additionalColumn": "Additional",
      "iconLabel": "Event icon",
      "iconPlaceholder": "Choose icon…",
      "colorLabel": "Color",
      "repeatLabel": "Repeat on days",
      "invitedLabel": "Invited users",
      "invitedPlaceholder": "Add members…",
      "memberSearch": "Search members…",
      "noMembers": "No guild members found"
    }
  },
  "EventDetail": {
    "type": "Type",
    "dateTime": "Date & Time",
    "description": "Description",
    "creator": "Creator",
    "participants": "Participants",
    "noParticipants": "No participants yet. Add them when editing the event.",
    "edit": "Edit",
    "accessDenied": "You don't have access to this event.",
    "guildLeaderContact": "Contact the guild leader for access: {name}",
    "goHome": "Go home",
    "status": {
      "pending": "Awaiting response",
      "confirmed": "Coming",
      "declined": "Not coming"
    },
    "confirmBtn": "Coming",
    "declineBtn": "Not coming"
  },
  "Guild": {
    "createTitle": "Create New Guild",
    "welcomeText": "It looks like you don't belong to any guilds yet. Create your own to start working with the calendar!",
    "nameLabel": "Guild Name",
    "descriptionLabel": "Description (optional)",
    "submit": "Create Guild",
    "creating": "Creating...",
    "errorCreate": "Error creating guild"
  }
}
```

- [ ] **Step 2: Add keys to ru.json**

Full updated `messages/ru.json`:

```json
{
  "Common": {
    "title": "Мастер Гильдий",
    "logout": "Выйти",
    "profile": "Профиль",
    "language": "Язык",
    "cancel": "Отмена",
    "save": "Сохранить",
    "create": "Создать",
    "confirm": "Подтвердить",
    "delete": "Удалить",
    "confirmDelete": "Вы уверены, что хотите удалить это событие?",
    "backToCalendar": "Назад в календарь",
    "backToDay": "Назад к дню",
    "locales": {
      "en": "English",
      "ru": "Русский"
    }
  },
  "Auth": {
    "login": "Вход",
    "email": "Электронная почта",
    "password": "Пароль",
    "submit": "Войти"
  },
  "Event": {
    "createTitle": "Новое событие",
    "editTitle": "Редактировать событие",
    "dayTitle": "События дня",
    "addEvent": "Добавить событие",
    "noEvents": "На этот день ничего не запланировано",
    "createFirst": "Создать первое событие",
    "titleLabel": "Название",
    "titlePlaceholder": "Введите название...",
    "dateLabel": "Дата",
    "timeLabel": "Время",
    "typeLabel": "Тип события",
    "descriptionLabel": "Описание",
    "descriptionPlaceholder": "Добавьте подробности о событии...",
    "submit": "Создать событие",
    "successCreated": "Событие успешно создано",
    "successUpdated": "Событие обновлено",
    "successDeleted": "Событие удалено",
    "error": "Произошла ошибка",
    "types": {
      "game": "Игра",
      "raid": "Рейд",
      "meeting": "Встреча",
      "other": "Другое"
    },
    "wizard": {
      "mainColumn": "Основное",
      "additionalColumn": "Дополнительно",
      "iconLabel": "Иконка события",
      "iconPlaceholder": "Выбрать иконку…",
      "colorLabel": "Цвет",
      "repeatLabel": "Повтор по дням",
      "invitedLabel": "Приглашённые участники",
      "invitedPlaceholder": "Добавить участников…",
      "memberSearch": "Поиск участников…",
      "noMembers": "Участников гильдии не найдено"
    }
  },
  "EventDetail": {
    "type": "Тип",
    "dateTime": "Дата и время",
    "description": "Описание",
    "creator": "Создатель",
    "participants": "Участники",
    "noParticipants": "Участников пока нет. Добавьте их при редактировании события.",
    "edit": "Редактировать",
    "accessDenied": "У вас нет доступа к этому событию.",
    "guildLeaderContact": "Обратитесь к главе гильдии для получения доступа: {name}",
    "goHome": "На главную",
    "status": {
      "pending": "Ожидает ответа",
      "confirmed": "Придёт",
      "declined": "Не придёт"
    },
    "confirmBtn": "Приду",
    "declineBtn": "Не приду"
  },
  "Guild": {
    "createTitle": "Создание новой гильдии",
    "welcomeText": "Похоже, вы еще не состоите ни в одной гильдии. Создайте свою, чтобы начать работу с календарем!",
    "nameLabel": "Название гильдии",
    "descriptionLabel": "Описание (необязательно)",
    "submit": "Создать гильдию",
    "creating": "Создание...",
    "errorCreate": "Ошибка при создании гильдии"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat(i18n): add backToDay and accessDenied translation keys"
```

---

## Task 5: EventDetailContent component

**Files:**
- Create: `src/features/event-detail/ui/EventDetailContent.test.tsx`
- Create: `src/features/event-detail/ui/EventDetailContent.tsx`
- Create: `src/features/event-detail/ui/EventDetailContent.module.css`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/event-detail/ui/EventDetailContent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventDetailContent } from './EventDetailContent';
import { calendarReducer } from '@/entities/calendar';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const mockEvent = {
  id: 'e1',
  title: 'Morning Raid',
  date: '2026-05-28',
  time: '20:00',
  type: 'raid' as const,
  description: 'Bring potions',
};

vi.mock('@/entities/event', () => ({
  useGetEventByIdQuery: vi.fn().mockReturnValue({
    data: { event: mockEvent, guildId: 'g1' },
    isLoading: false,
  }),
  useGetParticipantsQuery: vi.fn().mockReturnValue({
    data: { participants: [], currentUserId: '' },
    isLoading: false,
  }),
  useDeleteEventMutation: vi.fn().mockReturnValue([vi.fn().mockResolvedValue({}), {}]),
}));
vi.mock('../api/detailApi', () => ({
  useUpdateParticipantStatusMutation: vi.fn().mockReturnValue([vi.fn()]),
}));

function makeStore() {
  return configureStore({
    reducer: { ui: calendarReducer },
    preloadedState: {
      ui: {
        isEventModalOpen: false,
        selectedDate: null,
        viewDate: '2026-05-01T00:00:00.000Z',
      },
    },
  });
}

describe('EventDetailContent', () => {
  it('renders event title', () => {
    render(
      <Provider store={makeStore()}>
        <EventDetailContent eventId="e1" />
      </Provider>
    );
    expect(screen.getByText('Morning Raid')).toBeInTheDocument();
  });

  it('renders event description', () => {
    render(
      <Provider store={makeStore()}>
        <EventDetailContent eventId="e1" />
      </Provider>
    );
    expect(screen.getByText('Bring potions')).toBeInTheDocument();
  });

  it('renders event time', () => {
    render(
      <Provider store={makeStore()}>
        <EventDetailContent eventId="e1" />
      </Provider>
    );
    expect(screen.getByText('20:00')).toBeInTheDocument();
  });

  it('renders back link to day page', () => {
    render(
      <Provider store={makeStore()}>
        <EventDetailContent eventId="e1" />
      </Provider>
    );
    const backLink = screen.getByRole('link', { name: /backToDay/i });
    expect(backLink).toHaveAttribute('href', '/day/2026-05-28');
  });

  it('shows empty participants message when list is empty', () => {
    render(
      <Provider store={makeStore()}>
        <EventDetailContent eventId="e1" />
      </Provider>
    );
    expect(screen.getByText('noParticipants')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/features/event-detail/ui/EventDetailContent.test.tsx
```
Expected: FAIL — `Cannot find module './EventDetailContent'`

- [ ] **Step 3: Create EventDetailContent.module.css**

```css
/* src/features/event-detail/ui/EventDetailContent.module.css */
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
}

.backLink {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.backLink:hover {
  color: var(--text-primary);
}

.card {
  padding: 40px;
  border-radius: 32px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-glass);
}

.header {
  margin-bottom: 32px;
}

.title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin-bottom: 32px;
}

.column {
  padding: 0 32px 0 0;
}

.column:last-child {
  padding: 0 0 0 32px;
  border-left: 1px solid var(--glass-border);
}

.infoGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 4px;
  display: block;
}

.typeBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  background: rgba(108, 99, 255, 0.2);
  color: #a89fff;
  border: 1px solid rgba(108, 99, 255, 0.3);
  width: fit-content;
}

.type_raid    { background: rgba(255, 101, 132, 0.2); color: #ff9ab0; border-color: rgba(255, 101, 132, 0.3); }
.type_game    { background: rgba(108, 99, 255, 0.2);  color: #a89fff; border-color: rgba(108, 99, 255, 0.3); }
.type_meeting { background: rgba(67, 170, 139, 0.2);  color: #6fd4b2; border-color: rgba(67, 170, 139, 0.3); }
.type_other   { background: rgba(87, 117, 144, 0.2);  color: #8fb5d0; border-color: rgba(87, 117, 144, 0.3); }

.dateTime {
  font-size: 1rem;
  color: var(--text-primary);
}

.description {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 12px;
}

.skeleton {
  height: 44px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--glass-border);
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.8; }
}

@media (max-width: 768px) {
  .container {
    padding: 20px;
  }

  .card {
    padding: 24px;
    border-radius: 24px;
  }

  .body {
    grid-template-columns: 1fr;
  }

  .column {
    padding: 0;
  }

  .column:last-child {
    padding: 0;
    border-left: none;
    border-top: 1px solid var(--glass-border);
    padding-top: 24px;
    margin-top: 24px;
  }
}
```

- [ ] **Step 4: Create EventDetailContent.tsx**

```tsx
// src/features/event-detail/ui/EventDetailContent.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import { useAppDispatch } from '@/shared/lib/hooks';
import { openEventModal } from '@/entities/calendar';
import {
  useGetEventByIdQuery,
  useGetParticipantsQuery,
  useDeleteEventMutation,
} from '@/entities/event';
import { Button } from '@/shared/ui/Button';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { useUpdateParticipantStatusMutation } from '../api/detailApi';
import { ParticipantItem } from './ParticipantItem';
import styles from './EventDetailContent.module.css';

interface EventDetailContentProps {
  eventId: string;
}

export const EventDetailContent: React.FC<EventDetailContentProps> = ({ eventId }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const t = useTranslations('EventDetail');
  const eventT = useTranslations('Event');
  const commonT = useTranslations('Common');

  const { data, isLoading: isEventLoading } = useGetEventByIdQuery(eventId);
  const event = data?.event;

  const { data: participantsData, isLoading: isParticipantsLoading } =
    useGetParticipantsQuery(eventId, { skip: !event });
  const participants = participantsData?.participants ?? [];
  const currentUserId = participantsData?.currentUserId ?? '';

  const [updateStatus] = useUpdateParticipantStatusMutation();
  const [deleteEvent] = useDeleteEventMutation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleEdit = () => {
    if (!event) return;
    dispatch(openEventModal(event));
  };

  const handleConfirm = async () => {
    if (!event) return;
    try {
      await updateStatus({ eventId: event.id, status: 'confirmed' }).unwrap();
    } catch {
      toast.error(eventT('error'));
    }
  };

  const handleDecline = async () => {
    if (!event) return;
    try {
      await updateStatus({ eventId: event.id, status: 'declined' }).unwrap();
    } catch {
      toast.error(eventT('error'));
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    try {
      await deleteEvent(event.id).unwrap();
      toast.success(eventT('successDeleted'));
      router.push(`/day/${event.date}`);
    } catch {
      toast.error(eventT('error'));
    }
  };

  if (isEventLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>{eventT('error')}</p>
      </div>
    );
  }

  const typeLabel = eventT(`types.${event.type}` as Parameters<typeof eventT>[0]);

  return (
    <div className={styles.container}>
      <Link href={`/day/${event.date}`} className={styles.backLink}>
        <ChevronLeft size={20} />
        {commonT('backToDay')}
      </Link>

      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{event.title}</h1>
        </div>

        <div className={styles.body}>
          <div className={styles.column}>
            <div className={styles.infoGroup}>
              <span className={styles.label}>{t('type')}</span>
              <span className={`${styles.typeBadge} ${styles[`type_${event.type}`]}`}>
                {typeLabel}
              </span>
            </div>

            <div className={styles.infoGroup}>
              <span className={styles.label}>{t('dateTime')}</span>
              <span className={styles.dateTime}>
                <span>{event.date}</span>{' '}<span>{event.time}</span>
              </span>
            </div>

            {event.description && (
              <div className={styles.infoGroup}>
                <span className={styles.label}>{t('description')}</span>
                <p className={styles.description}>{event.description}</p>
              </div>
            )}
          </div>

          <div className={styles.column}>
            <span className={styles.label}>
              {t('participants')}{!isParticipantsLoading && ` (${participants.length})`}
            </span>

            {isParticipantsLoading && <div className={styles.skeleton} />}

            {!isParticipantsLoading && participants.length === 0 && (
              <p className={styles.empty}>{t('noParticipants')}</p>
            )}

            {!isParticipantsLoading &&
              participants.map((p) => (
                <ParticipantItem
                  key={p.id}
                  participant={p}
                  isCurrentUser={p.user_id === currentUserId}
                  onConfirm={handleConfirm}
                  onDecline={handleDecline}
                />
              ))}
          </div>
        </div>

        <div className={styles.footer}>
          <Button type="button" variant="secondary" onClick={() => setDeleteModalOpen(true)}>
            {commonT('delete')}
          </Button>
          <Button type="button" variant="primary" onClick={handleEdit}>
            {t('edit')}
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={commonT('delete')}
        description={commonT('confirmDelete')}
        confirmLabel={commonT('delete')}
      />
    </div>
  );
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:run -- src/features/event-detail/ui/EventDetailContent.test.tsx
```
Expected: PASS — 5 tests pass

- [ ] **Step 6: Update features/event-detail/index.ts**

```typescript
// src/features/event-detail/index.ts
export { EventDetailContent } from './ui/EventDetailContent';
export { useUpdateParticipantStatusMutation } from './api/detailApi';
```

- [ ] **Step 7: Commit**

```bash
git add src/features/event-detail/ui/EventDetailContent.tsx \
        src/features/event-detail/ui/EventDetailContent.module.css \
        src/features/event-detail/ui/EventDetailContent.test.tsx \
        src/features/event-detail/index.ts
git commit -m "feat(event-detail): add EventDetailContent page component"
```

---

## Task 6: Event page and AccessDenied

**Files:**
- Create: `src/app/events/[id]/page.tsx`
- Create: `src/app/events/[id]/AccessDenied.tsx`
- Create: `src/app/events/[id]/EventPage.module.css`

- [ ] **Step 1: Create EventPage.module.css**

```css
/* src/app/events/[id]/EventPage.module.css */
.main {
  min-height: 100vh;
}

.accessDeniedContainer {
  max-width: 480px;
  margin: 80px auto;
  padding: 40px;
  text-align: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  backdrop-filter: var(--glass-blur);
}

.accessDeniedTitle {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.accessDeniedMessage {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 24px;
  line-height: 1.6;
}

.homeLink {
  display: inline-flex;
  align-items: center;
  padding: 10px 24px;
  border-radius: 10px;
  background: rgba(108, 99, 255, 0.2);
  color: #a89fff;
  border: 1px solid rgba(108, 99, 255, 0.3);
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s ease;
}

.homeLink:hover {
  background: rgba(108, 99, 255, 0.35);
}
```

- [ ] **Step 2: Create AccessDenied.tsx**

```tsx
// src/app/events/[id]/AccessDenied.tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import styles from './EventPage.module.css';

interface AccessDeniedProps {
  ownerName: string | null;
}

export async function AccessDenied({ ownerName }: AccessDeniedProps) {
  const t = await getTranslations('EventDetail');

  return (
    <div className={styles.accessDeniedContainer}>
      <h1 className={styles.accessDeniedTitle}>{t('accessDenied')}</h1>
      {ownerName && (
        <p className={styles.accessDeniedMessage}>
          {t('guildLeaderContact', { name: ownerName })}
        </p>
      )}
      <Link href="/" className={styles.homeLink}>
        {t('goHome')}
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Create the event page**

```tsx
// src/app/events/[id]/page.tsx
import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';
import { getEventById } from '@/entities/event/api/getEventById';
import { EventDetailContent } from '@/features/event-detail';
import { EventWizard } from '@/features/create-event';
import { AccessDenied } from './AccessDenied';
import styles from './EventPage.module.css';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getEventById(id);
  if (!result) notFound();

  const { guildId } = result;

  const { data: membership } = await supabase
    .from('guild_members')
    .select('id')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    let ownerName: string | null = null;

    const { data: guild } = await supabase
      .from('guilds')
      .select('owner_id')
      .eq('id', guildId)
      .single();

    if (guild) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', guild.owner_id)
        .single();
      ownerName = profile?.full_name ?? null;
    }

    return (
      <main className={styles.main}>
        <AccessDenied ownerName={ownerName} />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <EventDetailContent eventId={id} />
      <EventWizard />
    </main>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```
Expected: no TypeScript errors in the new files.

- [ ] **Step 5: Commit**

```bash
git add src/app/events/
git commit -m "feat(event): add /events/[id] page with access control"
```

---

## Task 7: Update DayEventsList navigation

**Files:**
- Modify: `src/widgets/day-events/ui/DayEventsList.tsx`

- [ ] **Step 1: Replace openEventDetail dispatch with router.push**

In `src/widgets/day-events/ui/DayEventsList.tsx`:

1. Add `useRouter` import from `next/navigation`.
2. Remove `openEventDetail` from the `@/entities/calendar` import.
3. Remove `openEventDetail` from the destructured dispatch calls.
4. Replace `handleViewEvent`.

Updated imports section (top of file):

```typescript
'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { openEventModal, setSelectedDate } from '@/entities/calendar';
import { EventCard, useDeleteEventMutation, useGetEventsQuery } from '@/entities/event';
import { ActivityEvent } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import dayjs from '@/shared/lib/dayjs';
import styles from './DayEventsList.module.css';
```

Replace `handleViewEvent` function:

```typescript
const router = useRouter();

const handleViewEvent = (event: ActivityEvent) => {
  router.push(`/events/${event.id}`);
};
```

- [ ] **Step 2: Run all tests to confirm nothing broke**

```bash
npm run test:run
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/day-events/ui/DayEventsList.tsx
git commit -m "feat(day-events): navigate to event page on card click"
```

---

## Task 8: Cleanup — remove EventDetailView and dead Redux state

**Files:**
- Delete: `src/features/event-detail/ui/EventDetailView.tsx`
- Delete: `src/features/event-detail/ui/EventDetailView.test.tsx`
- Modify: `src/entities/calendar/model/slice.ts`
- Modify: `src/entities/calendar/index.ts`
- Modify: `src/shared/types/index.ts`
- Modify: `src/app/day/[date]/page.tsx`

- [ ] **Step 1: Delete EventDetailView files**

```bash
rm src/features/event-detail/ui/EventDetailView.tsx
rm src/features/event-detail/ui/EventDetailView.test.tsx
```

- [ ] **Step 2: Remove detail state from UIState type**

In `src/shared/types/index.ts`, remove `isEventDetailOpen` and `viewingEvent` from `UIState`:

```typescript
export interface UIState {
  isEventModalOpen: boolean;
  selectedDate: string | null;
  viewDate: string;
  editingEvent?: ActivityEvent;
}
```

- [ ] **Step 3: Remove detail actions from uiSlice**

In `src/entities/calendar/model/slice.ts`, remove `openEventDetail`, `closeEventDetail` and the related initial state fields:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, ActivityEvent } from '@/shared/types';
import dayjs from 'dayjs';

const initialState: UIState = {
  isEventModalOpen: false,
  selectedDate: null,
  viewDate: dayjs().toISOString(),
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openEventModal: (state, action: PayloadAction<ActivityEvent | undefined>) => {
      state.isEventModalOpen = true;
      state.editingEvent = action.payload;
      if (action.payload) {
        state.selectedDate = action.payload.date;
      }
    },
    closeEventModal: (state) => {
      state.isEventModalOpen = false;
      state.editingEvent = undefined;
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
    nextMonth: (state) => {
      state.viewDate = dayjs(state.viewDate).add(1, 'month').toISOString();
    },
    prevMonth: (state) => {
      state.viewDate = dayjs(state.viewDate).subtract(1, 'month').toISOString();
    },
    setViewDate: (state, action: PayloadAction<string>) => {
      state.viewDate = action.payload;
    },
  },
});

export const {
  openEventModal,
  closeEventModal,
  setSelectedDate,
  nextMonth,
  prevMonth,
  setViewDate,
} = uiSlice.actions;
export default uiSlice.reducer;
```

- [ ] **Step 4: Remove detail exports from entities/calendar/index.ts**

```typescript
// src/entities/calendar/index.ts
export {
  default as calendarReducer,
  openEventModal,
  closeEventModal,
  setSelectedDate,
  nextMonth,
  prevMonth,
  setViewDate,
} from './model/slice';
```

- [ ] **Step 5: Remove EventDetailView from DayPage**

In `src/app/day/[date]/page.tsx`, remove the `EventDetailView` import and its JSX usage:

```tsx
import Link from 'next/link';
import { getMyGuilds } from '@/entities/guild';
import { redirect } from 'next/navigation';
import { DayEventsList } from '@/widgets/day-events';
import { EventWizard } from '@/features/create-event';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import styles from './DayPage.module.css';

interface DayPageProps {
  params: Promise<{
    date: string;
  }>;
}

export default async function DayPage({ params }: DayPageProps) {
  const { date } = await params;
  const guilds = await getMyGuilds();
  const t = await getTranslations('Common');

  if (guilds.length === 0) {
    redirect('/guilds/create');
  }

  const currentGuildId = guilds[0].id;

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.backLink}>
        <ChevronLeft size={20} />
        {t('backToCalendar')}
      </Link>

      <div className={styles.card}>
        <DayEventsList date={date} guildId={currentGuildId} />
      </div>

      <EventWizard isDayView />
    </main>
  );
}
```

- [ ] **Step 6: Update the calendar slice test to remove detail state references**

In `src/entities/calendar/model/slice.test.ts`, remove any tests or preloadedState fields that reference `isEventDetailOpen`, `viewingEvent`, `openEventDetail`, or `closeEventDetail`. The test file currently checks calendar navigation — verify it still passes.

```bash
npm run test:run -- src/entities/calendar/model/slice.test.ts
```
Expected: all calendar slice tests pass.

- [ ] **Step 7: Run full test suite**

```bash
npm run test:run
```
Expected: all tests pass. The old `EventDetailView` tests are deleted so they won't run.

- [ ] **Step 8: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(event-detail): remove EventDetailView dialog and dead Redux state"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `/events/[id]` page — Task 6
- ✅ Server-side data fetch — Tasks 1–2, Task 6
- ✅ Server-side access check — Task 6
- ✅ `notFound()` for missing events — Task 6
- ✅ `AccessDenied` with guild leader name — Tasks 4, 6
- ✅ RTK Query `getEventById` endpoint — Task 3
- ✅ `EventDetailContent` with all actions (confirm/decline/edit/delete) — Task 5
- ✅ Back link to `/day/[event.date]` — Task 5
- ✅ DayEventsList navigates to page — Task 7
- ✅ Cleanup of dialog and Redux state — Task 8
- ✅ Translation keys — Task 4

**Type consistency:**
- `getEventById` returns `{ event: ActivityEvent; guildId: string } | null` — used consistently in Tasks 1, 2, 3, 6.
- `useGetEventByIdQuery` returns `{ event: ActivityEvent; guildId: string }` — consumed as `data.event` in Task 5.
- `UIState` after cleanup has no `isEventDetailOpen`/`viewingEvent` — Task 8 aligns slice, type, and tests.
