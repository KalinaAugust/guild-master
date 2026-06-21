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
  useGetMyEventIdsQuery
} from '@/entities/event';
import { ActivityEvent } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { EventCardSkeleton } from '@/shared/ui/EventCardSkeleton';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import dayjs from '@/shared/lib/dayjs';
import styles from './DayEventsList.module.css';

const EventCardWithCounts: React.FC<{
  event: ActivityEvent;
  onClick?: (event: ActivityEvent) => void;
  href?: string;
  onDelete?: (id: string) => void;
  isPendingInvite?: boolean;
}> = ({ event, onClick, href, onDelete, isPendingInvite }) => {
  const { data } = useGetParticipantsQuery(event.id);
  const participants = data?.participants ?? [];
  const total = participants.length;
  const confirmed = participants.filter((p) => p.status === 'confirmed').length;

  return (
    <EventCard
      event={event}
      onClick={onClick}
      href={href}
      onDelete={onDelete}
      participantCount={data ? { total, confirmed } : undefined}
      showInviteBadge={isPendingInvite}
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
  const { canCreateEvents, canManageEvents } = useGuildPermissions(activeGuildId, userId);

  const { data: events = [], isLoading } = useGetEventsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });
  const { data: myIdsData } = useGetMyEventIdsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRecurringOpen, setDeleteRecurringOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventObjectToDelete, setEventObjectToDelete] = useState<ActivityEvent | null>(null);

  const dayEvents = events
    .filter(event => event.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));

  const isPastDate = dayjs(date).isBefore(dayjs().startOf('day'));

  const handleAddEvent = () => {
    if (isPastDate) return;
    dispatch(setSelectedDate(date));
    dispatch(openEventModal());
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
        {!isPastDate && canCreateEvents && (
          <Button variant="primary" onClick={handleAddEvent} className={styles.addBtn} icon={<Plus size={18} strokeWidth={3} />}>
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
              href={`/events/${event.publicId ?? event.id}`}
              onDelete={canManageEvents ? handleDeleteClick : undefined}
              isPendingInvite={myIdsData?.pendingEventIds?.includes(event.id)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>{t('noEvents')}</p>
          {!isPastDate && canCreateEvents && (
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
        footerActions={
          <>
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
          </>
        }
      >
        <p style={{ marginBottom: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {t('deleteOccurrenceDesc')}
        </p>
      </Modal>
    </div>
  );
};
