'use client';

import { useTranslations } from 'next-intl';
import { Pencil, Check, X } from 'lucide-react';
import { DatePicker } from '@/shared/ui/DatePicker';
import { Button } from '@/shared/ui/Button';
import { updateBirthDate } from '@/entities/user';
import { useEditableField } from '@/shared/lib/useEditableField';
import dayjs from '@/shared/lib/dayjs';
import styles from './EditableBirthDate.module.css';

interface EditableBirthDateProps {
  initialBirthDate: string | null;
  userId: string;
  locale: string;
}

export const EditableBirthDate = ({ initialBirthDate, userId, locale }: EditableBirthDateProps) => {
  const pickerT = useTranslations('DateTimePicker');
  const { isEditing, value, setValue, saved, isSaving, isUnchanged, startEditing, cancel, save } =
    useEditableField<string>({
      initial: initialBirthDate ?? '',
      onSave: (v) => updateBirthDate(userId, v || null),
      successMessage: 'Birth date updated',
      errorMessage: 'Failed to update birth date',
    });

  if (!isEditing) {
    return (
      <div className={styles.view}>
        <span className={saved ? styles.value : styles.placeholder}>
          {saved ? dayjs(saved).locale(locale).format('D MMMM YYYY') : 'Add your birth date'}
        </span>
        <Button
          variant="ghost"
          size="icon_sm"
          onClick={startEditing}
          aria-label="Edit birth date"
          className={styles.editButton}
        >
          <Pencil size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.edit}>
      <DatePicker
        value={value}
        onChange={setValue}
        locale={locale}
        max={dayjs().format('YYYY-MM-DD')}
        captionLayout="dropdown"
        fromYear={1920}
        toYear={new Date().getFullYear()}
        placeholder={pickerT('selectDate')}
        disabled={isSaving}
        labels={{ open: pickerT('openCalendar') }}
      />
      <div className={styles.actions}>
        <Button
          variant="ghost"
          size="icon_sm"
          onClick={save}
          isLoading={isSaving}
          disabled={isUnchanged}
          aria-label="Save"
          className={styles.actionButton}
        >
          <Check size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon_sm"
          onClick={cancel}
          disabled={isSaving}
          aria-label="Cancel"
          className={styles.actionButton}
        >
          <X size={18} />
        </Button>
      </div>
    </div>
  );
};
