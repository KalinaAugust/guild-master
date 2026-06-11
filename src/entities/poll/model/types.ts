export interface PollVoter {
  publicId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  alias: string | null;
  displayAsAlias: boolean;
  icon: string | null;
  /** When the vote was cast (ISO timestamp). */
  votedAt: string;
}

export interface PollOption {
  id: string;
  body: string;
  isCustom: boolean;
  voteCount: number;
  /** Voter profiles for this option. Empty for anonymous polls. */
  voters: PollVoter[];
}

export interface Poll {
  id: string;
  guildId: string;
  createdBy: string | null;
  title: string;
  description: string | null;
  isAnonymous: boolean;
  allowMultiple: boolean;
  allowCustom: boolean;
  allowRevote: boolean;
  closedAt: string | null;
  createdAt: string;
  options: PollOption[];
  /** Option ids the current user has voted for. */
  myVoteOptionIds: string[];
  /** Distinct number of users who voted in this poll. */
  totalVotes: number;
  /** Current user is the author or holds ADMIN/OWNER in the guild. */
  canManage: boolean;
}

export interface CreatePollInput {
  title: string;
  description: string;
  options: string[];
  isAnonymous: boolean;
  allowMultiple: boolean;
  allowCustom: boolean;
  allowRevote: boolean;
}

export interface VoteInput {
  optionId?: string;
  customBody?: string;
}
