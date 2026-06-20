import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteDirectMessage } from './deleteDirectMessage';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

function makeClient(user: { id: string } | null, from: ReturnType<typeof vi.fn>, storageMock?: ReturnType<typeof vi.fn>) {
  const base = mockClient({ user, from });
  const client = {
    ...base,
    storage: { from: storageMock ?? vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue({}) }) },
  };
  vi.mocked(createClient).mockResolvedValue(client as never);
}

describe('deleteDirectMessage', () => {
  it('throws when not authenticated', async () => {
    makeClient(null, vi.fn());
    await expect(deleteDirectMessage('dm1')).rejects.toThrow('Not authenticated');
  });

  it('deletes the message and resolves void', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { attachment_url: null } }))   // select
      .mockReturnValueOnce(query({ data: null, error: null }));          // delete
    makeClient({ id: 'u1' }, from);

    await expect(deleteDirectMessage('dm1')).resolves.toBeUndefined();
  });

  it('removes attachment from storage when present', async () => {
    const removeMock = vi.fn().mockResolvedValue({});
    const storageMock = vi.fn().mockReturnValue({ remove: removeMock });
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { attachment_url: 'https://host/storage/v1/object/public/chat-attachments/u1/file.png' } }))
      .mockReturnValueOnce(query({ data: null, error: null }));
    makeClient({ id: 'u1' }, from, storageMock);

    await deleteDirectMessage('dm1');
    expect(storageMock).toHaveBeenCalledWith('chat-attachments');
    expect(removeMock).toHaveBeenCalledWith(['u1/file.png']);
  });
});
