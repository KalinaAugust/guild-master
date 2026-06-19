import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipProvider } from '@/shared/ui/Tooltip';
import { GuildAnnouncements } from './GuildAnnouncements';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/features/select-guild', () => ({
  useGuildSelection: () => ({ activeGuildId: 'g1', guildOptions: [], handleGuildChange: vi.fn() }),
  GuildSelect: () => <div data-testid="guild-select" />,
}));

vi.mock('@/entities/announcement', () => ({
  useGetGuildAnnouncementsQuery: () => ({ data: { announcements: [], canCreate: true }, isLoading: false }),
  useMarkAnnouncementsReadMutation: () => [vi.fn()],
}));

vi.mock('@/features/guild-announcement', () => ({
  AnnouncementCard: () => <div data-testid="announcement-card" />,
  AnnouncementModal: () => <div data-testid="announcement-modal" />,
}));

vi.mock('@/entities/poll', () => ({
  useGetGuildPollsQuery: () => ({ data: [{ id: 'p1' }], isLoading: false }),
}));

vi.mock('@/features/guild-poll', () => ({
  PollCard: () => <div data-testid="poll-card" />,
  PollWizard: () => <div data-testid="poll-wizard" />,
}));

const guilds = [{ id: 'g1', name: 'Test', avatarUrl: null }] as never;

beforeEach(() => vi.clearAllMocks());

describe('GuildAnnouncements', () => {
  it('renders the New poll button and poll cards in the right column', () => {
    render(
      <TooltipProvider>
        <GuildAnnouncements guilds={guilds} userId="u1" initialGuildId="g1" />
      </TooltipProvider>,
    );
    expect(screen.getByRole('button', { name: 'newPoll' })).toBeInTheDocument();
    expect(screen.getByTestId('poll-card')).toBeInTheDocument();
  });
});
