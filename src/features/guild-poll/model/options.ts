// src/features/guild-poll/model/options.ts
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 10;

/** Number of options with non-whitespace content. */
export const countFilled = (options: string[]): number =>
  options.filter((o) => o.trim() !== '').length;

/**
 * Telegram-style growth: keep exactly one trailing empty "add option" slot
 * while under the cap; never exceed MAX_POLL_OPTIONS entries.
 */
export const ensureTrailingSlot = (options: string[]): string[] => {
  if (options.length >= MAX_POLL_OPTIONS) return options.slice(0, MAX_POLL_OPTIONS);
  const last = options[options.length - 1];
  if (last === undefined || last.trim() !== '') return [...options, ''];
  return options;
};
