import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ParticipantItem } from './ParticipantItem';
import { EventParticipant } from '@/shared/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const base: EventParticipant = {
  id: 'p1',
  event_id: 'e1',
  user_id: 'u1',
  status: 'pending',
  profile: { fullName: 'Alice Smith', avatarUrl: null },
};

describe('ParticipantItem', () => {
  it('renders participant name', () => {
    render(<ParticipantItem participant={base} isCurrentUser={false} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('shows status label', () => {
    render(<ParticipantItem participant={{ ...base, status: 'confirmed' }} isCurrentUser={false} />);
    expect(screen.getByText('status.confirmed')).toBeInTheDocument();
  });

  it('does NOT show confirm/decline buttons for other users', () => {
    render(<ParticipantItem participant={base} isCurrentUser={false} />);
    expect(screen.queryByText('confirmBtn')).not.toBeInTheDocument();
    expect(screen.queryByText('declineBtn')).not.toBeInTheDocument();
  });

  it('shows confirm/decline buttons for current user with pending status', () => {
    render(
      <ParticipantItem
        participant={base}
        isCurrentUser={true}
        onConfirm={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText('confirmBtn')).toBeInTheDocument();
    expect(screen.getByText('declineBtn')).toBeInTheDocument();
  });

  it('does NOT show confirm/decline for current user who already confirmed', () => {
    render(
      <ParticipantItem
        participant={{ ...base, status: 'confirmed' }}
        isCurrentUser={true}
      />
    );
    expect(screen.queryByText('confirmBtn')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ParticipantItem
        participant={base}
        isCurrentUser={true}
        onConfirm={onConfirm}
        onDecline={vi.fn()}
      />
    );
    await user.click(screen.getByText('confirmBtn'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onDecline when decline button clicked', async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn();
    render(
      <ParticipantItem
        participant={base}
        isCurrentUser={true}
        onConfirm={vi.fn()}
        onDecline={onDecline}
      />
    );
    await user.click(screen.getByText('declineBtn'));
    expect(onDecline).toHaveBeenCalledOnce();
  });
});
