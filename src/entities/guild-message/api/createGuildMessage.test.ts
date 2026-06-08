import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGuildMessage, InvalidGuildMessageError } from './createGuildMessage';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('createGuildMessage', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(createGuildMessage('g1', 'hi')).rejects.toThrow('Not authenticated');
  });

  it('rejects empty body', async () => {
    useClient({ id: 'u1' }, vi.fn());
    await expect(createGuildMessage('g1', '   ')).rejects.toBeInstanceOf(InvalidGuildMessageError);
  });

  it('rejects body over 2000 chars', async () => {
    useClient({ id: 'u1' }, vi.fn());
    await expect(createGuildMessage('g1', 'a'.repeat(2001))).rejects.toBeInstanceOf(InvalidGuildMessageError);
  });

  it('inserts trimmed body and returns mapped message', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: {
      id: 'm1', guild_id: 'g1', user_id: 'u1', body: 'hi', created_at: 't', updated_at: 't', profiles: { full_name: 'Me', avatar_url: null },
    } }));
    useClient({ id: 'u1' }, from);

    const result = await createGuildMessage('g1', '  hi  ');
    expect(result.id).toBe('m1');
    expect(result.profile.fullName).toBe('Me');
  });
});
