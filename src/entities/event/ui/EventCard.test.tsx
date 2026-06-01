import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EventCard } from './EventCard';
import type { ActivityEvent } from '@/shared/types';

const event: ActivityEvent = {
  id: 'e1',
  title: 'Dragon Raid',
  date: '2026-06-01',
  time: '20:00',
  type: 'raid',
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

  it('calls onEdit when edit button clicked, without triggering onClick', () => {
    const onClick = vi.fn();
    const onEdit = vi.fn();
    render(<EventCard event={event} onClick={onClick} onEdit={onEdit} />);
    const editBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(editBtn.closest('button')!);
    expect(onEdit).toHaveBeenCalledWith(event);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows edit button only when onEdit is provided', () => {
    const { rerender } = render(<EventCard event={event} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    rerender(<EventCard event={event} onEdit={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('shows delete button only when onDelete is provided', () => {
    render(<EventCard event={event} onDelete={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('calls onDelete with event id, without triggering onClick', () => {
    const onClick = vi.fn();
    const onDelete = vi.fn();
    render(<EventCard event={event} onClick={onClick} onDelete={onDelete} />);
    const [deleteBtn] = screen.getAllByRole('button');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('e1');
    expect(onClick).not.toHaveBeenCalled();
  });
});
