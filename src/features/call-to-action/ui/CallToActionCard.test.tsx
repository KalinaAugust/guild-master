import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CallToActionCard } from './CallToActionCard';
import type { CallToAction } from '@/entities/call-to-action';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (key === 'progress') return `${params?.count} / ${params?.target}`;
    return key;
  },
  useLocale: () => 'en',
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/shared/ui/ProfileLink', () => ({
  ProfileLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const base: CallToAction = {
  id: 'c1',
  guildId: 'g1',
  createdBy: 'u1',
  title: 'Mythic Raid',
  description: 'Need a full party',
  type: 'raid',
  eventDate: '2026-07-01T19:00:00.000Z',
  targetCount: 5,
  interestedCount: 2,
  interested: false,
  eventId: null,
  launchedAt: null,
  createdAt: '2026-06-16T00:00:00.000Z',
  author: {
    publicId: 'p1', fullName: 'Leader', avatarUrl: null,
    alias: null, displayAsAlias: false, icon: null,
  },
  canManage: false,
};

describe('CallToActionCard', () => {
  it('renders title, author and progress', () => {
    render(<CallToActionCard cta={base} onToggleInterest={vi.fn()} />);
    expect(screen.getByText('Mythic Raid')).toBeInTheDocument();
    expect(screen.getByText('Leader')).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('calls onToggleInterest when the want button is clicked', () => {
    const onToggle = vi.fn();
    render(<CallToActionCard cta={base} onToggleInterest={onToggle} />);
    fireEvent.click(screen.getByText('wantButton'));
    expect(onToggle).toHaveBeenCalledWith('c1');
  });

  it('shows the wanted label when the user is interested', () => {
    render(<CallToActionCard cta={{ ...base, interested: true }} onToggleInterest={vi.fn()} />);
    expect(screen.getByText('wantedButton')).toBeInTheDocument();
  });

  it('shows launched badge and event link, hides the want button, when launched', () => {
    render(
      <CallToActionCard
        cta={{ ...base, eventId: 'e9', launchedAt: '2026-06-17T00:00:00.000Z' }}
        onToggleInterest={vi.fn()}
      />,
    );
    expect(screen.getByText('launchedBadge')).toBeInTheDocument();
    expect(screen.getByText('openEvent').closest('a')).toHaveAttribute('href', '/events/e9');
    expect(screen.queryByText('wantButton')).not.toBeInTheDocument();
  });

  it('shows a delete button only when canManage and onDelete are set', () => {
    const onDelete = vi.fn();
    render(<CallToActionCard cta={{ ...base, canManage: true }} onToggleInterest={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('deleteLabel'));
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('does not show a delete button when canManage is false', () => {
    render(<CallToActionCard cta={base} onToggleInterest={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByLabelText('deleteLabel')).not.toBeInTheDocument();
  });
});
