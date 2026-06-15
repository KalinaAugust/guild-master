import { describe, it, expect } from 'vitest';
import { buildAnnouncement, type AnnouncementRow } from './mapAnnouncementRow';

const row: AnnouncementRow = {
  id: 'a1', guild_id: 'g1', created_by: 'u1', title: 'Title', content: '**hi**',
  is_pinned: true, created_at: 't0', updated_at: 't1',
  profiles: { public_id: 'p1', full_name: 'Neo', avatar_url: null, alias: null, display_as_alias: false, icon: null },
  announcement_reactions: [
    { type: 'like', user_id: 'u2' },
    { type: 'like', user_id: 'me' },
    { type: 'heart', user_id: 'u2' },
  ],
  announcement_comments: [{ id: 'c1' }, { id: 'c2' }],
};

describe('buildAnnouncement', () => {
  it('maps fields, aggregates reactions and marks the viewer reaction', () => {
    const a = buildAnnouncement(row, 'me', true);
    expect(a).toMatchObject({ id: 'a1', title: 'Title', isPinned: true, commentCount: 2, canManage: true });
    expect(a.author.fullName).toBe('Neo');
    expect(a.reactions.find((r) => r.type === 'like')).toMatchObject({ count: 2, reacted: true });
    expect(a.reactions.find((r) => r.type === 'heart')).toMatchObject({ count: 1, reacted: false });
    expect(a.reactions.find((r) => r.type === 'poop')).toMatchObject({ count: 0, reacted: false });
    expect(a.reactions).toHaveLength(5);
  });

  it('marks no reaction for anonymous viewer', () => {
    const a = buildAnnouncement(row, null, false);
    expect(a.reactions.every((r) => !r.reacted)).toBe(true);
    expect(a.canManage).toBe(false);
  });
});
