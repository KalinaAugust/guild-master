import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EventForm } from './EventForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
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

  it('does not call onSubmit when title is empty', () => {
    const onSubmit = vi.fn();
    render(<EventForm {...baseProps} onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with form data when all required fields are valid', () => {
    const onSubmit = vi.fn();
    render(
      <EventForm
        {...baseProps}
        onSubmit={onSubmit}
        initialData={{ date: '2026-06-01', time: '19:00', type: 'game', description: '' }}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('titlePlaceholder'), { target: { value: 'Raid Night' } });
    const form = screen.getByRole('button', { name: 'Submit' }).closest('form')!;
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Raid Night', date: '2026-06-01' })
    );
  });

  it('shows title error when submitting empty title', () => {
    render(<EventForm {...baseProps} initialData={{ date: '2026-06-01', time: '20:00', type: 'game', description: '' }} />);
    const form = screen.getByRole('button', { name: 'Submit' }).closest('form')!;
    fireEvent.submit(form);
    expect(screen.getByText('validation.titleRequired')).toBeInTheDocument();
  });

  it('hides date input in isDayView mode (not edit)', () => {
    render(<EventForm {...baseProps} isDayView={true} isEdit={false} />);
    expect(screen.queryByRole('button', { name: 'openCalendar' })).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<EventForm {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('pre-fills form with initialData', () => {
    render(<EventForm {...baseProps} initialData={{ title: 'Pre-filled', date: '2026-06-01', time: '18:00', type: 'game', description: 'Desc' }} />);
    expect(screen.getByDisplayValue('Pre-filled')).toBeInTheDocument();
  });
});
