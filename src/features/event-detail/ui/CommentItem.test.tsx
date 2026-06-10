import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CommentItem } from './CommentItem';
import type { EventComment } from '@/entities/comment';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const base: EventComment = {
  id: 'c1', eventId: 'e1', userId: 'u1', body: 'Hello there',
  createdAt: '2026-06-05T10:00:00Z', updatedAt: '2026-06-05T10:00:00Z',
  profile: { publicId: 'pubA', fullName: 'Alice', avatarUrl: null },
};

describe('CommentItem', () => {
  it('renders body and author', () => {
    render(<CommentItem comment={base} isOwn={false} />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('links the author name to their public profile', () => {
    render(<CommentItem comment={base} isOwn={false} />);
    expect(screen.getByText('Alice').closest('a')).toHaveAttribute('href', '/profile/pubA');
  });

  it('shows edited marker when updatedAt is later than createdAt', () => {
    render(<CommentItem comment={{ ...base, updatedAt: '2026-06-05T12:00:00Z' }} isOwn={false} />);
    expect(screen.getByText('edited')).toBeInTheDocument();
  });

  it('hides edit/delete for non-owners', () => {
    render(<CommentItem comment={base} isOwn={false} />);
    expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'delete' })).not.toBeInTheDocument();
  });

  it('shows edit/delete for owner and enters edit mode', async () => {
    const user = userEvent.setup();
    render(<CommentItem comment={base} isOwn onSave={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'edit' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'edit' }));
    expect(screen.getByText('save')).toBeInTheDocument();
  });

  it('calls onSave with edited text', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CommentItem comment={base} isOwn onSave={onSave} onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'edit' }));
    const field = screen.getByRole('textbox');
    await user.clear(field);
    await user.type(field, 'Updated');
    await user.click(screen.getByText('save'));
    expect(onSave).toHaveBeenCalledWith('Updated');
  });
});
