import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnouncementModal } from './AnnouncementModal';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock the Tiptap-based editor with a plain textarea so the modal's form logic
// (validation, submit, edit vs create) can be tested in isolation.
vi.mock('@/shared/ui/RichTextEditor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (md: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="content"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const createAnnouncement = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const updateAnnouncement = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
vi.mock('@/entities/announcement', () => ({
  useCreateAnnouncementMutation: () => [createAnnouncement, { isLoading: false }],
  useUpdateAnnouncementMutation: () => [updateAnnouncement, { isLoading: false }],
}));

describe('AnnouncementModal', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseProps = { open: true, onClose: vi.fn(), guildId: 'g1' };

  it('shows the create title and a disabled publish button when empty', () => {
    render(<AnnouncementModal {...baseProps} />);
    expect(screen.getByText('createTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'publishButton' })).toBeDisabled();
  });

  it('enables publish once title and content are filled and submits the input', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AnnouncementModal {...baseProps} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('titlePlaceholder'), 'News');
    await user.type(screen.getByLabelText('content'), 'Body text');

    const publish = screen.getByRole('button', { name: 'publishButton' });
    expect(publish).toBeEnabled();

    fireEvent.submit(publish.closest('form')!);

    expect(createAnnouncement).toHaveBeenCalledWith({
      guildId: 'g1',
      input: { title: 'News', content: 'Body text', isPinned: false },
    });
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('edits an existing announcement: edit title, save button, no pin toggle', () => {
    // The modal loads the edited values on the closed -> open transition, so mount
    // closed first and then open it (its render-phase "adjust on prop change").
    const { rerender } = render(
      <AnnouncementModal {...baseProps} open={false} editing={{ id: 'a1', title: 'Old', content: 'Old body' }} />,
    );
    rerender(
      <AnnouncementModal {...baseProps} open editing={{ id: 'a1', title: 'Old', content: 'Old body' }} />,
    );

    expect(screen.getByText('editTitle')).toBeInTheDocument();
    // Pin toggle is creation-only.
    expect(screen.queryByText('pinLabel')).not.toBeInTheDocument();

    const save = screen.getByRole('button', { name: 'saveButton' });
    fireEvent.submit(save.closest('form')!);

    expect(updateAnnouncement).toHaveBeenCalledWith({
      guildId: 'g1',
      announcementId: 'a1',
      input: { title: 'Old', content: 'Old body' },
    });
  });
});
