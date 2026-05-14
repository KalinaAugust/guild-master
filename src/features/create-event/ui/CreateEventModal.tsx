'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import styles from './CreateEventModal.module.css';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventModal } from '@/entities/calendar';
import { createEventThunk } from '@/entities/event';
import { ActivityType } from '@/shared/types';
import { Select } from '@/shared/ui/Select';
import dayjs from '@/shared/lib/dayjs';

export const CreateEventModal: React.FC<{ guildId: string }> = ({ guildId }) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isEventModalOpen);
  const selectedDate = useAppSelector((state) => state.ui.selectedDate);
  const t = useTranslations('Event');
  const commonT = useTranslations('Common');

  const typeOptions = useMemo(() => [
    { label: t('types.game'), value: 'game' as ActivityType },
    { label: t('types.raid'), value: 'raid' as ActivityType },
    { label: t('types.meeting'), value: 'meeting' as ActivityType },
    { label: t('types.other'), value: 'other' as ActivityType },
  ], [t]);

  const [prevSelectedDate, setPrevSelectedDate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [type, setType] = useState<ActivityType>('game');
  const [description, setDescription] = useState('');

  // Sync date when selectedDate changes
  if (selectedDate !== prevSelectedDate) {
    setPrevSelectedDate(selectedDate);
    if (selectedDate) {
      setDate(dayjs(selectedDate).format('YYYY-MM-DD'));
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !date || !time) return;

    dispatch(createEventThunk({
      title,
      date,
      time,
      type,
      description,
      guild_id: guildId,
    }));

    handleClose();
  };

  const handleClose = () => {
    dispatch(closeEventModal());
    setTitle('');
    setDescription('');
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{t('createTitle')}</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="title">{t('titleLabel')}</label>
            <input
              type="text"
              id="title"
              placeholder={t('titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="date">{t('dateLabel')}</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="time">{t('timeLabel')}</label>
            <input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
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
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>
              {commonT('cancel')}
            </button>
            <button type="submit" className={styles.submitBtn}>
              {t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

