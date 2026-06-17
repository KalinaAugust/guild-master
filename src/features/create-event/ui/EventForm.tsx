'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import * as Form from '@radix-ui/react-form';
import { ActivityType } from '@/shared/types';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { FormField } from '@/shared/ui/FormField';
import { DatePicker } from '@/shared/ui/DatePicker';
import { TimePicker } from '@/shared/ui/TimePicker';
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
  const [type, setType] = useState<ActivityType>(initialData?.type || 'game');
  const [description, setDescription] = useState(initialData?.description || '');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const typeOptions = useMemo(() => [
    { label: commonT('eventTypes.game'), value: 'game' as ActivityType },
    { label: commonT('eventTypes.meeting'), value: 'meeting' as ActivityType },
    { label: commonT('eventTypes.party'), value: 'party' as ActivityType },
    { label: commonT('eventTypes.sport'), value: 'sport' as ActivityType },
    { label: commonT('eventTypes.dnd'), value: 'dnd' as ActivityType },
    { label: commonT('eventTypes.boardgame'), value: 'boardgame' as ActivityType },
    { label: commonT('eventTypes.other'), value: 'other' as ActivityType },
  ], [commonT]);

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    const schema = createEventFormSchema({
      titleRequired: t('validation.titleRequired'),
      dateRequired: t('validation.dateRequired'),
      timeRequired: t('validation.timeRequired'),
    });
    const result = schema.safeParse({ title, date, time, type, description });
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
          <TimePicker
            value={time}
            onChange={setTime}
            hasError={!!errors.time}
            placeholder={pickerT('selectTime')}
            labels={{
              open: pickerT('openTime'),
              hours: pickerT('hours'),
              minutes: pickerT('minutes'),
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
        <Textarea
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
