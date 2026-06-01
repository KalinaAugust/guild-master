import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EventsTooltipContent } from './EventsTooltipContent';
import type { ActivityEvent } from '@/shared/types';

const events: ActivityEvent[] = [
  { id: 'e1', title: 'Dragon Raid', date: '2026-06-01', time: '20:00', type: 'raid' },
  { id: 'e2', title: 'Team Meeting', date: '2026-06-01', time: '10:00', type: 'meeting' },
];

describe('EventsTooltipContent', () => {
  it('renders all events', () => {
    render(<EventsTooltipContent events={events} />);
    expect(screen.getByText(/Dragon Raid/)).toBeInTheDocument();
    expect(screen.getByText(/Team Meeting/)).toBeInTheDocument();
  });

  it('renders event time alongside title', () => {
    render(<EventsTooltipContent events={events} />);
    expect(screen.getByText(/20:00.*Dragon Raid|Dragon Raid.*20:00/)).toBeInTheDocument();
  });

  it('renders nothing when events list is empty', () => {
    const { container } = render(<EventsTooltipContent events={[]} />);
    expect(container.firstChild?.childNodes).toHaveLength(0);
  });

  it('renders one item per event', () => {
    const { container } = render(<EventsTooltipContent events={events} />);
    const items = container.querySelectorAll('[class*="eventItem"]');
    expect(items).toHaveLength(2);
  });
});
