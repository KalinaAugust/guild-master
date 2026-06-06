import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentsTab } from './CommentsTab';
import {
  useGetCommentsQuery,
  useGetCommentReadStateQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useMarkCommentsReadMutation,
} from '@/entities/comment';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/entities/comment', () => ({
  useGetCommentsQuery: vi.fn(),
  useGetCommentReadStateQuery: vi.fn(),
  useAddCommentMutation: vi.fn(),
  useUpdateCommentMutation: vi.fn(),
  useDeleteCommentMutation: vi.fn(),
  useMarkCommentsReadMutation: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  const unwrap = () => ({ unwrap: () => Promise.resolve({}) });
  vi.mocked(useGetCommentReadStateQuery).mockReturnValue({ data: { lastReadAt: null } } as never);
  vi.mocked(useAddCommentMutation).mockReturnValue([vi.fn(unwrap), {}] as never);
  vi.mocked(useUpdateCommentMutation).mockReturnValue([vi.fn(unwrap), {}] as never);
  vi.mocked(useDeleteCommentMutation).mockReturnValue([vi.fn(unwrap), {}] as never);
  vi.mocked(useMarkCommentsReadMutation).mockReturnValue([vi.fn(), {}] as never);
});

describe('CommentsTab', () => {
  it('renders empty state when there are no comments', () => {
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite currentUserId="u1" />);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('renders the input when canWrite is true', () => {
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite currentUserId="u1" />);
    expect(screen.getByRole('button', { name: 'send' })).toBeInTheDocument();
  });

  it('renders the locked prompt when canWrite is false', () => {
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite={false} currentUserId="u1" />);
    expect(screen.getByText('lockedPrompt')).toBeInTheDocument();
  });

  it('marks comments read when there are unread comments from others', () => {
    const markRead = vi.fn();
    vi.mocked(useMarkCommentsReadMutation).mockReturnValue([markRead, {}] as never);
    vi.mocked(useGetCommentReadStateQuery).mockReturnValue({ data: { lastReadAt: null } } as never);
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [
      { id: 'c1', eventId: 'e1', userId: 'u2', body: 'Hi', createdAt: 't1', updatedAt: 't1', profile: { fullName: 'Bob', avatarUrl: null } },
    ], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite currentUserId="u1" />);
    expect(markRead).toHaveBeenCalledWith('e1');
  });

  it('does not mark read when everything is already read', () => {
    const markRead = vi.fn();
    vi.mocked(useMarkCommentsReadMutation).mockReturnValue([markRead, {}] as never);
    vi.mocked(useGetCommentReadStateQuery).mockReturnValue({ data: { lastReadAt: 't2' } } as never);
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [
      { id: 'c1', eventId: 'e1', userId: 'u2', body: 'Hi', createdAt: 't1', updatedAt: 't1', profile: { fullName: 'Bob', avatarUrl: null } },
    ], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite currentUserId="u1" />);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('does not mark read when the only comments are the viewer’s own', () => {
    const markRead = vi.fn();
    vi.mocked(useMarkCommentsReadMutation).mockReturnValue([markRead, {}] as never);
    vi.mocked(useGetCommentReadStateQuery).mockReturnValue({ data: { lastReadAt: null } } as never);
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [
      { id: 'c1', eventId: 'e1', userId: 'u1', body: 'Mine', createdAt: 't1', updatedAt: 't1', profile: { fullName: 'Me', avatarUrl: null } },
    ], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite currentUserId="u1" />);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('renders a list of comments', () => {
    vi.mocked(useGetCommentsQuery).mockReturnValue({ data: [
      { id: 'c1', eventId: 'e1', userId: 'u2', body: 'First!', createdAt: 't', updatedAt: 't', profile: { fullName: 'Bob', avatarUrl: null } },
    ], isLoading: false } as never);
    render(<CommentsTab eventId="e1" canWrite currentUserId="u1" />);
    expect(screen.getByText('First!')).toBeInTheDocument();
  });
});
