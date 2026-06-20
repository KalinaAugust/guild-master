import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TodayBlock } from './TodayBlock';
import type { ActivityEvent } from '@/shared/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/entities/event', () => ({
  useGetParticipantsQuery: () => ({ data: { participants: [] } }),
  typeIcons: { game: null, meeting: null, other: null, party: null, sport: null, dnd: null, boardgame: null },
}));

const events: ActivityEvent[] = [
  { id: 'e1', title: 'Dragon Raid', date: '2026-06-01', time: '20:00', type: 'game', description: 'Bring snacks' },
  { id: 'e2', title: 'Team Meeting', date: '2026-06-01', time: '10:00', type: 'meeting' },
];

describe('TodayBlock', () => {
  it('renders each event with time, title and description', () => {
    render(<TodayBlock events={events} />);
    expect(screen.getByText('Dragon Raid')).toBeInTheDocument();
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('20:00')).toBeInTheDocument();
    expect(screen.getByText('Bring snacks')).toBeInTheDocument();
  });

  it('links each event to its public page', () => {
    render(<TodayBlock events={events} />);
    expect(screen.getByText('Dragon Raid').closest('a')).toHaveAttribute('href', '/events/e1');
  });

  it('shows the empty state when there are no events', () => {
    render(<TodayBlock events={[]} />);
    expect(screen.getByText('noToday')).toBeInTheDocument();
  });
});
