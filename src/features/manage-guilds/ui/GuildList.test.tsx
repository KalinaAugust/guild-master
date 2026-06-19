import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GuildList } from './GuildList';
import type { Guild } from '@/entities/guild';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const guilds: Guild[] = [
  { id: '1', name: 'Alpha Guild', ownerId: 'user1' },
  { id: '2', name: 'Beta Guild', ownerId: 'user1', description: 'A great guild' },
];

describe('GuildList', () => {
  it('renders title and guild names', () => {
    render(
      <GuildList title="You are the owner" guilds={guilds} emptyMessage="No guilds" />
    );
    expect(screen.getByText('You are the owner')).toBeInTheDocument();
    expect(screen.getByText('Alpha Guild')).toBeInTheDocument();
    expect(screen.getByText('Beta Guild')).toBeInTheDocument();
  });

  it('renders description when present', () => {
    render(
      <GuildList title="Owner" guilds={guilds} emptyMessage="No guilds" />
    );
    expect(screen.getByText('A great guild')).toBeInTheDocument();
  });

  it('renders empty message when guild list is empty', () => {
    render(
      <GuildList title="Owner" guilds={[]} emptyMessage="No guilds yet" />
    );
    expect(screen.getByText('No guilds yet')).toBeInTheDocument();
  });

  it('renders the member count for a guild', () => {
    const withCount: Guild[] = [
      { id: '1', name: 'Alpha Guild', ownerId: 'user1', memberCount: 7, pendingRequestCount: 0 },
    ];
    render(<GuildList title="Owner" guilds={withCount} emptyMessage="No guilds" />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders a pending-request badge with a + prefix when requests exist', () => {
    const withPending: Guild[] = [
      { id: '1', name: 'Alpha Guild', ownerId: 'user1', memberCount: 3, pendingRequestCount: 2 },
    ];
    render(<GuildList title="Owner" guilds={withPending} emptyMessage="No guilds" />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('renders no pending-request badge when there are none', () => {
    const noPending: Guild[] = [
      { id: '1', name: 'Alpha Guild', ownerId: 'user1', memberCount: 3, pendingRequestCount: 0 },
    ];
    render(<GuildList title="Owner" guilds={noPending} emptyMessage="No guilds" />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });
});
