import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateAvatar } from './updateAvatar';
import { createClient } from '@/shared/api/supabase/client';

vi.mock('@/shared/api/supabase/client', () => ({
  createClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

function makeSupabase({
  uploadError = null,
  updateError = null,
  publicUrl = 'https://example.com/avatar.png',
  files = [] as { name: string }[],
} = {}) {
  const removeFn = vi.fn().mockResolvedValue({});
  const listFn = vi.fn().mockResolvedValue({ data: files });
  const getPublicUrlFn = vi.fn().mockReturnValue({ data: { publicUrl } });
  const uploadFn = vi.fn().mockResolvedValue({ error: uploadError });
  const eqFn = vi.fn().mockResolvedValue({ error: updateError });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });

  return {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: uploadFn,
        getPublicUrl: getPublicUrlFn,
        list: listFn,
        remove: removeFn,
      }),
    },
    from: vi.fn().mockReturnValue({ update: updateFn }),
    _upload: uploadFn,
    _update: updateFn,
    _eq: eqFn,
    _remove: removeFn,
    _list: listFn,
  };
}

describe('updateAvatar', () => {
  it('uploads, updates profile and returns publicUrl', async () => {
    const mock = makeSupabase();
    vi.mocked(createClient).mockReturnValue(mock as never);

    const result = await updateAvatar('u1', new Blob(['img']));
    expect(result).toBe('https://example.com/avatar.png');
    expect(mock._upload).toHaveBeenCalled();
    expect(mock._eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('throws when upload fails', async () => {
    const mock = makeSupabase({ uploadError: new Error('upload fail') });
    vi.mocked(createClient).mockReturnValue(mock as never);

    await expect(updateAvatar('u1', new Blob(['img']))).rejects.toThrow('upload fail');
  });

  it('rolls back (removes uploaded file) when profile update fails', async () => {
    const mock = makeSupabase({ updateError: new Error('update fail') });
    vi.mocked(createClient).mockReturnValue(mock as never);

    await expect(updateAvatar('u1', new Blob(['img']))).rejects.toThrow('update fail');
    expect(mock._remove).toHaveBeenCalled();
  });

  it('cleans up old avatars after successful update', async () => {
    const mock = makeSupabase({ files: [{ name: 'old-avatar.png' }] });
    vi.mocked(createClient).mockReturnValue(mock as never);

    await updateAvatar('u1', new Blob(['img']));
    expect(mock._list).toHaveBeenCalledWith('u1');
    expect(mock._remove).toHaveBeenCalled();
  });
});
