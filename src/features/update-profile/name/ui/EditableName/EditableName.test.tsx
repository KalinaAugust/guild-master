import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditableName } from './EditableName';
import { updateFullName } from '@/entities/user';

vi.mock('@/entities/user', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/entities/user')>();
  return {
    ...original,
    updateFullName: vi.fn(),
  };
});
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('EditableName', () => {
  it('shows the placeholder when there is no name', () => {
    render(<EditableName initialFullName={null} userId="u1" />);
    expect(screen.getByText('Add your name')).toBeInTheDocument();
  });

  it('enters edit mode on the edit button', () => {
    render(<EditableName initialFullName="Alice" userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('disables Save while the value is unchanged', () => {
    render(<EditableName initialFullName="Alice" userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves the trimmed name and exits edit mode', async () => {
    vi.mocked(updateFullName).mockResolvedValue(undefined as never);
    render(<EditableName initialFullName="Alice" userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: '  Bob  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateFullName).toHaveBeenCalledWith('u1', 'Bob'));
    expect(refresh).toHaveBeenCalled();
  });

  it('shows an error toast when the update fails', async () => {
    const { toast } = await import('sonner');
    vi.mocked(updateFullName).mockRejectedValue(new Error('boom'));
    render(<EditableName initialFullName="Alice" userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to update name'));
  });

  it('reverts the value on cancel', () => {
    render(<EditableName initialFullName="Alice" userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
