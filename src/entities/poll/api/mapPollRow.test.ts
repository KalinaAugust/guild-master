import { describe, it, expect } from 'vitest';
import { buildPoll, type PollRow } from './mapPollRow';

const baseRow = (overrides: Partial<PollRow> = {}): PollRow => ({
  id: 'p1',
  guild_id: 'g1',
  created_by: 'author',
  title: 'Best night?',
  description: null,
  is_anonymous: false,
  allow_multiple: false,
  allow_custom: false,
  allow_revote: false,
  closed_at: null,
  created_at: '2026-06-01T00:00:00Z',
  poll_options: [
    { id: 'o2', body: 'B', position: 1, is_custom: false, created_at: '2026-06-01T00:00:01Z' },
    { id: 'o1', body: 'A', position: 0, is_custom: false, created_at: '2026-06-01T00:00:00Z' },
  ],
  poll_votes: [
    { option_id: 'o1', user_id: 'u1', created_at: '2026-06-01T10:00:00Z', profiles: { full_name: 'One', avatar_url: null } },
    { option_id: 'o1', user_id: 'u2', created_at: '2026-06-01T10:01:00Z', profiles: { full_name: 'Two', avatar_url: null } },
    { option_id: 'o2', user_id: 'u1', created_at: '2026-06-01T10:02:00Z', profiles: { full_name: 'One', avatar_url: null } },
  ],
  ...overrides,
});

describe('buildPoll', () => {
  it('sorts options by position and counts votes', () => {
    const poll = buildPoll(baseRow(), 'u3', false);
    expect(poll.options.map((o) => o.id)).toEqual(['o1', 'o2']);
    expect(poll.options[0].voteCount).toBe(2);
    expect(poll.options[1].voteCount).toBe(1);
  });

  it('counts distinct voters as totalVotes', () => {
    expect(buildPoll(baseRow(), 'u3', false).totalVotes).toBe(2); // u1, u2
  });

  it('derives the current user vote option ids', () => {
    expect(buildPoll(baseRow(), 'u1', false).myVoteOptionIds.sort()).toEqual(['o1', 'o2']);
  });

  it('exposes voter profiles for non-anonymous polls', () => {
    const poll = buildPoll(baseRow(), 'u3', false);
    expect(poll.options[0].voters).toHaveLength(2);
    expect(poll.options[0].voters[0].fullName).toBe('One');
  });

  it('hides voter profiles for anonymous polls but keeps counts', () => {
    const poll = buildPoll(baseRow({ is_anonymous: true }), 'u3', false);
    expect(poll.options[0].voteCount).toBe(2);
    expect(poll.options[0].voters).toEqual([]);
  });

  it('passes through canManage', () => {
    expect(buildPoll(baseRow(), 'u3', true).canManage).toBe(true);
  });
});
