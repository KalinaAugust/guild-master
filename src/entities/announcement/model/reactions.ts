import type { Announcement, ReactionType } from './types';

/** Toggles the current user's reaction of `type` in place (optimistic update). */
export const applyOptimisticReaction = (announcement: Announcement, type: ReactionType): void => {
  const bucket = announcement.reactions.find((r) => r.type === type);
  if (!bucket) return;
  if (bucket.reacted) {
    bucket.reacted = false;
    bucket.count = Math.max(0, bucket.count - 1);
  } else {
    bucket.reacted = true;
    bucket.count += 1;
  }
};
