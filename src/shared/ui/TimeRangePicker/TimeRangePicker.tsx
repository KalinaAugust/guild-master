'use client';

import * as React from 'react';
import { TimePicker } from '@/shared/ui/TimePicker';
import styles from './TimeRangePicker.module.css';

export interface TimeRangePickerLabels {
  open?: string;
  hours?: string;
  minutes?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  nextDayHint?: string;
}

interface TimeRangePickerProps {
  start: string;
  end: string;
  onChange: (v: { start: string; end: string }) => void;
  disabled?: boolean;
  hasError?: boolean;
  labels?: TimeRangePickerLabels;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  start,
  end,
  onChange,
  disabled = false,
  hasError = false,
  labels,
}) => {
  const rollsOver = !!end && end <= start;
  const pickerLabels = { open: labels?.open, hours: labels?.hours, minutes: labels?.minutes };

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <TimePicker
          value={start}
          onChange={(v) => onChange({ start: v, end })}
          disabled={disabled}
          hasError={hasError}
          placeholder={labels?.startPlaceholder}
          labels={pickerLabels}
        />
        <span className={styles.separator} aria-hidden>–</span>
        <TimePicker
          value={end}
          onChange={(v) => onChange({ start, end: v })}
          disabled={disabled}
          placeholder={labels?.endPlaceholder}
          labels={pickerLabels}
        />
      </div>
      {rollsOver && labels?.nextDayHint && (
        <span className={styles.hint}>{labels.nextDayHint}</span>
      )}
    </div>
  );
};
