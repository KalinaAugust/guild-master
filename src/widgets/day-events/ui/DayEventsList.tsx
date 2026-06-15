'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { useGuildPermissions } from '@/entities/guild';
import { openEventModal, setSelectedDate } from '@/entities/calendar';
import { 
  EventCard, 
  useDeleteEventMutation, 
  useUpdateEventMutation, 
  useGetEventsQuery, 
  useGetParticipantsQuery,
  useCreateEventMutation
} from '@/entities/event';
import { ActivityEvent } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { EventCardSkeleton } from '@/shared/ui/EventCardSkeleton';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { FormField } from '@/shared/ui/FormField';
import { Input } from '@/shared/ui/Input';
import * as Form from '@radix-ui/react-form';
import dayjs from '@/shared/lib/dayjs';
import styles from './DayEventsList.module.css';

const EventCardWithCounts: React.FC<{
  event: ActivityEvent;
  onClick?: (event: ActivityEvent) => void;
  onEdit?: (event: ActivityEvent) => void;
  onDelete?: (id: string) => void;
  onRepeat?: (event: ActivityEvent) => void;
}> = ({ event, onClick, onEdit, onDelete, onRepeat }) => {
  const { data } = useGetParticipantsQuery(event.id);
  const participants = data?.participants ?? [];
  const total = participants.length;
  const confirmed = participants.filter((p) => p.status === 'confirmed').length;

  return (
    <EventCard
      event={event}
      onClick={onClick}
      onEdit={onEdit}
      onDelete={onDelete}
      onRepeat={onRepeat}
      participantCount={data ? { total, confirmed } : undefined}
    />
  );
};

interface DayEventsListProps {
  date: string;
  guildId?: string;
  userId?: string;
}

