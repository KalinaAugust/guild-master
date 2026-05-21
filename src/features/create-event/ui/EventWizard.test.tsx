import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventWizard } from './EventWizard';
import { calendarReducer } from '@/entities/calendar';
import { guildReducer } from '@/entities/guild/model/slice';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/entities/event', () => ({
  createEventThunk: vi.fn(() => ({ type: 'event/create', payload: undefined, meta: { requestStatus: 'fulfilled' } })),
  updateEventThunk: vi.fn(() => ({ type: 'event/update', payload: undefined, meta: { requestStatus: 'fulfilled' } })),
}));

function makeStore(uiOverrides = {}) {
  return configureStore({
    reducer: { ui: calendarReducer, guild: guildReducer },
    preloadedState: {
      ui: {
        isEventModalOpen: false,
        selectedDate: null,
        viewDate: '2026-05-20T00:00:00.000Z',
        isEventDetailOpen: false,
        viewingEvent: null,
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

  it('dispatches closeEventModal when close button is clicked', async () => {
    const user = userEvent.setup();
    const store = makeStore({ isEventModalOpen: true });
    render(
      <Provider store={store}>
        <EventWizard />
      </Provider>
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(store.getState().ui.isEventModalOpen).toBe(false);
  });
});
