import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    render(<Modal isOpen={false} onClose={vi.fn()}>content</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders children when isOpen is true', () => {
    render(<Modal isOpen={true} onClose={vi.fn()}>Hello Modal</Modal>);
    expect(screen.getByText('Hello Modal')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} title="My Title">content</Modal>);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('does not render title element when title is omitted', () => {
    render(<Modal isOpen={true} onClose={vi.fn()}>content</Modal>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="T">content</Modal>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
