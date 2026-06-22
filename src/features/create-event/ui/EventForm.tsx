'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import * as Form from '@radix-ui/react-form';
import { ActivityType } from '@/shared/types';
import { typeIcons } from '@/entities/event';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { FormField } from '@/shared/ui/FormField';
import { DatePicker } from '@/shared/ui/DatePicker';
import { TimeRangePicker } from '@/shared/ui/TimeRangePicker';
import { EventFormProps } from '../model/types';
import { createEventFormSchema } from '../model/schema';
import styles from './EventForm.module.css';

export const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  isDayView,
  isEdit,
  hideActions,
  formId,
}) => {
  const t = useTranslations('Event');
  const commonT = useTranslations('Common');
  const pickerT = useTranslations('DateTimePicker');
  const locale = useLocale();

  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [time, setTime] = useState(initialData?.time || '19:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || (isEdit ? '' : '20:00'));
  const [type, setType] = useState<ActivityType>(initialData?.type || 'game');
  const [description, setDescription] = useState(initialData?.description || '');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const typeOptions = useMemo(() => [
    { label: commonT('eventTypes.game'), value: 'game' as ActivityType, icon: <span style={{ color: 'var(--event-game-border)', display: 'flex' }}>{typeIcons.game}</span> },
    { label: commonT('eventTypes.meeting'), value: 'meeting' as ActivityType, icon: <span style={{ color: 'var(--event-meeting-border)', display: 'flex' }}>{typeIcons.meeting}</span> },
    { label: commonT('eventTypes.party'), value: 'party' as ActivityType, icon: <span style={{ color: 'var(--event-party-border)', display: 'flex' }}>{typeIcons.party}</span> },
    { label: commonT('eventTypes.sport'), value: 'sport' as ActivityType, icon: <span style={{ color: 'var(--event-sport-border)', display: 'flex' }}>{typeIcons.sport}</span> },
    { label: commonT('eventTypes.dnd'), value: 'dnd' as ActivityType, icon: <span style={{ color: 'var(--event-dnd-border)', display: 'flex' }}>{typeIcons.dnd}</span> },
    { label: commonT('eventTypes.boardgame'), value: 'boardgame' as ActivityType, icon: <span style={{ color: 'var(--event-boardgame-border)', display: 'flex' }}>{typeIcons.boardgame}</span> },
    { label: commonT('eventTypes.other'), value: 'other' as ActivityType, icon: <span style={{ color: 'var(--event-other-border)', display: 'flex' }}>{typeIcons.other}</span> },
  ], [commonT]);

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    const schema = createEventFormSchema({
      titleRequired: t('validation.titleRequired'),
      dateRequired: t('validation.dateRequired'),
      timeRequired: t('validation.timeRequired'),
    });
    const result = schema.safeParse({ title, date, time, endTime, type, description });
    if (!result.success) {
      const fieldErrors: Partial<Record<string, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  const showDateInput = !isDayView || isEdit;

  return (
    <Form.Root id={formId} onSubmit={handleSubmit} className={styles.form}>
      <FormField name="title" label={t('titleLabel')} error={errors.title}>
        <Input
          type="text"
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </FormField>
      <div className={styles.row}>
        {showDateInput && (
          <FormField name="date" label={t('dateLabel')} error={errors.date}>
            <DatePicker
              value={date}
              onChange={setDate}
              locale={locale}
              hasError={!!errors.date}
              placeholder={pickerT('selectDate')}
              labels={{ open: pickerT('openCalendar') }}
            />
          </FormField>
        )}
        <FormField name="time" label={t('timeLabel')} error={errors.time}>
          <TimeRangePicker
            start={time}
            end={endTime}
            onChange={({ start, end }) => {
              setTime(start);
              setEndTime(end);
            }}
            hasError={!!errors.time}
            labels={{
              open: pickerT('openTime'),
              hours: pickerT('hours'),
              minutes: pickerT('minutes'),
              startPlaceholder: pickerT('selectTime'),
              endPlaceholder: pickerT('selectEndTime'),
              nextDayHint: pickerT('nextDayHint'),
            }}
          />
        </FormField>
      </div>
      <div className={styles.formGroup}>
        <label>{t('typeLabel')}</label>
        <Select
          value={type}
          onValueChange={(val) => setType(val as ActivityType)}
          options={typeOptions}
        />
      </div>
      <FormField name="description" label={commonT('description')}>
        <RichTextEditor
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={setDescription}
        />
      </FormField>
      {!hideActions && (
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onCancel}>
            {commonT('cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {submitLabel}
          </Button>
        </div>
      )}
    </Form.Root>
  );
};
