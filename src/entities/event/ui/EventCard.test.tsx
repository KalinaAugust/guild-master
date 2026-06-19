import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EventCard } from './EventCard';
import type { ActivityEvent } from '@/shared/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const event: ActivityEvent = {
  id: 'e1',
  title: 'Dragon Raid',
  date: '2026-06-01',
  time: '20:00',
  type: 'game',
};

describe('EventCard', () => {
  it('renders event title', () => {
    render(<EventCard event={event} />);
    expect(screen.getByText('Dragon Raid')).toBeInTheDocument();
  });

  it('renders event time', () => {
    render(<EventCard event={event} />);
    expect(screen.getByText('20:00')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EventCard event={{ ...event, description: 'Bring potions' }} />);
    expect(screen.getByText('Bring potions')).toBeInTheDocument();
  });

  it('does not render description when absent', () => {
    const { container } = render(<EventCard event={event} />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(<EventCard event={event} onClick={onClick} />);
    fireEvent.click(screen.getByText('Dragon Raid'));
    expect(onClick).toHaveBeenCalledWith(event);
  });

  it('always renders the copy-link button and never an edit button', () => {
    render(<EventCard event={event} />);
    // The copy-link button is the only action with no edit pencil present.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'copyLink' })).toBeInTheDocument();
  });

  it('shows the delete button only when onDelete is provided', () => {
    const { rerender } = render(<EventCard event={event} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    rerender(<EventCard event={event} onDelete={vi.fn()} />);
    // copy-link + delete
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('calls onDelete with event id, without triggering onClick', () => {
    const onClick = vi.fn();
    const onDelete = vi.fn();
    render(<EventCard event={event} onClick={onClick} onDelete={onDelete} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onDelete).toHaveBeenCalledWith('e1');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders participant count when provided', () => {
    render(<EventCard event={event} participantCount={{ total: 5, confirmed: 3 }} />);
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });

  it('renders 0 / 0 when participantCount is zero', () => {
    render(<EventCard event={event} participantCount={{ total: 0, confirmed: 0 }} />);
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });

  it('does not render participant count when prop is absent', () => {
    render(<EventCard event={event} />);
    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
  });
});
