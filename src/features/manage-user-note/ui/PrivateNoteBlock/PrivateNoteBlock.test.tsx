import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrivateNoteBlock } from './PrivateNoteBlock';
import {
  useGetUserNotesQuery,
  useUpdateUserNoteMutation,
  useDeleteUserNoteMutation,
} from '@/entities/user';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      title: 'Private Note',
      successMessage: 'Note updated',
      errorMessage: 'Failed to update note',
      emptyText: 'Add a private note about this user...',
      inputPlaceholder: 'Only you can see this note...',
    };
    return messages[key] || key;
  },
}));

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/entities/user', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/entities/user')>();
  return {
    ...original,
    useGetUserNotesQuery: vi.fn(),
    useUpdateUserNoteMutation: vi.fn(),
    useDeleteUserNoteMutation: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PrivateNoteBlock', () => {
  it('renders correctly with existing note', () => {
    vi.mocked(useGetUserNotesQuery).mockReturnValue({
      data: [{ target_user_id: 'target-1', note: 'Existing note text', target_public_id: 'pub1' }],
      isLoading: false,
    } as never);
    vi.mocked(useUpdateUserNoteMutation).mockReturnValue([vi.fn(), {}] as never);
    vi.mocked(useDeleteUserNoteMutation).mockReturnValue([vi.fn(), {}] as never);

    render(<PrivateNoteBlock targetUserId="target-1" />);

    expect(screen.getByText('Private Note')).toBeInTheDocument();
    expect(screen.getByText('Existing note text')).toBeInTheDocument();
  });

  it('renders emptyText when note does not exist', () => {
    vi.mocked(useGetUserNotesQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useUpdateUserNoteMutation).mockReturnValue([vi.fn(), {}] as never);
    vi.mocked(useDeleteUserNoteMutation).mockReturnValue([vi.fn(), {}] as never);

    render(<PrivateNoteBlock targetUserId="target-1" />);

    expect(screen.getByText('Add a private note about this user...')).toBeInTheDocument();
  });

  it('calls update mutation when note is saved with non-empty value', async () => {
    const mockUpdate = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    vi.mocked(useGetUserNotesQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useUpdateUserNoteMutation).mockReturnValue([mockUpdate, {}] as never);
    vi.mocked(useDeleteUserNoteMutation).mockReturnValue([vi.fn(), {}] as never);

    render(<PrivateNoteBlock targetUserId="target-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit note' }));
    fireEvent.change(screen.getByPlaceholderText('Only you can see this note...'), {
      target: { value: 'New note text' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        targetUserId: 'target-1',
        note: 'New note text',
      })
    );
  });

  it('calls delete mutation when note is saved with empty value', async () => {
    const mockDelete = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    vi.mocked(useGetUserNotesQuery).mockReturnValue({
      data: [{ target_user_id: 'target-1', note: 'Existing note text', target_public_id: 'pub1' }],
      isLoading: false,
    } as never);
    vi.mocked(useUpdateUserNoteMutation).mockReturnValue([vi.fn(), {}] as never);
    vi.mocked(useDeleteUserNoteMutation).mockReturnValue([mockDelete, {}] as never);

    render(<PrivateNoteBlock targetUserId="target-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit note' }));
    fireEvent.change(screen.getByPlaceholderText('Only you can see this note...'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('target-1'));
  });
});
