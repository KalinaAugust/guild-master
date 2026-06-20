import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateDirectMessage } from './updateDirectMessage';
import { InvalidDirectMessageError } from './createDirectMessage';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('updateDirectMessage', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(updateDirectMessage('dm1', 'hi')).rejects.toThrow('Not authenticated');
  });

  it('rejects empty body', async () => {
    useClient({ id: 'u1' }, vi.fn());
    await expect(updateDirectMessage('dm1', '   ')).rejects.toBeInstanceOf(InvalidDirectMessageError);
  });

  it('rejects body over 2000 chars', async () => {
    useClient({ id: 'u1' }, vi.fn());
    await expect(updateDirectMessage('dm1', 'a'.repeat(2001))).rejects.toBeInstanceOf(InvalidDirectMessageError);
  });

  it('updates body and returns mapped message', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: {
      id: 'dm1', sender_id: 'u1', recipient_id: 'p1', body: 'updated', attachment_url: null,
      created_at: 't', updated_at: 't2',
      sender: { public_id: 'pub1', full_name: 'Me', avatar_url: null, alias: null, display_as_alias: false, icon: null },
    } }));
    useClient({ id: 'u1' }, from);

    const result = await updateDirectMessage('dm1', '  updated  ');
    expect(result.id).toBe('dm1');
    expect(result.body).toBe('updated');
    expect(result.senderProfile.fullName).toBe('Me');
  });
});
