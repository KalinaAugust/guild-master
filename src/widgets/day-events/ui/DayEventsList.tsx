'use client';

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { openEventModal, setSelectedDate } from '@/entities/calendar';
import { deleteEventThunk, EventCard, fetchEventsThunk } from '@/entities/event';
import { ActivityEvent } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import dayjs from '@/shared/lib/dayjs';
import styles from './DayEventsList.module.css';

interface DayEventsListProps {
  date: string;
  guildId: string;
}

export const DayEventsList: React.FC<DayEventsListProps> = ({ date, guildId }) => {
  const dispatch = useAppDispatch();
  const t = useTranslations('Event');
  const commonT = useTranslations('Common');
  const locale = useLocale();
  
  const events = useAppSelector((state) => state.events.items);
  const loading = useAppSelector((state) => state.events.loading);
  const isInitialized = useAppSelector((state) => state.events.isInitialized);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Fetch events if not initialized and not loading
    if (!isInitialized && !loading) {
      dispatch(fetchEventsThunk(guildId));
    }
  }, [dispatch, guildId, isInitialized, loading]);

  const dayEvents = events
    .filter(event => event.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleAddEvent = () => {
    dispatch(setSelectedDate(date));
    dispatch(openEventModal());
  };

  const handleEditEvent = (event: ActivityEvent) => {
    dispatch(openEventModal(event));
  };

  const handleDeleteClick = (id: string) => {
    setEventToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (eventToDelete) {
      dispatch(deleteEventThunk(eventToDelete)).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          toast.success(t('successDeleted'));
        } else {
          toast.error(t('error'));
        }
      });
      setEventToDelete(null);
    }
  };

  const day = dayjs(date).format('D');
  const month = dayjs(date).locale(locale).format('MMMM');
  const year = dayjs(date).format('YYYY');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {day} <span className={styles.dateHighlight}>{month}</span> {year}
        </h2>
        <Button variant="primary" size="sm" onClick={handleAddEvent} className={styles.addBtn}>
          <Plus size={18} />
          <span>{t('addEvent')}</span>
        </Button>
      </div>

      {dayEvents.length > 0 ? (
        <div className={styles.list}>
          {dayEvents.map(event => (
            <EventCard 
              key={event.id} 
              event={event} 
              onEdit={handleEditEvent}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>{t('noEvents')}</p>
          <Button variant="secondary" onClick={handleAddEvent}>
            {t('createFirst')}
          </Button>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={commonT('delete')}
        description={commonT('confirmDelete')}
        confirmLabel={commonT('delete')}
      />
    </div>
  );
};
