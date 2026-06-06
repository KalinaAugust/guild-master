import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CommentInput } from './CommentInput';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('CommentInput', () => {
  it('shows the locked prompt when canWrite is false', () => {
    render(<CommentInput canWrite={false} onSubmit={vi.fn()} />);
    expect(screen.getByText('lockedPrompt')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders an input and send button when canWrite is true', () => {
    render(<CommentInput canWrite onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'send' })).toBeInTheDocument();
  });

  it('calls onSubmit with trimmed text and clears the field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentInput canWrite onSubmit={onSubmit} />);
    const field = screen.getByRole('textbox');
    await user.type(field, '  hello  ');
    fireEvent.submit(field.closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith('hello');
    expect(field).toHaveValue('');
  });

  it('does not submit when field is empty', () => {
    const onSubmit = vi.fn();
    render(<CommentInput canWrite onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
