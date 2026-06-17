'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Clock } from 'lucide-react';
import styles from './TimePicker.module.css';

export interface TimePickerLabels {
  /** Accessible label for the trigger / "open time picker" action. */
  open?: string;
  hours?: string;
  minutes?: string;
}

interface TimePickerProps {
  /** Selected time as `HH:mm` (empty string when unset). */
  value: string;
  onChange: (value: string) => void;
  /** Step between selectable minutes. Default 5. */
  minuteStep?: number;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  id?: string;
  labels?: TimePickerLabels;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  minuteStep = 5,
  placeholder,
  disabled = false,
  hasError = false,
  id,
  labels,
}) => {
  const [open, setOpen] = React.useState(false);

  const [selH, selM] = value ? value.split(':').map(Number) : [undefined, undefined];

  const hours = React.useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = React.useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep]
  );

  const commit = (h: number, m: number) => onChange(`${pad(h)}:${pad(m)}`);

  const handleHour = (h: number) => commit(h, selM ?? 0);
  const handleMinute = (m: number) => commit(selH ?? 0, m);

  const triggerClass = [styles.trigger, hasError && styles.error, !value && styles.placeholder]
    .filter(Boolean)
    .join(' ');

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        type="button"
        className={triggerClass}
        disabled={disabled}
        aria-label={labels?.open}
        data-invalid={hasError || undefined}
      >
        <span className={styles.value}>{value || placeholder}</span>
        <Clock size={18} className={styles.icon} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className={styles.content} sideOffset={6} align="start">
          <div className={styles.columns}>
            <ul className={styles.column} aria-label={labels?.hours}>
              {hours.map((h) => (
                <li key={h}>
                  <button
                    type="button"
                    className={`${styles.option} ${selH === h ? styles.selected : ''}`}
                    aria-pressed={selH === h}
                    onClick={() => handleHour(h)}
                  >
                    {pad(h)}
                  </button>
                </li>
              ))}
            </ul>
            <ul className={styles.column} aria-label={labels?.minutes}>
              {minutes.map((m) => (
                <li key={m}>
                  <button
                    type="button"
                    className={`${styles.option} ${selM === m ? styles.selected : ''}`}
                    aria-pressed={selM === m}
                    onClick={() => handleMinute(m)}
                  >
                    {pad(m)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
