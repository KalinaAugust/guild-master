import { describe, it, expect } from 'vitest';
import { applyOptimisticVote, applyOptimisticVotes } from './applyVote';
import type { Poll } from './types';

const makePoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  guildId: 'g1',
  createdBy: 'author',
  title: 'T',
  description: null,
  isAnonymous: false,
  allowMultiple: false,
  allowCustom: false,
  allowRevote: false,
  closedAt: null,
  createdAt: '2026-06-01',
  options: [
    { id: 'o1', body: 'A', isCustom: false, voteCount: 0, voters: [] },
    { id: 'o2', body: 'B', isCustom: false, voteCount: 0, voters: [] },
  ],
  myVoteOptionIds: [],
  totalVotes: 0,
  canManage: false,
  ...overrides,
});

const count = (poll: Poll, id: string) => poll.options.find((o) => o.id === id)!.voteCount;

describe('applyOptimisticVote', () => {
  it('adds a first vote and increments totals', () => {
    const poll = makePoll();
    applyOptimisticVote(poll, 'o1');
    expect(poll.myVoteOptionIds).toEqual(['o1']);
    expect(count(poll, 'o1')).toBe(1);
    expect(poll.totalVotes).toBe(1);
  });

  it('toggles the same vote off', () => {
    const poll = makePoll({ myVoteOptionIds: ['o1'], totalVotes: 1, options: [
      { id: 'o1', body: 'A', isCustom: false, voteCount: 1, voters: [] },
      { id: 'o2', body: 'B', isCustom: false, voteCount: 0, voters: [] },
    ] });
    applyOptimisticVote(poll, 'o1');
    expect(poll.myVoteOptionIds).toEqual([]);
    expect(count(poll, 'o1')).toBe(0);
    expect(poll.totalVotes).toBe(0);
  });

  it('single-choice replaces the previous vote without changing the voter total', () => {
    const poll = makePoll({ myVoteOptionIds: ['o1'], totalVotes: 1, options: [
      { id: 'o1', body: 'A', isCustom: false, voteCount: 1, voters: [] },
      { id: 'o2', body: 'B', isCustom: false, voteCount: 0, voters: [] },
    ] });
    applyOptimisticVote(poll, 'o2');
    expect(poll.myVoteOptionIds).toEqual(['o2']);
    expect(count(poll, 'o1')).toBe(0);
    expect(count(poll, 'o2')).toBe(1);
    expect(poll.totalVotes).toBe(1);
  });

  it('multiple-choice keeps existing votes and adds another', () => {
    const poll = makePoll({ allowMultiple: true, myVoteOptionIds: ['o1'], totalVotes: 1, options: [
      { id: 'o1', body: 'A', isCustom: false, voteCount: 1, voters: [] },
      { id: 'o2', body: 'B', isCustom: false, voteCount: 0, voters: [] },
    ] });
    applyOptimisticVote(poll, 'o2');
    expect(poll.myVoteOptionIds.sort()).toEqual(['o1', 'o2']);
    expect(count(poll, 'o1')).toBe(1);
    expect(count(poll, 'o2')).toBe(1);
    expect(poll.totalVotes).toBe(1);
  });
});

describe('applyOptimisticVotes', () => {
  it('applies a full selection at once and counts the voter once', () => {
    const poll = makePoll({ allowMultiple: true });
    applyOptimisticVotes(poll, ['o1', 'o2']);
    expect(poll.myVoteOptionIds.sort()).toEqual(['o1', 'o2']);
    expect(count(poll, 'o1')).toBe(1);
    expect(count(poll, 'o2')).toBe(1);
    expect(poll.totalVotes).toBe(1);
  });

  it('replaces an existing selection, adjusting only changed options', () => {
    const poll = makePoll({ allowMultiple: true, myVoteOptionIds: ['o1'], totalVotes: 1, options: [
      { id: 'o1', body: 'A', isCustom: false, voteCount: 1, voters: [] },
      { id: 'o2', body: 'B', isCustom: false, voteCount: 0, voters: [] },
    ] });
    applyOptimisticVotes(poll, ['o2']);
    expect(poll.myVoteOptionIds).toEqual(['o2']);
    expect(count(poll, 'o1')).toBe(0);
    expect(count(poll, 'o2')).toBe(1);
    expect(poll.totalVotes).toBe(1);
  });

  it('clears the selection and drops the voter total', () => {
    const poll = makePoll({ allowMultiple: true, myVoteOptionIds: ['o1', 'o2'], totalVotes: 1, options: [
      { id: 'o1', body: 'A', isCustom: false, voteCount: 1, voters: [] },
      { id: 'o2', body: 'B', isCustom: false, voteCount: 1, voters: [] },
    ] });
    applyOptimisticVotes(poll, []);
    expect(poll.myVoteOptionIds).toEqual([]);
    expect(count(poll, 'o1')).toBe(0);
    expect(count(poll, 'o2')).toBe(0);
    expect(poll.totalVotes).toBe(0);
  });
});
