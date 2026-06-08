import type { Poll } from './types';

/**
 * Applies a single-option vote to a poll draft in place, mirroring the server's
 * toggle / single-choice / multiple-choice semantics and keeping vote counts in
 * sync. Voter avatars are not touched (reconciled from the server response);
 * custom answers are not handled here because their option id is server-generated.
 */
export const applyOptimisticVote = (poll: Poll, optionId: string): void => {
  const wasVoter = poll.myVoteOptionIds.length > 0;
  const alreadyVoted = poll.myVoteOptionIds.includes(optionId);

  const bump = (id: string, delta: number) => {
    const option = poll.options.find((o) => o.id === id);
    if (option) option.voteCount = Math.max(0, option.voteCount + delta);
  };

  if (alreadyVoted) {
    // Toggle the vote off.
    poll.myVoteOptionIds = poll.myVoteOptionIds.filter((id) => id !== optionId);
    bump(optionId, -1);
  } else {
    if (!poll.allowMultiple) {
      // Single-choice: drop any previous vote in this poll.
      poll.myVoteOptionIds.forEach((id) => bump(id, -1));
      poll.myVoteOptionIds = [];
    }
    poll.myVoteOptionIds.push(optionId);
    bump(optionId, 1);
  }

  const isVoter = poll.myVoteOptionIds.length > 0;
  if (!wasVoter && isVoter) poll.totalVotes += 1;
  else if (wasVoter && !isVoter) poll.totalVotes = Math.max(0, poll.totalVotes - 1);
};
