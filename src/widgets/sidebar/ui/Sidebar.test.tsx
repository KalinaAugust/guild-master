import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePathname } from 'next/navigation';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('@/shared/lib/hooks', () => ({
  useAppSelector: () => null,
}));

vi.mock('@/entities/guild-message', () => ({
  useGetGuildChatUnreadQuery: () => ({ data: { hasUnread: false } }),
}));

vi.mock('@/entities/announcement', () => ({
  useGetAnnouncementsUnreadQuery: () => ({ data: { hasUnread: false } }),
}));

vi.mock('@/entities/call-to-action', () => ({
  useGetCallToActionsUnreadQuery: () => ({ data: { hasUnread: false } }),
}));

vi.mock('@/entities/guild', () => ({
  useGetGuildsQuery: vi.fn(() => ({ data: [] })),
}));

import { useGetGuildsQuery } from '@/entities/guild';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/');
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: [] } as never);
  });

  it('renders a nav item label for each configured item', () => {
    render(<Sidebar />);
    expect(screen.getByText('Guild.title')).toBeInTheDocument();
  });

  it('links the guilds item to /guilds', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /Guild.title/ })).toHaveAttribute('href', '/guilds');
  });

  it('marks the item active when the pathname matches its href', () => {
    vi.mocked(usePathname).mockReturnValue('/guilds');
    const { container } = render(<Sidebar />);
    expect(container.querySelector('a[class*="active"]')).not.toBeNull();
  });

  it('does not mark the item active on an unrelated pathname', () => {
    vi.mocked(usePathname).mockReturnValue('/profile');
    const { container } = render(<Sidebar />);
    expect(container.querySelector('a[class*="active"]')).toBeNull();
  });

  it('shows the unread dot on guilds when a guild has pending requests', () => {
    vi.mocked(useGetGuildsQuery).mockReturnValue({
      data: [{ id: 'g1', name: 'X', ownerId: 'u1', pendingRequestCount: 2 }],
    } as never);
    render(<Sidebar />);
    expect(screen.getByLabelText('unread')).toBeInTheDocument();
  });

  it('shows no unread dot when no guild has pending requests', () => {
    vi.mocked(useGetGuildsQuery).mockReturnValue({
      data: [{ id: 'g1', name: 'X', ownerId: 'u1', pendingRequestCount: 0 }],
    } as never);
    render(<Sidebar />);
    expect(screen.queryByLabelText('unread')).toBeNull();
  });
});
