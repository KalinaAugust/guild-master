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

interface ColumnProps {
  label?: string;
  values: number[];
  selected?: number;
  onPick: (value: number) => void;
}

const Column: React.FC<ColumnProps> = ({ label, values, selected, onPick }) => {
  const ref = React.useRef<HTMLUListElement>(null);
  const selectedRef = React.useRef<HTMLButtonElement>(null);

  // Translate the wheel into manual scrolling. A Radix Popover portals outside the
  // Dialog, whose `react-remove-scroll` lock swallows wheel events for anything not
  // inside it — so native scrolling never reaches this list. Scrolling `scrollTop`
  // ourselves works regardless of the lock.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Bring the selected value into view when the column mounts (popover opens).
  React.useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  return (
    <ul ref={ref} className={styles.column} aria-label={label}>
      {values.map((v) => (
        <li key={v}>
          <button
            ref={selected === v ? selectedRef : undefined}
            type="button"
            className={`${styles.option} ${selected === v ? styles.selected : ''}`}
            aria-pressed={selected === v}
            onClick={() => onPick(v)}
          >
            {pad(v)}
          </button>
        </li>
      ))}
    </ul>
  );
};

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
        aria-label={[labels?.open, value].filter(Boolean).join(', ') || undefined}
        data-invalid={hasError || undefined}
      >
        <span className={styles.value}>{value || placeholder}</span>
        <Clock size={18} className={styles.icon} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className={styles.content} sideOffset={6} align="start">
          <div className={styles.columns}>
            <Column
              label={labels?.hours}
              values={hours}
              selected={selH}
              onPick={(h) => commit(h, selM ?? 0)}
            />
            <Column
              label={labels?.minutes}
              values={minutes}
              selected={selM}
              onPick={(m) => commit(selH ?? 0, m)}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
