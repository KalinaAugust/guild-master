import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CopyLinkButton } from './CopyLinkButton';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Tooltip (TooltipProvider is usually needed to avoid errors, or we can just mock Tooltip to render children)
vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('CopyLinkButton Component', () => {
  const originalClipboard = navigator.clipboard;
  const writeTextMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    writeTextMock.mockResolvedValue(undefined);
    
    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
        writable: true,
      });
    } else {
      // @ts-expect-error cleanup
      delete navigator.clipboard;
    }
  });

  it('renders correctly', () => {
    render(<CopyLinkButton />);
    expect(screen.getByRole('button', { name: 'copyLink' })).toBeInTheDocument();
  });

  it('copies window.location.href when link prop is not provided', async () => {
    render(<CopyLinkButton />);
    const button = screen.getByRole('button', { name: 'copyLink' });
    fireEvent.click(button);
    
    // We might need to wait for async
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(window.location.href);
      expect(toast.success).toHaveBeenCalledWith('linkCopied');
    });
  });

  it('copies the provided link prop', async () => {
    const customLink = 'https://example.com/custom';
    render(<CopyLinkButton link={customLink} />);
    
    const button = screen.getByRole('button', { name: 'copyLink' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(customLink);
      expect(toast.success).toHaveBeenCalledWith('linkCopied');
    });
  });

  it('shows error toast if copy fails', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('Copy failed'));

    render(<CopyLinkButton />);
    const button = screen.getByRole('button', { name: 'copyLink' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('copyError');
    });
  });

  it('prevents default and stops propagation on click', async () => {
    const handleWrapperClick = vi.fn();

    render(
      <div onClick={handleWrapperClick}>
        <CopyLinkButton />
      </div>
    );
    
    const button = screen.getByRole('button', { name: 'copyLink' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(handleWrapperClick).not.toHaveBeenCalled();
      expect(writeTextMock).toHaveBeenCalled();
    });
  });
});
