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
import {
  useUpdateParticipantStatusMutation,
  useSubmitEventJoinRequestMutation,
  useGetEventJoinRequestsQuery,
  useResolveEventJoinRequestMutation,
} from '../api/detailApi';
import { ParticipantItem } from './ParticipantItem';
import { EventJoinRequestItem } from './EventJoinRequestItem';
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
  const currentUserId = participantsData?.currentUserId ?? '';
  const participants = [...(participantsData?.participants ?? [])].sort(
    (a, b) =>
      Number(b.user_id === currentUserId) - Number(a.user_id === currentUserId),
  );

  const isCreator = !!event && !!currentUserId && event.createdBy === currentUserId;

  const viewerIsGuildMember = participantsData?.viewerIsGuildMember ?? false;
  const viewerHasPendingRequest = participantsData?.viewerHasPendingRequest ?? false;
  const isParticipant =
    !!currentUserId && participants.some((p) => p.user_id === currentUserId);
  const canApply =
    !!currentUserId && viewerIsGuildMember && !isCreator && !isParticipant && !viewerHasPendingRequest;

  const { data: joinRequests = [] } = useGetEventJoinRequestsQuery(eventId, {
    skip: !isCreator,
  });
  const [submitJoinRequest, { isLoading: isApplying }] = useSubmitEventJoinRequestMutation();
  const [resolveJoinRequest] = useResolveEventJoinRequestMutation();
  const [resolvingState, setResolvingState] = useState<{ id: string; action: 'approve' | 'decline' } | null>(null);

  const [updateStatus] = useUpdateParticipantStatusMutation();
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();
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

  const handleApply = async () => {
    try {
      await submitJoinRequest(eventId).unwrap();
      toast.success(t('applySuccess'));
    } catch {
      toast.error(t('applyError'));
    }
  };

  const handleResolve = async (requestId: string, action: 'approve' | 'decline') => {
    setResolvingState({ id: requestId, action });
    try {
      await resolveJoinRequest({ eventId, requestId, action }).unwrap();
      toast.success(t('resolveSuccess'));
    } catch {
      toast.error(t('resolveError'));
    } finally {
      setResolvingState(null);
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

  const typeLabel = commonT(`eventTypes.${event.type}` as Parameters<typeof commonT>[0]);

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
              <span className={styles.label}>{commonT('description')}</span>
              <p className={styles.description}>{event.description}</p>
            </div>
          )}
        </div>

        <div className={styles.column}>
          {isCreator && (
            <div className={styles.requestsGroup}>
              <span className={styles.label}>{t('requests')}</span>
              {joinRequests.length === 0 ? (
                <p className={styles.empty}>{t('noRequests')}</p>
              ) : (
                joinRequests.map((req) => (
                  <EventJoinRequestItem
                    key={req.id}
                    request={req}
                    onAccept={() => handleResolve(req.id, 'approve')}
                    onDecline={() => handleResolve(req.id, 'decline')}
                    isAccepting={resolvingState?.id === req.id && resolvingState?.action === 'approve'}
                    isDeclining={resolvingState?.id === req.id && resolvingState?.action === 'decline'}
                    disabled={resolvingState?.id === req.id}
                  />
                ))
              )}
            </div>
          )}

          {canApply && (
            <Button
              type="button"
              variant="primary"
              onClick={handleApply}
              isLoading={isApplying}
            >
              {t('applyToParticipate')}
            </Button>
          )}

          {viewerHasPendingRequest && !isCreator && (
            <div className={styles.requestSentBadge}>{t('requestSent')}</div>
          )}

          <span className={styles.label}>
            {t('participants')}{!isParticipantsLoading && ` (${participants.length})`}
          </span>

          {isParticipantsLoading && <div className={styles.skeleton} />}

          {!isParticipantsLoading && participants.length === 0 && (
            <p className={styles.empty}>{t('noParticipants')}</p>
          )}

          {!isParticipantsLoading && participants.length > 0 && (
            <div className={styles.participantList}>
              {participants.map((p) => (
                <ParticipantItem
                  key={p.id}
                  participant={p}
                  isCurrentUser={p.user_id === currentUserId}
                  onConfirm={handleConfirm}
                  onDecline={handleDecline}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isCreator && (
        <div className={styles.footer}>
          <Button type="button" variant="secondary" onClick={() => setDeleteModalOpen(true)}>
            {commonT('delete')}
          </Button>
          <Button type="button" variant="primary" onClick={handleEdit}>
            {commonT('edit')}
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
        isLoading={isDeleting}
      />
    </div>
  );
};
