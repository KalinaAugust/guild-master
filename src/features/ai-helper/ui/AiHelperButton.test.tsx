import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AiHelperButton } from './AiHelperButton';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/lib/hooks', () => ({
  useAppSelector: () => 'guild-1',
}));

const mockPermissions = { canCreateEvents: true, canEditEvents: true };
vi.mock('@/entities/guild', () => ({
  useGuildPermissions: () => mockPermissions,
}));

vi.mock('./AiHelperModal', () => ({
  AiHelperModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="ai-modal">
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

describe('AiHelperButton', () => {
  it('renders a button with aria-label "AI helper"', () => {
    render(<AiHelperButton userId="user-1" />);
    expect(screen.getByRole('button', { name: /ai helper/i })).toBeInTheDocument();
  });

  it('modal is closed initially', () => {
    render(<AiHelperButton userId="user-1" />);
    expect(screen.queryByTestId('ai-modal')).not.toBeInTheDocument();
  });

  it('opens modal on button click', () => {
    render(<AiHelperButton userId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: /ai helper/i }));
    expect(screen.getByTestId('ai-modal')).toBeInTheDocument();
  });

  it('closes modal when onClose is called', () => {
    render(<AiHelperButton userId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: /ai helper/i }));
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByTestId('ai-modal')).not.toBeInTheDocument();
  });

  it('renders nothing when the user can neither create nor edit events', () => {
    mockPermissions.canCreateEvents = false;
    mockPermissions.canEditEvents = false;
    render(<AiHelperButton userId="user-1" />);
    expect(screen.queryByRole('button', { name: /ai helper/i })).not.toBeInTheDocument();
    mockPermissions.canCreateEvents = true;
    mockPermissions.canEditEvents = true;
  });
});
