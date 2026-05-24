import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventWizard } from './EventWizard';
import { calendarReducer } from '@/entities/calendar';
import { guildReducer } from '@/entities/guild/model/slice';
import { baseApi } from '@/shared/api/baseApi';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockUnwrap = vi.fn().mockResolvedValue({ id: 'new-id' });
const mockCreateEvent = vi.fn().mockReturnValue({ unwrap: mockUnwrap });
const mockUpdateEvent = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
const mockSyncParticipants = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

vi.mock('@/entities/event', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/event')>();
  return {
    ...actual,
    useCreateEventMutation: () => [mockCreateEvent, { isLoading: false }],
    useUpdateEventMutation: () => [mockUpdateEvent, { isLoading: false }],
    useGetEventsQuery: () => ({ data: [] }),
    useGetParticipantsQuery: () => ({ data: undefined }),
    useSyncParticipantsMutation: () => [mockSyncParticipants, { isLoading: false }],
  };
});

vi.mock('@/entities/guild', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/guild')>();
  return {
    ...actual,
    useGetGuildMembersQuery: () => ({ data: [] }),
  };
});

function makeStore(uiOverrides = {}) {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      ui: calendarReducer,
      guild: guildReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState: {
      ui: {
        isEventModalOpen: false,
        selectedDate: null,
        viewDate: '2026-05-20T00:00:00.000Z',
        ...uiOverrides,
      },
      guild: { currentGuildId: null },
    },
  });
}

function renderWizard(uiOverrides = {}) {
  const store = makeStore(uiOverrides);
  return render(
    <Provider store={store}>
      <EventWizard />
    </Provider>
  );
}

describe('EventWizard', () => {
  it('is not visible when isEventModalOpen is false', () => {
    renderWizard({ isEventModalOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the form when isEventModalOpen is true', () => {
    renderWizard({ isEventModalOpen: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
