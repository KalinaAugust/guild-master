import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildChat } from './GuildChat';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const mockAdd = vi.fn();
vi.mock('@/entities/guild-message', () => ({
  guildMessageApi: { util: { updateQueryData: vi.fn() } },
  useGetGuildMessagesQuery: () => ({ data: { messages: [], hasMore: false }, isLoading: false }),
  useLazyFetchOlderMessagesQuery: () => [vi.fn(), { isFetching: false }],
  useLazyFetchNewMessagesQuery: () => [vi.fn()],
  useGetGuildChatReadStateQuery: () => ({ data: { lastReadAt: null } }),
  useAddGuildMessageMutation: () => [mockAdd, { isLoading: false }],
  useUpdateGuildMessageMutation: () => [vi.fn(), {}],
  useDeleteGuildMessageMutation: () => [vi.fn(), {}],
  useMarkGuildChatReadMutation: () => [vi.fn()],
}));

vi.mock('@/shared/lib/hooks', () => ({ useAppDispatch: () => vi.fn() }));

// Realtime client stub: a chainable channel and the auth/socket surface the
// subscription effect touches.
vi.mock('@/shared/api/supabase/client', () => {
  const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };
  return {
    createClient: () => ({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
      realtime: { setAuth: vi.fn() },
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    }),
  };
});

vi.mock('@/features/select-guild', () => ({
  useGuildSelection: () => ({ activeGuildId: 'g1', guildOptions: [], handleGuildChange: vi.fn() }),
  GuildSelect: () => <div data-testid="guild-select" />,
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

  it('does not render any poll UI', () => {
    render(<GuildChat guilds={guilds} userId="u1" initialGuildId="g1" />);
    expect(screen.queryByText('newPoll')).not.toBeInTheDocument();
  });
});
