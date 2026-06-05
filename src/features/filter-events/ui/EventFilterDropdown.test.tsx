import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventFilterDropdown } from './EventFilterDropdown';
import { calendarReducer } from '@/entities/calendar';
import { baseApi } from '@/shared/api/baseApi';
import { ActivityType } from '@/shared/types';
import React from 'react';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    if (namespace === 'Event') {
      return `Event.${key}`;
    }
    if (namespace === 'Common') {
      return `Common.${key}`;
    }
    return key;
  },
}));

vi.mock('@radix-ui/react-popover', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@radix-ui/react-popover')>();
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

function makeStore(uiOverrides = {}) {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      ui: calendarReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState: {
      ui: {
        isEventModalOpen: false,
        selectedDate: null,
        viewDate: '2026-05-20T00:00:00.000Z',
        excludedEventTypes: [],
        ...uiOverrides,
      },
    },
  });
}

function renderDropdown(uiOverrides = {}) {
  const store = makeStore(uiOverrides);
  return {
    store,
    ...render(
      <Provider store={store}>
        <EventFilterDropdown />
      </Provider>
    ),
  };
}

describe('EventFilterDropdown', () => {
  it('renders "All" when excludedEventTypes is empty', () => {
    renderDropdown({ excludedEventTypes: [] });
    expect(screen.getByText('Event.filter.all')).toBeInTheDocument();
  });

  it('renders disabled type count or icons when excludedEventTypes is not empty', () => {
    renderDropdown({ excludedEventTypes: ['raid', 'game'] });
    expect(screen.queryByText('Event.filter.all')).not.toBeInTheDocument();
  });

  it('opens popover on click and shows all event types', () => {
    renderDropdown({ excludedEventTypes: [] });
    
    const trigger = screen.getByRole('button', { name: 'Event.filter.ariaLabel' });
    fireEvent.click(trigger);

    expect(screen.getByRole('button', { name: 'Event.filter.enableAll' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Event.filter.disableAll' })).toBeInTheDocument();
    expect(screen.getByText('Common.eventTypes.raid')).toBeInTheDocument();
  });

  it('disables all event types when "Disable all" is clicked', () => {
    const { store } = renderDropdown({ excludedEventTypes: [] });
    
    const trigger = screen.getByRole('button', { name: 'Event.filter.ariaLabel' });
    fireEvent.click(trigger);

    const disableAllBtn = screen.getByRole('button', { name: 'Event.filter.disableAll' });
    fireEvent.click(disableAllBtn);

    const state = store.getState() as { ui: { excludedEventTypes: ActivityType[] } };
    expect(state.ui.excludedEventTypes).toHaveLength(9);
  });

  it('enables all event types when "Enable all" is clicked', () => {
    const { store } = renderDropdown({ excludedEventTypes: ['raid', 'game'] });
    
    const trigger = screen.getByRole('button', { name: 'Event.filter.ariaLabel' });
    fireEvent.click(trigger);

    const enableAllBtn = screen.getByRole('button', { name: 'Event.filter.enableAll' });
    fireEvent.click(enableAllBtn);

    const state = store.getState() as { ui: { excludedEventTypes: ActivityType[] } };
    expect(state.ui.excludedEventTypes).toHaveLength(0);
  });
});
