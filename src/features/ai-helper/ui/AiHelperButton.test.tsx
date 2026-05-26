import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiHelperButton } from './AiHelperButton';
import { useSendTestMessageMutation } from '../api/aiHelperApi';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockSendTestMessage = vi.fn();

type MockMutationHook = [typeof mockSendTestMessage, { isLoading: boolean }];

vi.mock('../api/aiHelperApi', () => ({
  useSendTestMessageMutation: vi.fn(() => [mockSendTestMessage, { isLoading: false }]),
}));

describe('AiHelperButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSendTestMessageMutation).mockReturnValue([mockSendTestMessage, { isLoading: false }] as unknown as MockMutationHook);
  });

  it('renders a button with aria-label "AI helper"', () => {
    render(<AiHelperButton />);
    expect(screen.getByRole('button', { name: /ai helper/i })).toBeInTheDocument();
  });

  it('calls sendTestMessage and shows success toast on click', async () => {
    const { toast } = await import('sonner');
    mockSendTestMessage.mockReturnValue({
      unwrap: () => Promise.resolve({ message: 'Hello from DeepSeek!' }),
    });

    render(<AiHelperButton />);
    fireEvent.click(screen.getByRole('button', { name: /ai helper/i }));

    await waitFor(() => {
      expect(mockSendTestMessage).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Hello from DeepSeek!');
    });
  });

  it('shows error toast when mutation rejects', async () => {
    const { toast } = await import('sonner');
    mockSendTestMessage.mockReturnValue({
      unwrap: () => Promise.reject(new Error('network error')),
    });

    render(<AiHelperButton />);
    fireEvent.click(screen.getByRole('button', { name: /ai helper/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('AI helper failed to respond');
    });
  });

  it('disables the button while loading', () => {
    vi.mocked(useSendTestMessageMutation).mockReturnValue([mockSendTestMessage, { isLoading: true }] as unknown as MockMutationHook);

    render(<AiHelperButton />);
    expect(screen.getByRole('button', { name: /ai helper/i })).toBeDisabled();
  });
});
