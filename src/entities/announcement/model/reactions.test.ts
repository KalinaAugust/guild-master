import { describe, it, expect } from 'vitest';
import { applyOptimisticReaction } from './reactions';
import type { Announcement } from './types';

const make = (): Announcement => ({
  id: 'a1', guildId: 'g1', createdBy: 'u1', title: 't', content: 'c',
  isPinned: false, createdAt: 'now', updatedAt: 'now',
  author: { publicId: null, fullName: null, avatarUrl: null, alias: null, displayAsAlias: false, icon: null },
  reactions: [
    { type: 'like', count: 2, reacted: false },
    { type: 'heart', count: 1, reacted: true },
  ],
  commentCount: 0, canManage: false,
});

describe('applyOptimisticReaction', () => {
  it('adds a reaction when not yet reacted', () => {
    const a = make();
    applyOptimisticReaction(a, 'like');
    expect(a.reactions.find((r) => r.type === 'like')).toMatchObject({ count: 3, reacted: true });
  });

  it('removes a reaction when already reacted', () => {
    const a = make();
    applyOptimisticReaction(a, 'heart');
    expect(a.reactions.find((r) => r.type === 'heart')).toMatchObject({ count: 0, reacted: false });
  });

  it('does nothing for an unknown type bucket', () => {
    const a = make();
    a.reactions = [{ type: 'like', count: 0, reacted: false }];
    applyOptimisticReaction(a, 'poop');
    expect(a.reactions).toHaveLength(1);
  });
});
