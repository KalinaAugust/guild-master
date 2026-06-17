'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { ru, enUS } from 'react-day-picker/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import dayjs from '@/shared/lib/dayjs';
import 'react-day-picker/style.css';
import styles from './DatePicker.module.css';

export interface DatePickerLabels {
  /** Accessible label for the trigger / "open calendar" action. */
  open?: string;
}

interface DatePickerProps {
  /** Selected date as `YYYY-MM-DD` (empty string when unset). */
  value: string;
  onChange: (value: string) => void;
  /** App locale (`ru` | `en`). Controls calendar and trigger formatting. */
  locale?: string;
  placeholder?: string;
  /** Earliest selectable date as `YYYY-MM-DD` — earlier days are disabled. */
  min?: string;
  /** Latest selectable date as `YYYY-MM-DD` — later days are disabled. */
  max?: string;
  disabled?: boolean;
  hasError?: boolean;
  /** `dropdown` shows month/year selects (used for birth dates). */
  captionLayout?: 'label' | 'dropdown';
  /** Bounds for the year dropdown when `captionLayout="dropdown"`. */
  fromYear?: number;
  toYear?: number;
  id?: string;
  labels?: DatePickerLabels;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  locale = 'en',
  placeholder,
  min,
  max,
  disabled = false,
  hasError = false,
  captionLayout = 'label',
  fromYear,
  toYear,
  id,
  labels,
}) => {
  const [open, setOpen] = React.useState(false);

  const selected = value ? dayjs(value).toDate() : undefined;
  const rdpLocale = locale === 'ru' ? ru : enUS;
  const display = value ? dayjs(value).locale(locale).format('D MMM YYYY') : '';

  const handleSelect = (day?: Date) => {
    if (!day) return;
    onChange(dayjs(day).format('YYYY-MM-DD'));
    setOpen(false);
  };

  const disabledDays = [
    ...(min ? [{ before: dayjs(min).toDate() }] : []),
    ...(max ? [{ after: dayjs(max).toDate() }] : []),
  ];

  const triggerClass = [styles.trigger, hasError && styles.error, !display && styles.placeholder]
    .filter(Boolean)
    .join(' ');

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        type="button"
        className={triggerClass}
        disabled={disabled}
        aria-label={[labels?.open, display].filter(Boolean).join(', ') || undefined}
        data-invalid={hasError || undefined}
      >
        <span className={styles.value}>{display || placeholder}</span>
        <CalendarIcon size={18} className={styles.icon} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className={styles.content} sideOffset={6} align="start">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            locale={rdpLocale}
            weekStartsOn={1}
            showOutsideDays
            captionLayout={captionLayout}
            startMonth={fromYear ? new Date(fromYear, 0) : undefined}
            endMonth={toYear ? new Date(toYear, 11) : undefined}
            disabled={disabledDays.length ? disabledDays : undefined}
            className={styles.calendar}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
