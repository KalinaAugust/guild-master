import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnouncementCard } from './AnnouncementCard';
import type { Announcement } from '@/entities/announcement';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: any) => {
    if (key === 'commentsCount') return params?.count === 1 ? '1 comment' : `${params?.count || 0} comments`;
    return key;
  },
  useLocale: () => 'en',
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/shared/ui/ProfileLink', () => ({
  ProfileLink: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockSetPinned = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
const mockDeleteAnnouncement = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
const mockToggleReaction = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

vi.mock('@/entities/announcement', () => ({
  useSetAnnouncementPinnedMutation: () => [mockSetPinned, { isLoading: false }],
  useDeleteAnnouncementMutation: () => [mockDeleteAnnouncement, { isLoading: false }],
  useGetAnnouncementCommentsQuery: vi.fn().mockReturnValue({ data: [] }),
  useToggleReactionMutation: () => [mockToggleReaction, { isLoading: false }],
  useAddAnnouncementCommentMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteAnnouncementCommentMutation: () => [vi.fn(), { isLoading: false }],
}));

const mockAnnouncement: Announcement = {
  id: 'a1',
  guildId: 'g1',
  createdBy: 'u1',
  title: 'Important Update',
  content: 'We have migrated to a new server!',
  isPinned: false,
  createdAt: '2026-06-16T00:00:00.000Z',
  updatedAt: '2026-06-16T00:00:00.000Z',
  author: {
    publicId: 'author-id',
    fullName: 'Guild Leader',
    avatarUrl: null,
    alias: 'Leader',
    displayAsAlias: false,
    icon: 'crown',
  },
  reactions: [
    { type: 'like', count: 2, reacted: false },
    { type: 'heart', count: 1, reacted: true },
  ],
  commentCount: 3,
  canManage: true,
};

describe('AnnouncementCard', () => {
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and markdown content', () => {
    render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        guildId="g1"
        userId="me"
        onEdit={mockOnEdit}
      />
    );
    expect(screen.getByText('Important Update')).toBeInTheDocument();
    expect(screen.getByText('We have migrated to a new server!')).toBeInTheDocument();
  });

  it('renders author display name and role icon', () => {
    render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        guildId="g1"
        userId="me"
        onEdit={mockOnEdit}
      />
    );
    expect(screen.getByText('Guild Leader')).toBeInTheDocument();
  });

  it('shows action buttons when canManage is true', () => {
    render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        guildId="g1"
        userId="me"
        onEdit={mockOnEdit}
      />
    );
    expect(screen.getByLabelText('pin')).toBeInTheDocument();
    expect(screen.getByLabelText('editLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('deleteLabel')).toBeInTheDocument();
  });

  it('hides action buttons when canManage is false', () => {
    render(
      <AnnouncementCard
        announcement={{ ...mockAnnouncement, canManage: false }}
        guildId="g1"
        userId="me"
        onEdit={mockOnEdit}
      />
    );
    expect(screen.queryByLabelText('pin')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('editLabel')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('deleteLabel')).not.toBeInTheDocument();
  });

  it('calls setPinned when pin button is clicked', async () => {
    render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        guildId="g1"
        userId="me"
        onEdit={mockOnEdit}
      />
    );
    const pinBtn = screen.getByLabelText('pin');
    fireEvent.click(pinBtn);
    expect(mockSetPinned).toHaveBeenCalledWith({
      guildId: 'g1',
      announcementId: 'a1',
      isPinned: true,
    });
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        guildId="g1"
        userId="me"
        onEdit={mockOnEdit}
      />
    );
    const editBtn = screen.getByLabelText('editLabel');
    fireEvent.click(editBtn);
    expect(mockOnEdit).toHaveBeenCalledWith(mockAnnouncement);
  });

  it('shows comment count and toggles comments section on click', () => {
    render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        guildId="g1"
        userId="me"
        onEdit={mockOnEdit}
      />
    );
    const toggleBtn = screen.getByRole('button', { name: /3 comments/i });
    expect(toggleBtn).toBeInTheDocument();

    // Comments should be closed by default
    expect(screen.queryByPlaceholderText('commentPlaceholder')).not.toBeInTheDocument();

    // Click to open comments
    fireEvent.click(toggleBtn);
    expect(screen.getByPlaceholderText('commentPlaceholder')).toBeInTheDocument();
  });
});
