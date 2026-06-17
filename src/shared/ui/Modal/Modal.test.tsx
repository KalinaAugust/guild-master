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
    // Close button is the first button (SVG X)
    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders submit and cancel buttons when corresponding props are provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        submitText="Confirm"
        cancelText="Cancel"
      >
        content
      </Modal>
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onSubmit when submit button is clicked', () => {
    const onSubmit = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        submitText="Submit"
        onSubmit={onSubmit}
      >
        content
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        cancelText="Cancel"
        onCancel={onCancel}
      >
        content
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders custom footer actions when footerActions is provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        footerActions={<button>Custom Action</button>}
      >
        content
      </Modal>
    );
    expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
  });
});
