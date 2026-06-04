import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationPanel } from './NotificationPanel';
import type { Notification } from '@/entities/notification';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('./NotificationItem', () => ({
  NotificationItem: ({ notification }: { notification: Notification }) =>
    <div data-testid="notification-item">{notification.id}</div>,
}));

const notif = (id: string, is_read = false) =>
  ({ id, is_read, type: 'join_request', entity_type: 'guild', entity_id: 'g1' }) as Notification;

describe('NotificationPanel', () => {
  it('shows the empty state when there are no notifications', () => {
    render(<NotificationPanel notifications={[]} />);
    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.queryByTestId('notification-item')).not.toBeInTheDocument();
  });

  it('renders one item per notification', () => {
    render(<NotificationPanel notifications={[notif('n1'), notif('n2')]} />);
    expect(screen.getAllByTestId('notification-item')).toHaveLength(2);
  });

  it('shows "mark all read" only when there are unread items and a handler', () => {
    const onMarkAllRead = vi.fn();
    render(<NotificationPanel notifications={[notif('n1', false)]} onMarkAllRead={onMarkAllRead} />);
    fireEvent.click(screen.getByText('markAllRead'));
    expect(onMarkAllRead).toHaveBeenCalledOnce();
  });

  it('hides "mark all read" when everything is read', () => {
    render(<NotificationPanel notifications={[notif('n1', true)]} onMarkAllRead={vi.fn()} />);
    expect(screen.queryByText('markAllRead')).not.toBeInTheDocument();
  });
});
