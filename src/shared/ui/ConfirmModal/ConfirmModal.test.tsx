import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmModal } from './ConfirmModal';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('../Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
    isOpen ? <div role="dialog"><h2>{title}</h2>{children}</div> : null,
}));

describe('ConfirmModal', () => {
  const base = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete item?',
  };

  beforeEach(() => vi.clearAllMocks());

  it('renders title', () => {
    render(<ConfirmModal {...base} />);
    expect(screen.getByText('Delete item?')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<ConfirmModal {...base} description="This cannot be undone." />);
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('does not render description paragraph when absent', () => {
    const { container } = render(<ConfirmModal {...base} />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('calls onConfirm and onClose when confirm button clicked', () => {
    render(<ConfirmModal {...base} confirmLabel="Yes, delete" />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(base.onConfirm).toHaveBeenCalledOnce();
    expect(base.onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when cancel button clicked', () => {
    render(<ConfirmModal {...base} cancelLabel="No" />);
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(base.onClose).toHaveBeenCalledOnce();
    expect(base.onConfirm).not.toHaveBeenCalled();
  });

  it('uses translation keys as default button labels', () => {
    render(<ConfirmModal {...base} />);
    expect(screen.getByRole('button', { name: 'cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'confirm' })).toBeInTheDocument();
  });

  it('renders nothing when isOpen is false', () => {
    render(<ConfirmModal {...base} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies loading states and does not call onClose when isLoading is true', async () => {
    render(<ConfirmModal {...base} isLoading={true} confirmLabel="Yes" cancelLabel="No" />);
    
    const cancelButton = screen.getByRole('button', { name: 'No' });
    const confirmButton = screen.getByRole('button', { name: 'Yes' });
    
    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
    
    fireEvent.click(confirmButton);
    expect(base.onConfirm).not.toHaveBeenCalled();
    expect(base.onClose).not.toHaveBeenCalled();
  });
});

