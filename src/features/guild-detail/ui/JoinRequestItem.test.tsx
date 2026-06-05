import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { JoinRequestItem } from './JoinRequestItem';
import type { JoinRequest } from '@/entities/guild';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const request: JoinRequest = {
  id: 'r1',
  userId: 'u1',
  userName: 'Alice Smith',
  avatarUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('JoinRequestItem', () => {
  it('renders user name', () => {
    render(<JoinRequestItem request={request} onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('shows fallback initial when no avatarUrl', () => {
    render(<JoinRequestItem request={request} onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('renders avatar image when avatarUrl is provided', () => {
    const { container } = render(
      <JoinRequestItem
        request={{ ...request, avatarUrl: 'https://example.com/avatar.png' }}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.src).toBe('https://example.com/avatar.png');
  });

  it('calls onAccept when accept button is clicked', () => {
    const onAccept = vi.fn();
    render(<JoinRequestItem request={request} onAccept={onAccept} onDecline={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'accept' }));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it('calls onDecline when decline button is clicked', () => {
    const onDecline = vi.fn();
    render(<JoinRequestItem request={request} onAccept={vi.fn()} onDecline={onDecline} />);
    fireEvent.click(screen.getByRole('button', { name: 'decline' }));
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it('shows dash when userName is null', () => {
    render(<JoinRequestItem request={{ ...request, userName: null }} onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('disables buttons when disabled prop is true', () => {
    render(
      <JoinRequestItem
        request={request}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        disabled={true}
        isAccepting={true}
      />
    );
    const acceptBtn = screen.getByRole('button', { name: 'accept' });
    const declineBtn = screen.getByRole('button', { name: 'decline' });

    expect(acceptBtn).toBeDisabled();
    expect(declineBtn).toBeDisabled();
  });
});

