import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EventForm } from './EventForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const baseProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  submitLabel: 'Submit',
};

describe('EventForm', () => {
  it('renders submit and cancel buttons by default', () => {
    render(<EventForm {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cancel' })).toBeInTheDocument();
  });

  it('hides action buttons when hideActions is true', () => {
    render(<EventForm {...baseProps} hideActions />);
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'cancel' })).not.toBeInTheDocument();
  });

  it('sets form id when formId prop is provided', () => {
    render(<EventForm {...baseProps} formId="test-form" />);
    expect(document.getElementById('test-form')).toBeInTheDocument();
  });
});
