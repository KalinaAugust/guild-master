import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CallToActionBoard } from './CallToActionBoard';
import type { Guild } from '@/entities/guild';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/shared/ui/Panel', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/select-guild', () => ({
  useGuildSelection: () => ({
    activeGuildId: 'g1',
    guildOptions: [{ label: 'Guild', value: 'g1' }],
    handleGuildChange: vi.fn(),
  }),
  GuildSelect: () => <div data-testid="guild-select" />,
}));

vi.mock('@/features/call-to-action', () => ({
  CreateCallToActionModal: () => <div data-testid="cta-modal" />,
}));

const mockGetQuery = vi.fn();
vi.mock('@/entities/call-to-action', () => ({
  CallToActionCard: ({ cta }: { cta: { title: string } }) => <div>{cta.title}</div>,
  useGetCallToActionsQuery: (...args: unknown[]) => mockGetQuery(...args),
  useMarkCallToActionsReadMutation: () => [vi.fn(), { isLoading: false }],
  useToggleCallToActionInterestMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteCallToActionMutation: () => [vi.fn(), { isLoading: false }],
}));

const guilds: Guild[] = [{ id: 'g1', name: 'Guild', ownerId: 'o1' }];

describe('CallToActionBoard', () => {
  it('shows the new action button and empty state when the viewer can create', () => {
    mockGetQuery.mockReturnValue({ data: { callToActions: [], canCreate: true }, isLoading: false });
    render(<CallToActionBoard guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.getByText('newAction')).toBeInTheDocument();
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('hides the new action button when the viewer cannot create', () => {
    mockGetQuery.mockReturnValue({ data: { callToActions: [], canCreate: false }, isLoading: false });
    render(<CallToActionBoard guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.queryByText('newAction')).not.toBeInTheDocument();
  });

  it('renders a card per call to action', () => {
    mockGetQuery.mockReturnValue({
      data: {
        callToActions: [{ id: 'c1', title: 'Mythic Raid' }],
        canCreate: true,
      },
      isLoading: false,
    });
    render(<CallToActionBoard guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.getByText('Mythic Raid')).toBeInTheDocument();
  });
});
