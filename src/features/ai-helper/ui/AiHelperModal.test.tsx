import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiHelperModal } from './AiHelperModal';
import { useSendTestMessageMutation } from '../api/aiHelperApi';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/shared/ui/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
    isOpen ? <div data-testid="modal"><h2>{title}</h2>{children}</div> : null,
}));

vi.mock('./CatSearchIllustration', () => ({
  CatSearchIllustration: () => <div data-testid="cat-illustration" />,
}));

const mockDispatch = vi.fn();
vi.mock('@/shared/lib/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: { guild: { currentGuildId: string } }) => string) =>
    selector({ guild: { currentGuildId: 'guild-123' } }),
}));

vi.mock('@/shared/api/baseApi', () => ({
  baseApi: {
    util: { invalidateTags: vi.fn(() => ({ type: 'invalidateTags' })) },
  },
}));

const mockSendMessage = vi.fn();

vi.mock('../api/aiHelperApi', () => ({
  useSendTestMessageMutation: vi.fn(() => [mockSendMessage, { isLoading: false }]),
}));

type MockMutationHook = [typeof mockSendMessage, { isLoading: boolean }];

describe('AiHelperModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSendTestMessageMutation).mockReturnValue(
      [mockSendMessage, { isLoading: false }] as unknown as MockMutationHook
    );
  });

  it('renders nothing when isOpen is false', () => {
    render(<AiHelperModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders modal with textarea and send button when open', () => {
    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('placeholder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'send' })).toBeInTheDocument();
  });

  it('disables send button when textarea is empty', () => {
    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'send' })).toBeDisabled();
  });

  it('sends messages and guildId on submit', async () => {
    mockSendMessage.mockReturnValue({
      unwrap: () => Promise.resolve({ message: 'Hi!', eventCreated: false }),
    });

    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('placeholder'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    expect(mockSendMessage).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'Hello' }],
      guildId: 'guild-123',
    });
  });

  it('invalidates Event cache when eventCreated is true', async () => {
    mockSendMessage.mockReturnValue({
      unwrap: () => Promise.resolve({ message: 'Event created!', eventCreated: true }),
    });

    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('placeholder'), { target: { value: 'Create event' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'invalidateTags' });
    });
  });

  it('does not invalidate cache when eventCreated is false', async () => {
    mockSendMessage.mockReturnValue({
      unwrap: () => Promise.resolve({ message: 'Sure!', eventCreated: false }),
    });

    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('placeholder'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    await waitFor(() => {
      expect(screen.getByText('Sure!')).toBeInTheDocument();
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('clears input after sending', async () => {
    mockSendMessage.mockReturnValue({
      unwrap: () => Promise.resolve({ message: 'ok', eventCreated: false }),
    });

    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    const textarea = screen.getByPlaceholderText('placeholder');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('shows error message in chat on failure', async () => {
    mockSendMessage.mockReturnValue({
      unwrap: () => Promise.reject(new Error('fail')),
    });

    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('placeholder'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('shows thinking bubble while loading', () => {
    vi.mocked(useSendTestMessageMutation).mockReturnValue(
      [mockSendMessage, { isLoading: true }] as unknown as MockMutationHook
    );

    render(<AiHelperModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('thinking')).toBeInTheDocument();
  });
});
