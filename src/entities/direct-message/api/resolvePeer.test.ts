import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePeerId, PeerNotFoundError } from './resolvePeer';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

describe('resolvePeerId', () => {
  it('returns the uuid for a public_id', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: { id: 'u2' } }));
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as never);
    await expect(resolvePeerId('p2')).resolves.toBe('u2');
  });

  it('throws when not found', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: null }));
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as never);
    await expect(resolvePeerId('nope')).rejects.toBeInstanceOf(PeerNotFoundError);
  });
});
