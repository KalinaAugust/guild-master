import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventDetailView } from './EventDetailView';
import { calendarReducer } from '@/entities/calendar';
import { ActivityEvent } from '@/shared/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/entities/event', () => ({
  useGetParticipantsQuery: vi.fn().mockReturnValue({
    data: { participants: [], currentUserId: '' },
    isLoading: false,
  }),
}));
vi.mock('../api/detailApi', () => ({
  useUpdateParticipantStatusMutation: vi.fn().mockReturnValue([vi.fn()]),
}));

const mockEvent: ActivityEvent = {
  id: 'e1',
  title: 'Morning Raid',
  date: '2026-05-28',
  time: '20:00',
  type: 'raid',
  description: 'Bring potions',
};

function makeStore(uiOverrides = {}) {
  return configureStore({
    reducer: { ui: calendarReducer },
    preloadedState: {
      ui: {
        isEventModalOpen: false,
        selectedDate: null,
        viewDate: '2026-05-01T00:00:00.000Z',
        isEventDetailOpen: false,
        viewingEvent: null,
        ...uiOverrides,
      },
    },
  });
}

describe('EventDetailView', () => {
  it('is not rendered when isEventDetailOpen is false', () => {
    const store = makeStore({ isEventDetailOpen: false });
    render(<Provider store={store}><EventDetailView /></Provider>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders event title when open', () => {
    const store = makeStore({ isEventDetailOpen: true, viewingEvent: mockEvent });
    render(<Provider store={store}><EventDetailView /></Provider>);
    expect(screen.getByText('Morning Raid')).toBeInTheDocument();
  });

  it('renders event description when open', () => {
    const store = makeStore({ isEventDetailOpen: true, viewingEvent: mockEvent });
    render(<Provider store={store}><EventDetailView /></Provider>);
    expect(screen.getByText('Bring potions')).toBeInTheDocument();
  });

  it('renders event time', () => {
    const store = makeStore({ isEventDetailOpen: true, viewingEvent: mockEvent });
    render(<Provider store={store}><EventDetailView /></Provider>);
    expect(screen.getByText('20:00')).toBeInTheDocument();
  });

  it('shows empty participants message when list is empty', async () => {
    const store = makeStore({ isEventDetailOpen: true, viewingEvent: mockEvent });
    render(<Provider store={store}><EventDetailView /></Provider>);
    expect(await screen.findByText('noParticipants')).toBeInTheDocument();
  });
});
