'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { toast } from 'sonner';
import { ChevronLeft, Sword, Gamepad2, Users, Calendar, Skull, PartyPopper, Dumbbell } from 'lucide-react';
import { ActivityType } from '@/shared/types';
import { useAppDispatch } from '@/shared/lib/hooks';
import { openEventModal } from '@/entities/calendar';
import {
  useGetEventByIdQuery,
  useGetParticipantsQuery,
  useDeleteEventMutation,
} from '@/entities/event';
import { Button } from '@/shared/ui/Button';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { useUpdateParticipantStatusMutation } from '../api/detailApi';
import { ParticipantItem } from './ParticipantItem';
import styles from './EventDetailContent.module.css';

const typeIcons: Record<ActivityType, React.ReactNode> = {
  raid:    <Sword size={32} />,
  game:    <Gamepad2 size={32} />,
  meeting: <Users size={32} />,
  other:   <Calendar size={32} />,
  dungeon: <Skull size={32} />,
  party:   <PartyPopper size={32} />,
  sport:   <Dumbbell size={32} />,
};

interface EventDetailContentProps {
  eventId: string;
}

export const EventDetailContent: React.FC<EventDetailContentProps> = ({ eventId }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const t = useTranslations('EventDetail');
  const eventT = useTranslations('Event');
  const commonT = useTranslations('Common');

  const { data, isLoading: isEventLoading } = useGetEventByIdQuery(eventId);
  const event = data?.event;

  const { data: participantsData, isLoading: isParticipantsLoading } =
    useGetParticipantsQuery(eventId, { skip: !event });
  const participants = participantsData?.participants ?? [];
  const currentUserId = participantsData?.currentUserId ?? '';

  const isCreator = !!event && !!currentUserId && event.createdBy === currentUserId;

  const [updateStatus] = useUpdateParticipantStatusMutation();
  const [deleteEvent] = useDeleteEventMutation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const locale = useLocale();
  const formattedDateTime = event
    ? dayjs(`${event.date} ${event.time}`).locale(locale).format('dddd, D MMMM · HH:mm')
    : '';

  const handleEdit = () => {
    if (!event) return;
    dispatch(openEventModal(event));
  };

  const handleConfirm = async () => {
    if (!event) return;
    try {
      await updateStatus({ eventId: event.id, status: 'confirmed' }).unwrap();
    } catch {
      toast.error(eventT('error'));
    }
  };

  const handleDecline = async () => {
    if (!event) return;
    try {
      await updateStatus({ eventId: event.id, status: 'declined' }).unwrap();
    } catch {
      toast.error(eventT('error'));
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    try {
      await deleteEvent(event.id).unwrap();
      toast.success(eventT('successDeleted'));
      router.push(`/day/${event.date}`);
    } catch {
      toast.error(eventT('error'));
    }
  };

  if (isEventLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>{eventT('error')}</p>
      </div>
    );
  }

  const typeLabel = eventT(`types.${event.type}` as Parameters<typeof eventT>[0]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href={`/day/${event.date}`} className={styles.backLink}>
          <ChevronLeft size={20} />
          {commonT('backToDay')}
        </Link>
        <h1 className={styles.title}>{event.title}</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.column}>
          <div className={styles.infoGroup}>
            <span className={styles.label}>{t('type')}</span>
            <div className={`${styles.typeHero} ${styles[`typeHero_${event.type}`]}`}>
              <span className={styles.typeHeroIcon}>{typeIcons[event.type]}</span>
              <span className={styles.typeHeroLabel}>{typeLabel}</span>
            </div>
          </div>

          <div className={styles.infoGroup}>
            <span className={styles.label}>{t('dateTime')}</span>
            <span className={styles.dateTime}>{formattedDateTime}</span>
          </div>

          {event.description && (
            <div className={styles.infoGroup}>
              <span className={styles.label}>{t('description')}</span>
              <p className={styles.description}>{event.description}</p>
            </div>
          )}
        </div>

        <div className={styles.column}>
          <span className={styles.label}>
            {t('participants')}{!isParticipantsLoading && ` (${participants.length})`}
          </span>

          {isParticipantsLoading && <div className={styles.skeleton} />}

          {!isParticipantsLoading && participants.length === 0 && (
            <p className={styles.empty}>{t('noParticipants')}</p>
          )}

          {!isParticipantsLoading &&
            participants.map((p) => (
              <ParticipantItem
                key={p.id}
                participant={p}
                isCurrentUser={p.user_id === currentUserId}
                onConfirm={handleConfirm}
                onDecline={handleDecline}
              />
            ))}
        </div>
      </div>

      {isCreator && (
        <div className={styles.footer}>
          <Button type="button" variant="secondary" onClick={() => setDeleteModalOpen(true)}>
            {commonT('delete')}
          </Button>
          <Button type="button" variant="primary" onClick={handleEdit}>
            {t('edit')}
          </Button>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={commonT('delete')}
        description={commonT('confirmDelete')}
        confirmLabel={commonT('delete')}
      />
    </div>
  );
};
