import { describe, it, expect } from 'vitest';
import dayjs from './dayjs';
import { getRelativeDay } from './relativeDay';

describe('getRelativeDay', () => {
  const todayLabel = 'Today';
  const tomorrowLabel = 'Tomorrow';

  it('returns today label when the date is today', () => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    expect(getRelativeDay(todayStr, todayLabel, tomorrowLabel)).toBe(todayLabel);
  });

  it('returns tomorrow label when the date is tomorrow', () => {
    const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
    expect(getRelativeDay(tomorrowStr, todayLabel, tomorrowLabel)).toBe(tomorrowLabel);
  });

  it('returns formatted date when the date is more than 1 day in the future', () => {
    const futureDate = dayjs().add(5, 'day');
    const expectedFormat = futureDate.format('D MMM');
    expect(getRelativeDay(futureDate.format('YYYY-MM-DD'), todayLabel, tomorrowLabel)).toBe(expectedFormat);
  });

  it('returns formatted date when the date is in the past', () => {
    const pastDate = dayjs().subtract(2, 'day');
    const expectedFormat = pastDate.format('D MMM');
    expect(getRelativeDay(pastDate.format('YYYY-MM-DD'), todayLabel, tomorrowLabel)).toBe(expectedFormat);
  });
});
