import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GuildList } from './GuildList';
import type { Guild } from '@/entities/guild';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

const guilds: Guild[] = [
  { id: '1', name: 'Alpha Guild', ownerId: 'user1' },
  { id: '2', name: 'Beta Guild', ownerId: 'user1', description: 'A great guild' },
];

describe('GuildList', () => {
  it('renders title and guild names', () => {
    render(
      <GuildList title="You are the owner" guilds={guilds} onEdit={vi.fn()} emptyMessage="No guilds" />
    );
    expect(screen.getByText('You are the owner')).toBeInTheDocument();
    expect(screen.getByText('Alpha Guild')).toBeInTheDocument();
    expect(screen.getByText('Beta Guild')).toBeInTheDocument();
  });

  it('renders description when present', () => {
    render(
      <GuildList title="Owner" guilds={guilds} onEdit={vi.fn()} emptyMessage="No guilds" />
    );
    expect(screen.getByText('A great guild')).toBeInTheDocument();
  });

  it('renders empty message when guild list is empty', () => {
    render(
      <GuildList title="Owner" guilds={[]} onEdit={vi.fn()} emptyMessage="No guilds yet" />
    );
    expect(screen.getByText('No guilds yet')).toBeInTheDocument();
  });

  it('calls onEdit with the correct guild when edit button clicked', () => {
    const onEdit = vi.fn();
    render(
      <GuildList title="Owner" guilds={guilds} onEdit={onEdit} emptyMessage="No guilds" />
    );
    const editButtons = screen.getAllByRole('button', { name: 'editLabel' });
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(guilds[0]);
  });
});
