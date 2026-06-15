import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventDetailContent } from './EventDetailContent';
import { calendarReducer } from '@/entities/calendar';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
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

vi.mock('@/entities/event', () => ({
  useGetEventByIdQuery: vi.fn().mockReturnValue({
    data: { event: { id: 'e1', title: 'Morning Raid', date: '2026-05-28', time: '20:00', type: 'raid', description: 'Bring potions' }, guildId: 'g1' },
    isLoading: false,
  }),
  useGetParticipantsQuery: vi.fn().mockReturnValue({
    data: { participants: [], currentUserId: '' },
    isLoading: false,
  }),
  useDeleteEventMutation: vi.fn().mockReturnValue([vi.fn().mockResolvedValue({}), {}]),
  useUpdateEventMutation: vi.fn().mockReturnValue([vi.fn().mockResolvedValue({}), {}]),
  useCreateEventMutation: vi.fn().mockReturnValue([vi.fn().mockResolvedValue({}), {}]),
}));
vi.mock('@/entities/guild', () => ({
  useGuildPermissions: vi.fn().mockReturnValue({ canManageEvents: true }),
}));
vi.mock('../api/detailApi', () => ({
  useUpdateParticipantStatusMutation: vi.fn().mockReturnValue([vi.fn()]),
  useAddSelfAsParticipantMutation: vi.fn().mockReturnValue([vi.fn(), {}]),
  useLeaveEventMutation: vi.fn().mockReturnValue([vi.fn(), {}]),
  useGetEventJoinRequestsQuery: vi.fn().mockReturnValue({ data: [] }),
  useSubmitEventJoinRequestMutation: vi.fn().mockReturnValue([vi.fn(), {}]),
  useResolveEventJoinRequestMutation: vi.fn().mockReturnValue([vi.fn(), {}]),
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
    expect(screen.getByText(/20:00/)).toBeInTheDocument();
  });

  it('renders back link to day page', () => {
    render(
      <Provider store={makeStore()}>
        <EventDetailContent eventId="e1" />
      </Provider>
    );
    const backLink = screen.getByRole('link', { name: /backToDay/i });
    expect(backLink).toHaveAttribute('href', '/day/2026-05-28?guildId=g1');
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