export const DayEventsList: React.FC<DayEventsListProps> = ({ date, guildId: propGuildId, userId }) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations('Event');
  const commonT = useTranslations('Common');
  const locale = useLocale();
  
  const currentGuildId = useAppSelector((state) => state.guild.currentGuildId);

  const activeGuildId = currentGuildId || propGuildId;
  const { canManageEvents } = useGuildPermissions(activeGuildId, userId);

  const { data: events = [], isLoading } = useGetEventsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const [createEvent, { isLoading: isCreatingEvent }] = useCreateEventMutation();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRecurringOpen, setDeleteRecurringOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventObjectToDelete, setEventObjectToDelete] = useState<ActivityEvent | null>(null);

  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [eventToRepeat, setEventToRepeat] = useState<ActivityEvent | null>(null);
  const [repeatDate, setRepeatDate] = useState('');
  const [repeatTime, setRepeatTime] = useState('');
  const [repeatErrors, setRepeatErrors] = useState<{ date?: string; time?: string }>({});

  const dayEvents = events
    .filter(event => event.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));

  const isPastDate = dayjs(date).isBefore(dayjs().startOf('day'));

  const handleAddEvent = () => {
    if (isPastDate) return;
    dispatch(setSelectedDate(date));
    dispatch(openEventModal());
  };

  const handleEditEvent = (event: ActivityEvent) => {
    if (isPastDate) return;
    dispatch(openEventModal(event));
  };

  const handleViewEvent = (event: ActivityEvent) => {
    router.push(`/events/${event.id}`);
  };

  const handleRepeatClick = (event: ActivityEvent) => {
    setEventToRepeat(event);
    setRepeatDate(event.date);
    setRepeatTime(event.time);
    setRepeatErrors({});
    setRepeatModalOpen(true);
  };

  const handleRepeatSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!eventToRepeat || !activeGuildId) return;

    const errors: { date?: string; time?: string } = {};
    if (!repeatDate) errors.date = t('validation.dateRequired');
    if (!repeatTime) errors.time = t('validation.timeRequired');

    if (Object.keys(errors).length > 0) {
      setRepeatErrors(errors);
      return;
    }

    try {
      await createEvent({
        guild_id: activeGuildId,
        title: eventToRepeat.title,
        description: eventToRepeat.description || '',
        type: eventToRepeat.type,
        date: repeatDate,
        time: repeatTime,
      }).unwrap();
      toast.success(t('successCreated'));
      setRepeatModalOpen(false);
      setEventToRepeat(null);
    } catch {
      toast.error(t('error'));
    }
  };

  const handleDeleteClick = (id: string) => {
    const targetEvent = events.find(e => e.id === id);
    if (!targetEvent) return;
    setEventObjectToDelete(targetEvent);
    setEventToDelete(id);
    if (id.includes('_')) {
      setDeleteRecurringOpen(true);
    } else {
      setDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (eventToDelete) {
      try {
        await deleteEvent(eventToDelete).unwrap();
        toast.success(t('successDeleted'));
      } catch {
        toast.error(t('error'));
      }
      setEventToDelete(null);
      setEventObjectToDelete(null);
    }
  };

  const handleDeleteOnlyOccurrence = async () => {
    if (eventObjectToDelete) {
      const [realId, dateStr] = eventObjectToDelete.id.split('_');
      try {
        const currentExceptions = eventObjectToDelete.exceptions || [];
        const newExceptions = [...currentExceptions, dateStr];
        await updateEvent({
          id: realId,
          event: { exceptions: newExceptions }
        }).unwrap();
        toast.success(t('successDeleted'));
      } catch {
        toast.error(t('error'));
      } finally {
        setDeleteRecurringOpen(false);
        setEventObjectToDelete(null);
        setEventToDelete(null);
      }
    }
  };

  const handleDeleteAllOccurrences = async () => {
    if (eventObjectToDelete) {
      const realId = eventObjectToDelete.id.split('_')[0];
      try {
        await deleteEvent(realId).unwrap();
        toast.success(t('successDeleted'));
      } catch {
        toast.error(t('error'));
      } finally {
        setDeleteRecurringOpen(false);
        setEventObjectToDelete(null);
        setEventToDelete(null);
      }
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
        {!isPastDate && canManageEvents && (
          <Button variant="primary" onClick={handleAddEvent} className={styles.addBtn}>
            <Plus size={18} strokeWidth={3} />
            <span>{t('addEvent')}</span>
          </Button>
        )}
      </div>

      {isLoading || !activeGuildId ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : dayEvents.length > 0 ? (
        <div className={styles.list}>
          {dayEvents.map(event => (
            <EventCardWithCounts
              key={event.id}
              event={event}
              onClick={handleViewEvent}
              onEdit={!isPastDate && canManageEvents ? handleEditEvent : undefined}
              onDelete={canManageEvents ? handleDeleteClick : undefined}
              onRepeat={canManageEvents ? handleRepeatClick : undefined}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>{t('noEvents')}</p>
          {!isPastDate && canManageEvents && (
            <Button variant="secondary" onClick={handleAddEvent}>
              {t('createFirst')}
            </Button>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={commonT('delete')}
        description={commonT('confirmDelete')}
        confirmLabel={commonT('delete')}
        isLoading={isDeleting}
      />

      <Modal
        isOpen={deleteRecurringOpen}
        onClose={() => {
          setDeleteRecurringOpen(false);
          setEventObjectToDelete(null);
          setEventToDelete(null);
        }}
        title={t('deleteOccurrenceTitle')}
      >
        <p style={{ marginBottom: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {t('deleteOccurrenceDesc')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => {
              setDeleteRecurringOpen(false);
              setEventObjectToDelete(null);
              setEventToDelete(null);
            }}
            disabled={isDeleting || isUpdating}
          >
            {commonT('cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteOnlyOccurrence}
            isLoading={isUpdating}
            disabled={isDeleting}
          >
            {t('deleteOnlyThis')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteAllOccurrences}
            isLoading={isDeleting}
            disabled={isUpdating}
          >
            {t('deleteAll')}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={repeatModalOpen}
        onClose={() => {
          setRepeatModalOpen(false);
          setEventToRepeat(null);
        }}
        title={t('repeatEventTitle')}
      >
        {eventToRepeat && (
          <Form.Root onSubmit={handleRepeatSubmit} className={styles.repeatForm}>
            <p className={styles.modalDesc}>
              {eventToRepeat.title}
            </p>
            <div className={styles.formRow}>
              <FormField name="date" label={t('dateLabel')} error={repeatErrors.date}>
                <Input
                  type="date"
                  value={repeatDate}
                  onChange={(e) => setRepeatDate(e.target.value)}
                />
              </FormField>
              <FormField name="time" label={t('timeLabel')} error={repeatErrors.time}>
                <Input
                  type="time"
                  value={repeatTime}
                  onChange={(e) => setRepeatTime(e.target.value)}
                />
              </FormField>
            </div>
            <div className={styles.formActions}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setRepeatModalOpen(false);
                  setEventToRepeat(null);
                }}
                disabled={isCreatingEvent}
              >
                {commonT('cancel')}
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isCreatingEvent}
              >
                {t('repeatEvent')}
              </Button>
            </div>
          </Form.Root>
        )}
      </Modal>
    </div>
  );
};
