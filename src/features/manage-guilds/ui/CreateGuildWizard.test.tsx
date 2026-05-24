import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateGuildWizard } from './CreateGuildWizard';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockUnwrap = vi.fn().mockResolvedValue({ id: 'new-guild-id', name: 'My Guild', ownerId: 'u1' });
const mockCreateGuild = vi.fn().mockReturnValue({ unwrap: mockUnwrap });

vi.mock('@/entities/guild', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/guild')>();
  return {
    ...actual,
    useCreateGuildMutation: () => [mockCreateGuild, { isLoading: false }],
  };
});

describe('CreateGuildWizard', () => {
  it('does not render dialog when closed', () => {
    render(<CreateGuildWizard open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with form when open', () => {
    render(<CreateGuildWizard open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('nameLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('descriptionLabel')).toBeInTheDocument();
  });

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    render(<CreateGuildWizard open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls createGuild mutation on form submit', async () => {
    render(<CreateGuildWizard open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('nameLabel'), { target: { value: 'My Guild' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
    await waitFor(() =>
      expect(mockCreateGuild).toHaveBeenCalledWith({ name: 'My Guild', description: '' })
    );
  });
});
