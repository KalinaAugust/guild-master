import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiHelperModal, Message } from './AiHelperModal';
import { useSendAiMessageMutation } from '../api/aiHelperApi';

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
  useSendAiMessageMutation: vi.fn(() => [mockSendMessage, { isLoading: false }]),
}));

type MockMutationHook = [typeof mockSendMessage, { isLoading: boolean }];

const ModalWrapper = ({ isOpen = true, onClose = vi.fn() }: { isOpen?: boolean; onClose?: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  return <AiHelperModal isOpen={isOpen} onClose={onClose} messages={messages} setMessages={setMessages} />;
};

const renderModal = (props: { isOpen?: boolean; onClose?: () => void } = {}) =>
  render(<ModalWrapper {...props} />);

describe('AiHelperModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSendAiMessageMutation).mockReturnValue(
      [mockSendMessage, { isLoading: false }] as unknown as MockMutationHook
    );
  });

  it('renders nothing when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders modal with textarea and send button when open', () => {
    renderModal();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('placeholder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'send' })).toBeInTheDocument();
  });

  it('disables send button when textarea is empty', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'send' })).toBeDisabled();
  });

  it('sends messages and guildId on submit', async () => {
    mockSendMessage.mockReturnValue({
      unwrap: () => Promise.resolve({ message: 'Hi!', eventCreated: false }),
    });

    renderModal();
    fireEvent.change(screen.getByPlaceholderText('placeholder'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    expect(mockSendMessage).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'Hello' }],
      guildId: 'guild-123',
    });
  });

  it('includes conversation history in subsequent messages', async () => {
    mockSendMessage
      .mockReturnValueOnce({
        unwrap: () => Promise.resolve({ message: 'First reply', eventCreated: false }),
      })
      .mockReturnValueOnce({
        unwrap: () => Promise.resolve({ message: 'Second reply', eventCreated: false }),
      });

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('placeholder'), { target: { value: 'First message' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    await waitFor(() => expect(screen.getByText('First reply')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('placeholder'), { target: { value: 'Second message' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    await waitFor(() => expect(screen.getByText('Second reply')).toBeInTheDocument());

    expect(mockSendMessage).toHaveBeenNthCalledWith(2, {
      messages: [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First reply' },
        { role: 'user', content: 'Second message' },
      ],
      guildId: 'guild-123',
    });
  });

  it('invalidates Event cache when eventCreated is true', async () => {
    mockSendMessage.mockReturnValue({
      unwrap: () => Promise.resolve({ message: 'Event created!', eventCreated: true }),
    });

    renderModal();
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

    renderModal();
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

    renderModal();
    const textarea = screen.getByPlaceholderText('placeholder');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('shows error message in chat on failure', async () => {
    mockSendMessage.mockReturnValue({
      unwrap: () => Promise.reject(new Error('fail')),
    });

    renderModal();
    fireEvent.change(screen.getByPlaceholderText('placeholder'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('shows thinking bubble while loading', () => {
    vi.mocked(useSendAiMessageMutation).mockReturnValue(
      [mockSendMessage, { isLoading: true }] as unknown as MockMutationHook
    );

    renderModal();
    expect(screen.getByText('thinking')).toBeInTheDocument();
  });
});
