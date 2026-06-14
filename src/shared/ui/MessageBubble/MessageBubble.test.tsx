import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MessageBubble } from './MessageBubble';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const labels = { edited: 'edited', edit: 'edit', delete: 'delete', confirmDelete: 'confirm-delete' };
const base = {
  authorName: 'Alice', avatarUrl: null, body: 'Hello there',
  createdAt: '2026-06-05T10:00:00Z', updatedAt: '2026-06-05T10:00:00Z',
  locale: 'en', labels,
};

describe('MessageBubble', () => {
  it('renders body and author', () => {
    render(<MessageBubble {...base} isOwn={false} />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows edited marker when updatedAt is later', () => {
    render(<MessageBubble {...base} updatedAt="2026-06-05T12:00:00Z" isOwn={false} />);
    expect(screen.getByText('edited')).toBeInTheDocument();
  });

  it('hides edit/delete for non-owners', () => {
    render(<MessageBubble {...base} isOwn={false} />);
    expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
  });

  it('requests edit when the edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<MessageBubble {...base} isOwn onEdit={onEdit} onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'edit' }));
    expect(onEdit).toHaveBeenCalled();
  });
});
