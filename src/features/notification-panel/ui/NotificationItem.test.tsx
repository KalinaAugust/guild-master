import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/entities/notification';

const markAsRead = vi.fn();
vi.mock('@/entities/notification', () => ({
  useMarkAsReadMutation: () => [markAsRead],
  NOTIFICATION_TYPE_CONFIG: {
    join_request: {
      Icon: () => <span data-testid="icon" />,
      getLabel: () => 'Someone wants to join',
      linksToGuild: false,
    },
  },
}));
vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((k: string) => k, { rich: (k: string) => k }),
  useLocale: () => 'en',
}));

const base = {
  id: 'n1', type: 'join_request', entity_type: 'guild', entity_id: 'g1',
  is_read: false, created_at: new Date().toISOString(),
  guild_name: 'Alpha', event_title: null, event_date: null,
} as unknown as Notification;

beforeEach(() => vi.clearAllMocks());

describe('NotificationItem', () => {
  it('renders the label from the type config', () => {
    render(<NotificationItem notification={base} />);
    expect(screen.getByText('Someone wants to join')).toBeInTheDocument();
  });

  it('renders nothing for an unknown type', () => {
    const { container } = render(<NotificationItem notification={{ ...base, type: 'unknown' } as Notification} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marks as read on mouse enter when unread', () => {
    const { container } = render(<NotificationItem notification={base} />);
    fireEvent.mouseEnter(container.firstChild as Element);
    expect(markAsRead).toHaveBeenCalledWith('n1');
  });

  it('does not mark as read when already read', () => {
    const { container } = render(<NotificationItem notification={{ ...base, is_read: true }} />);
    fireEvent.mouseEnter(container.firstChild as Element);
    expect(markAsRead).not.toHaveBeenCalled();
  });

  it('links to the related guild', () => {
    const { container } = render(<NotificationItem notification={base} />);
    expect(container.querySelector('a[href="/guilds/g1"]')).toBeInTheDocument();
  });
});
