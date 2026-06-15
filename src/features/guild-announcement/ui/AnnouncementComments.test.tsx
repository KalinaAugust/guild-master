import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnouncementComments } from './AnnouncementComments';
import type { AnnouncementComment } from '@/entities/announcement';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/shared/ui/ProfileLink', () => ({
  ProfileLink: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/MessageComposer', () => ({
  MessageComposer: ({ onSubmit, placeholder }: any) => (
    <div>
      <input
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSubmit((e.target as HTMLInputElement).value);
          }
        }}
      />
    </div>
  ),
}));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockAddComment = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
const mockDeleteComment = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
const mockCommentsData: AnnouncementComment[] = [
  {
    id: 'c1',
    announcementId: 'a1',
    userId: 'u1',
    body: 'Nice post!',
    createdAt: '2026-06-16T01:00:00.000Z',
    canDelete: true,
    profile: {
      publicId: 'p1',
      fullName: 'John Doe',
      avatarUrl: null,
      alias: 'John',
      displayAsAlias: false,
      icon: null,
    },
  },
  {
    id: 'c2',
    announcementId: 'a1',
    userId: 'u2',
    body: 'Thanks for info',
    createdAt: '2026-06-16T01:05:00.000Z',
    canDelete: false,
    profile: {
      publicId: 'p2',
      fullName: 'Jane Smith',
      avatarUrl: null,
      alias: 'Jane',
      displayAsAlias: true,
      icon: null,
    },
  },
];

let mockIsLoading = false;

vi.mock('@/entities/announcement', () => ({
  useGetAnnouncementCommentsQuery: () => ({
    data: mockCommentsData,
    isLoading: mockIsLoading,
  }),
  useAddAnnouncementCommentMutation: () => [mockAddComment, { isLoading: false }],
  useDeleteAnnouncementCommentMutation: () => [mockDeleteComment, { isLoading: false }],
}));

describe('AnnouncementComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
  });

  it('renders loading spinner when loading', () => {
    mockIsLoading = true;
    render(
      <AnnouncementComments
        guildId="g1"
        announcementId="a1"
        userId="me"
      />
    );
    expect(screen.getByLabelText('commentsLoading')).toBeInTheDocument();
  });

  it('renders comments list', () => {
    render(
      <AnnouncementComments
        guildId="g1"
        announcementId="a1"
        userId="me"
      />
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Nice post!')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument(); // displays alias because displayAsAlias is true
    expect(screen.getByText('Thanks for info')).toBeInTheDocument();
  });

  it('shows delete button only for comments that can be deleted', () => {
    render(
      <AnnouncementComments
        guildId="g1"
        announcementId="a1"
        userId="me"
      />
    );
    const deleteButtons = screen.getAllByRole('button', { name: 'deleteComment' });
    expect(deleteButtons).toHaveLength(1); // Only for c1
  });

  it('calls deleteComment mutation when delete button is clicked', () => {
    render(
      <AnnouncementComments
        guildId="g1"
        announcementId="a1"
        userId="me"
      />
    );
    const deleteBtn = screen.getByRole('button', { name: 'deleteComment' });
    fireEvent.click(deleteBtn);
    expect(mockDeleteComment).toHaveBeenCalledWith({
      guildId: 'g1',
      announcementId: 'a1',
      commentId: 'c1',
    });
  });

  it('calls addComment mutation when composer is submitted', () => {
    render(
      <AnnouncementComments
        guildId="g1"
        announcementId="a1"
        userId="me"
        viewerProfile={{
          publicId: 'me-id',
          fullName: 'Me Name',
          avatarUrl: null,
          alias: null,
          displayAsAlias: false,
          icon: null,
        }}
      />
    );
    const input = screen.getByPlaceholderText('commentPlaceholder');
    fireEvent.change(input, { target: { value: 'New Comment' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockAddComment).toHaveBeenCalledWith({
      guildId: 'g1',
      announcementId: 'a1',
      body: 'New Comment',
      author: {
        userId: 'me',
        profile: {
          publicId: 'me-id',
          fullName: 'Me Name',
          avatarUrl: null,
          alias: null,
          displayAsAlias: false,
          icon: null,
        },
      },
    });
  });
});
