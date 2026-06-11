import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EventJoinRequestItem } from './EventJoinRequestItem';
import type { EventJoinRequest } from '../api/detailApi';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const request: EventJoinRequest = {
  id: 'r1', userId: 'u1', publicId: 'pubA', userName: 'Alice Smith', avatarUrl: null, icon: null,
} as EventJoinRequest;

describe('EventJoinRequestItem', () => {
  it('renders the user name', () => {
    render(<EventJoinRequestItem request={request} onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('links the user name to their public profile', () => {
    render(<EventJoinRequestItem request={request} onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText('Alice Smith').closest('a')).toHaveAttribute('href', '/profile/pubA');
  });

  it('shows a dash when userName is null', () => {
    render(<EventJoinRequestItem request={{ ...request, userName: null }} onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('calls onAccept and onDecline on click', () => {
    const onAccept = vi.fn(); const onDecline = vi.fn();
    render(<EventJoinRequestItem request={request} onAccept={onAccept} onDecline={onDecline} />);
    fireEvent.click(screen.getByRole('button', { name: 'acceptRequest' }));
    fireEvent.click(screen.getByRole('button', { name: 'declineRequest' }));
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it('disables both buttons when disabled and not loading', () => {
    render(<EventJoinRequestItem request={request} onAccept={vi.fn()} onDecline={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'acceptRequest' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'declineRequest' })).toBeDisabled();
  });
});
