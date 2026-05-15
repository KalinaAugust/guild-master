'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import styles from './EventModal.module.css';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventModal } from '@/entities/calendar';
import { createEventThunk, updateEventThunk } from '@/entities/event';
import { ActivityType, ActivityEvent } from '@/shared/types';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import dayjs from '@/shared/lib/dayjs';

interface EventFormData {
  title: string;
  date: string;
  time: string;
  type: ActivityType;
  description: string;
}

interface EventFormProps {
  initialData?: Partial<ActivityEvent>;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
  submitLabel: string;
  isDayView?: boolean;
  isEdit?: boolean;
}

const EventForm: React.FC<EventFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitLabel,
  isDayView,
  isEdit
}) => {
  const t = useTranslations('Event');
  const commonT = useTranslations('Common');

  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [time, setTime] = useState(initialData?.time || '19:00');
  const [type, setType] = useState<ActivityType>(initialData?.type || 'game');
  const [description, setDescription] = useState(initialData?.description || '');

  const typeOptions = useMemo(() => [
    { label: t('types.game'), value: 'game' as ActivityType },
    { label: t('types.raid'), value: 'raid' as ActivityType },
    { label: t('types.meeting'), value: 'meeting' as ActivityType },
    { label: t('types.other'), value: 'other' as ActivityType },
  ], [t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) return;
    onSubmit({ title, date, time, type, description });
  };

  const showDateInput = !isDayView || isEdit;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="title">{t('titleLabel')}</label>
        <input
          type="text"
          id="title"
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.row}>
        {showDateInput && (
          <div className={styles.formGroup}>
            <label htmlFor="date">{t('dateLabel')}</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={styles.input}
            />
          </div>
        )}
        <div className={styles.formGroup}>
          <label htmlFor="time">{t('timeLabel')}</label>
          <input
            type="time"
            id="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className={styles.input}
          />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label>{t('typeLabel')}</label>
        <Select
          value={type}
          onValueChange={(val) => setType(val as ActivityType)}
          options={typeOptions}
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="description">{t('descriptionLabel')}</label>
        <textarea
          id="description"
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.textarea}
        />
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {commonT('cancel')}
        </Button>
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export const EventModal: React.FC<{ guildId: string, isDayView?: boolean }> = ({ guildId, isDayView }) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isEventModalOpen);
  const selectedDate = useAppSelector((state) => state.ui.selectedDate);
  const editingEvent = useAppSelector((state) => state.ui.editingEvent);
  
  const t = useTranslations('Event');
  const commonT = useTranslations('Common');

  const handleClose = () => {
    dispatch(closeEventModal());
  };

  const handleSubmit = (data: EventFormData) => {
    if (editingEvent) {
      dispatch(updateEventThunk({
        id: editingEvent.id,
        event: data
      }));
    } else {
      dispatch(createEventThunk({
        ...data,
        guild_id: guildId,
      }));
    }
    handleClose();
  };

  const initialData = useMemo(() => {
    if (editingEvent) return editingEvent;
    if (selectedDate) return { date: dayjs(selectedDate).format('YYYY-MM-DD') };
    return undefined;
  }, [editingEvent, selectedDate]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={editingEvent ? t('editTitle') : t('createTitle')}
    >
      {/* Use key to force re-render when modal opens or editingEvent changes */}
      {isOpen && (
        <EventForm 
          key={editingEvent?.id || selectedDate || 'new'}
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          submitLabel={editingEvent ? commonT('save') : t('submit')}
          isDayView={isDayView}
          isEdit={!!editingEvent}
        />
      )}
    </Modal>
  );
};
