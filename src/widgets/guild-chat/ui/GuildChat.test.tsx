import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildChat } from './GuildChat';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const mockAdd = vi.fn();
vi.mock('@/entities/guild-message', () => ({
  useGetGuildMessagesQuery: () => ({ data: [], isLoading: false }),
  useGetGuildChatReadStateQuery: () => ({ data: { lastReadAt: null } }),
  useAddGuildMessageMutation: () => [mockAdd, { isLoading: false }],
  useUpdateGuildMessageMutation: () => [vi.fn(), {}],
  useDeleteGuildMessageMutation: () => [vi.fn(), {}],
  useMarkGuildChatReadMutation: () => [vi.fn()],
}));

vi.mock('@/features/select-guild', () => ({
  useGuildSelection: () => ({ activeGuildId: 'g1', guildOptions: [], handleGuildChange: vi.fn() }),
  GuildSelect: () => <div data-testid="guild-select" />,
}));

vi.mock('@/entities/poll', () => ({
  useGetGuildPollsQuery: () => ({ data: [] }),
}));

vi.mock('@/features/guild-poll', () => ({
  PollCard: () => <div data-testid="poll-card" />,
  PollWizard: () => <div data-testid="poll-wizard" />,
}));

const guilds = [{ id: 'g1', name: 'Test', avatarUrl: null }] as never;

beforeEach(() => vi.clearAllMocks());

describe('GuildChat', () => {
  it('renders the guild select and empty state', () => {
    render(<GuildChat guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.getByTestId('guild-select')).toBeInTheDocument();
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('renders the composer placeholder for a member', () => {
    render(<GuildChat guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.getByPlaceholderText('placeholder')).toBeInTheDocument();
  });
});
