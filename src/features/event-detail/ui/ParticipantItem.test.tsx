import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';
import { ParticipantItem } from './ParticipantItem';
import { TooltipProvider } from '@/shared/ui/Tooltip';
import { EventParticipant } from '@/shared/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const render = (ui: ReactElement) => rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

const base: EventParticipant = {
  id: 'p1',
  event_id: 'e1',
  user_id: 'u1',
  status: 'pending',
  profile: { publicId: 'pubA', fullName: 'Alice Smith', avatarUrl: null, alias: null, displayAsAlias: false },
};

describe('ParticipantItem', () => {
  it('renders participant name', () => {
    render(<ParticipantItem participant={base} isCurrentUser={false} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('links the participant name to their public profile', () => {
    render(<ParticipantItem participant={base} isCurrentUser={false} />);
    expect(screen.getByText('Alice Smith').closest('a')).toHaveAttribute('href', '/profile/pubA');
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

  it('shows the leave button for current user who confirmed or declined', () => {
    const { rerender } = render(
      <ParticipantItem
        participant={{ ...base, status: 'confirmed' }}
        isCurrentUser={true}
        onLeave={vi.fn()}
      />
    );
    expect(screen.getByLabelText('leave')).toBeInTheDocument();

    rerender(
      <TooltipProvider>
        <ParticipantItem
          participant={{ ...base, status: 'declined' }}
          isCurrentUser={true}
          onLeave={vi.fn()}
        />
      </TooltipProvider>
    );
    expect(screen.getByLabelText('leave')).toBeInTheDocument();
  });

  it('does NOT show the leave button for pending status or other users', () => {
    const { rerender } = render(
      <ParticipantItem participant={base} isCurrentUser={true} onLeave={vi.fn()} />
    );
    expect(screen.queryByLabelText('leave')).not.toBeInTheDocument();

    rerender(
      <TooltipProvider>
        <ParticipantItem
          participant={{ ...base, status: 'confirmed' }}
          isCurrentUser={false}
          onLeave={vi.fn()}
        />
      </TooltipProvider>
    );
    expect(screen.queryByLabelText('leave')).not.toBeInTheDocument();
  });

  it('calls onLeave when the leave button clicked', async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn();
    render(
      <ParticipantItem
        participant={{ ...base, status: 'confirmed' }}
        isCurrentUser={true}
        onLeave={onLeave}
      />
    );
    await user.click(screen.getByLabelText('leave'));
    expect(onLeave).toHaveBeenCalledOnce();
  });
});
