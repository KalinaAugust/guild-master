import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PendingInvitesList } from './PendingInvitesList';
import { acceptInvite, rejectInvite } from '@/entities/guild/api/invites';
import { toast } from 'sonner';

// Mock the API calls
vi.mock('@/entities/guild/api/invites', () => ({
  acceptInvite: vi.fn(),
  rejectInvite: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock react-redux
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
}));

// Mock guildApi
vi.mock('@/entities/guild/api/guildApi', () => ({
  guildApi: {
    util: {
      invalidateTags: vi.fn(),
    },
  },
}));

const mockInvites = [
  {
    id: '1',
    name: 'Test Guild',
    description: 'A test guild',
    memberCount: 5,
    ownerId: 'user1',
    avatarUrl: null,
  },
];

describe('PendingInvitesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing if invites list is empty', () => {
    const { container } = render(<PendingInvitesList invites={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders invites correctly', () => {
    render(<PendingInvitesList invites={mockInvites} />);
    expect(screen.getByText('pendingInvitesTitle')).toBeInTheDocument();
    expect(screen.getByText('Test Guild')).toBeInTheDocument();
    expect(screen.getByText('A test guild')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'reject' })).toBeInTheDocument();
  });

  it('calls acceptInvite when accept is clicked and shows success toast', async () => {
    vi.mocked(acceptInvite).mockResolvedValue({ data: null });
    
    render(<PendingInvitesList invites={mockInvites} />);
    const acceptBtn = screen.getByRole('button', { name: 'accept' });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(acceptInvite).toHaveBeenCalledWith('1');
      expect(toast.success).toHaveBeenCalledWith('inviteAccepted');
    });
  });

  it('calls rejectInvite when reject is clicked and shows success toast', async () => {
    vi.mocked(rejectInvite).mockResolvedValue({ data: null });
    
    render(<PendingInvitesList invites={mockInvites} />);
    const rejectBtn = screen.getByRole('button', { name: 'reject' });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(rejectInvite).toHaveBeenCalledWith('1');
      expect(toast.success).toHaveBeenCalledWith('inviteRejected');
    });
  });

  it('shows error toast if acceptInvite fails', async () => {
    vi.mocked(acceptInvite).mockResolvedValue({ error: 'Network error' });
    
    render(<PendingInvitesList invites={mockInvites} />);
    const acceptBtn = screen.getByRole('button', { name: 'accept' });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(acceptInvite).toHaveBeenCalledWith('1');
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
  });

  it('shows error toast if rejectInvite fails', async () => {
    vi.mocked(rejectInvite).mockResolvedValue({ error: 'Failed to reject' });
    
    render(<PendingInvitesList invites={mockInvites} />);
    const rejectBtn = screen.getByRole('button', { name: 'reject' });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(rejectInvite).toHaveBeenCalledWith('1');
      expect(toast.error).toHaveBeenCalledWith('Failed to reject');
    });
  });
});
