// src/features/guild-poll/model/options.ts
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 10;

/** Number of options with non-whitespace content. */
export const countFilled = (options: string[]): number =>
  options.filter((o) => o.trim() !== '').length;
