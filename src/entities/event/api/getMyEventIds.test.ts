import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMyEventIds } from './getMyEventIds';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

describe('getMyEventIds', () => {
  it('returns an empty array when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: null }) as unknown as SupabaseClient);
    await expect(getMyEventIds('g1')).resolves.toEqual({ eventIds: [], pendingEventIds: [] });
  });

  it('returns the event ids the user participates in', async () => {
    const from = vi.fn().mockReturnValue(query({ data: [{ event_id: 'e1', status: 'confirmed' }, { event_id: 'e2', status: 'pending' }], error: null }));
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as unknown as SupabaseClient);
    await expect(getMyEventIds('g1')).resolves.toEqual({ eventIds: ['e1', 'e2'], pendingEventIds: ['e2'] });
  });
});
