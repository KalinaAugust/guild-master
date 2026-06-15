import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnouncementModal } from './AnnouncementModal';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/shared/ui/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, placeholder }: any) => (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid="rich-editor"
    />
  ),
}));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockCreateAnnouncement = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
const mockUpdateAnnouncement = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

vi.mock('@/entities/announcement', () => ({
  useCreateAnnouncementMutation: () => [mockCreateAnnouncement, { isLoading: false }],
  useUpdateAnnouncementMutation: () => [mockUpdateAnnouncement, { isLoading: false }],
}));

describe('AnnouncementModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create title and empty form by default', () => {
    render(
      <AnnouncementModal
        open={true}
        onClose={mockOnClose}
        guildId="g1"
      />
    );
    expect(screen.getByText('createTitle')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('titlePlaceholder')).toHaveValue('');
    expect(screen.getByTestId('rich-editor')).toHaveValue('');
    expect(screen.getByLabelText('pinLabel')).toBeInTheDocument();
  });

  it('renders edit title and prefilled values in edit mode', () => {
    const { rerender } = render(
      <AnnouncementModal
        open={false}
        onClose={mockOnClose}
        guildId="g1"
        editing={null}
      />
    );
    rerender(
      <AnnouncementModal
        open={true}
        onClose={mockOnClose}
        guildId="g1"
        editing={{
          id: 'a1',
          title: 'Old Title',
          content: 'Old Content',
        }}
      />
    );
    expect(screen.getByText('editTitle')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('titlePlaceholder')).toHaveValue('Old Title');
    expect(screen.getByTestId('rich-editor')).toHaveValue('Old Content');
    expect(screen.queryByLabelText('pinLabel')).not.toBeInTheDocument();
  });

  it('disables submit button when title or content is empty', () => {
    render(
      <AnnouncementModal
        open={true}
        onClose={mockOnClose}
        guildId="g1"
      />
    );
    const publishBtn = screen.getByRole('button', { name: 'publishButton' });
    expect(publishBtn).toBeDisabled();

    // Fill only title
    fireEvent.change(screen.getByPlaceholderText('titlePlaceholder'), { target: { value: 'Hi' } });
    expect(publishBtn).toBeDisabled();

    // Fill content
    fireEvent.change(screen.getByTestId('rich-editor'), { target: { value: 'Hello world' } });
    expect(publishBtn).not.toBeDisabled();
  });

  it('calls createAnnouncement mutation with inputs on form submit', async () => {
    render(
      <AnnouncementModal
        open={true}
        onClose={mockOnClose}
        guildId="g1"
      />
    );
    fireEvent.change(screen.getByPlaceholderText('titlePlaceholder'), { target: { value: 'New Announcement' } });
    fireEvent.change(screen.getByTestId('rich-editor'), { target: { value: 'My body content' } });
    
    // Toggle pin switch
    const pinSwitch = screen.getByLabelText('pinLabel');
    fireEvent.click(pinSwitch);

    const publishBtn = screen.getByRole('button', { name: 'publishButton' });
    fireEvent.click(publishBtn);

    expect(mockCreateAnnouncement).toHaveBeenCalledWith({
      guildId: 'g1',
      input: {
        title: 'New Announcement',
        content: 'My body content',
        isPinned: true,
      },
    });
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });

  it('calls updateAnnouncement mutation with inputs in edit mode on form submit', async () => {
    const { rerender } = render(
      <AnnouncementModal
        open={false}
        onClose={mockOnClose}
        guildId="g1"
        editing={null}
      />
    );
    rerender(
      <AnnouncementModal
        open={true}
        onClose={mockOnClose}
        guildId="g1"
        editing={{
          id: 'a1',
          title: 'Old Title',
          content: 'Old Content',
        }}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('titlePlaceholder'), { target: { value: 'Updated Title' } });
    fireEvent.change(screen.getByTestId('rich-editor'), { target: { value: 'Updated Content' } });

    const saveBtn = screen.getByRole('button', { name: 'saveButton' });
    fireEvent.click(saveBtn);

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith({
      guildId: 'g1',
      announcementId: 'a1',
      input: {
        title: 'Updated Title',
        content: 'Updated Content',
      },
    });
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });
});
