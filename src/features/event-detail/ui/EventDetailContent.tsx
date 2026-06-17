'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { toast } from 'sonner';
import { Gamepad2, Users, Calendar, PartyPopper, Dumbbell, Dices, Puzzle, CheckCircle } from 'lucide-react';
import { ActivityType } from '@/shared/types';
import { useAppDispatch } from '@/shared/lib/hooks';
import { openEventModal } from '@/entities/calendar';
import {
  useGetEventByIdQuery,
  useGetParticipantsQuery,
  useDeleteEventMutation,
  useUpdateEventMutation,
  useCreateEventMutation,
} from '@/entities/event';
import { useGuildPermissions } from '@/entities/guild';
import { Modal } from '@/shared/ui/Modal';
import { FormField } from '@/shared/ui/FormField';
import { DatePicker } from '@/shared/ui/DatePicker';
import { TimePicker } from '@/shared/ui/TimePicker';
import * as Form from '@radix-ui/react-form';
import { useWeekdayLabels } from '@/shared/lib/useWeekdayLabels';
import { Button } from '@/shared/ui/Button';
import { ListRowSkeleton } from '@/shared/ui/ListRowSkeleton';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Markdown } from '@/shared/ui/Markdown';
import { DetailLayout, DetailLayoutSkeleton } from '@/shared/ui/DetailLayout';
import {
  useUpdateParticipantStatusMutation,
  useAddSelfAsParticipantMutation,
  useLeaveEventMutation,
  useSubmitEventJoinRequestMutation,
  useGetEventJoinRequestsQuery,
  useResolveEventJoinRequestMutation,
} from '../api/detailApi';
import { ParticipantItem } from './ParticipantItem';
import { EventJoinRequestItem } from './EventJoinRequestItem';
import { CommentsTab } from './CommentsTab';
import { EventTabs } from './EventTabs';
import styles from './EventDetailContent.module.css';

const typeIcons: Record<ActivityType, React.ReactNode> = {
  game:    <Gamepad2 size={32} />,
  meeting: <Users size={32} />,
  other:   <Calendar size={32} />,
  party:   <PartyPopper size={32} />,
  sport:   <Dumbbell size={32} />,
  dnd:     <Dices size={32} />,
  boardgame: <Puzzle size={32} />,
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
  const pickerT = useTranslations('DateTimePicker');

  const { data, isLoading: isEventLoading } = useGetEventByIdQuery(eventId);
  const event = data?.event;

  const { data: participantsData, isLoading: isParticipantsLoading } =
    useGetParticipantsQuery(eventId, { skip: !event });
  const currentUserId = participantsData?.currentUserId ?? '';

  const { canManageEvents } = useGuildPermissions(data?.guildId ?? '', currentUserId);
  // Order: the viewer first, then confirmed participants, then everyone else.
  const participantRank = (p: { user_id: string; status: string }) =>
    p.user_id === currentUserId ? 0 : p.status === 'confirmed' ? 1 : 2;
  const participants = [...(participantsData?.participants ?? [])].sort(
    (a, b) => participantRank(a) - participantRank(b),
  );

  const isCreator = !!event && !!currentUserId && event.createdBy === currentUserId;

  const viewerIsGuildMember = participantsData?.viewerIsGuildMember ?? false;
  const viewerHasPendingRequest = participantsData?.viewerHasPendingRequest ?? false;
  const isParticipant =
    !!currentUserId && participants.some((p) => p.user_id === currentUserId);
  const canApply =
    !!currentUserId && viewerIsGuildMember && !isCreator && !isParticipant && !viewerHasPendingRequest;
  const canAddSelf = isCreator && !isParticipant;

  const currentUserStatus = participants.find((p) => p.user_id === currentUserId)?.status;
  const canReadComments =
    isCreator || currentUserStatus === 'pending' || currentUserStatus === 'confirmed';
  const canWriteComments = isCreator || currentUserStatus === 'confirmed';

  const { data: joinRequests = [] } = useGetEventJoinRequestsQuery(eventId, {
    skip: !isCreator,
  });
  const [addSelf, { isLoading: isAddingSelf }] = useAddSelfAsParticipantMutation();
  const [submitJoinRequest, { isLoading: isApplying }] = useSubmitEventJoinRequestMutation();
  const [resolveJoinRequest] = useResolveEventJoinRequestMutation();
  const [resolvingState, setResolvingState] = useState<{ id: string; action: 'approve' | 'decline' } | null>(null);

  const [updateStatus] = useUpdateParticipantStatusMutation();
  const [leaveEvent, { isLoading: isLeaving }] = useLeaveEventMutation();
  const [statusAction, setStatusAction] = useState<'confirmed' | 'declined' | null>(null);
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRecurringOpen, setDeleteRecurringOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [repeatDate, setRepeatDate] = useState('');
  const [repeatTime, setRepeatTime] = useState('');
  const [repeatErrors, setRepeatErrors] = useState<{ date?: string; time?: string }>({});
  const [createEvent, { isLoading: isCreatingEvent }] = useCreateEventMutation();

  const locale = useLocale();
  const dayLabels = useWeekdayLabels();

  const getDayLabel = (dayNum: number) => {
    const labelIdx = dayNum === 0 ? 6 : dayNum - 1;
    return dayLabels[labelIdx];
  };
  const eventDate = event ? dayjs(`${event.date} ${event.time}`).locale(locale) : null;

  const handleEdit = () => {
    if (!event) return;
    dispatch(openEventModal(event));
  };

  const handleConfirm = async () => {
    if (!event) return;
    setStatusAction('confirmed');
    try {
      await updateStatus({ eventId: event.id, status: 'confirmed' }).unwrap();
    } catch {
      toast.error(eventT('error'));
    } finally {
      setStatusAction(null);
    }
  };

  const handleDecline = async () => {
    if (!event) return;
    setStatusAction('declined');
    try {
      await updateStatus({ eventId: event.id, status: 'declined' }).unwrap();
    } catch {
      toast.error(eventT('error'));
    } finally {
      setStatusAction(null);
    }
  };

  const handleLeave = async () => {
    if (!event) return;
    try {
      await leaveEvent(event.id).unwrap();
      setLeaveModalOpen(false);
      toast.success(t('leaveSuccess'));
    } catch {
      toast.error(t('leaveError'));
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

  const handleAddSelf = async () => {
    try {
      await addSelf(eventId).unwrap();
      toast.success(t('addSelfSuccess'));
    } catch {
      toast.error(t('addSelfError'));
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
      const realId = event.id.split('_')[0];
      await deleteEvent(realId).unwrap();
      toast.success(eventT('successDeleted'));
      router.push(`/day/${event.date}?guildId=${data.guildId}`);
    } catch {
      toast.error(eventT('error'));
    }
  };

  const handleDeleteOnlyOccurrence = async () => {
    if (!event) return;
    const [realId, dateStr] = event.id.split('_');
    try {
      const currentExceptions = event.exceptions || [];
      const newExceptions = [...currentExceptions, dateStr];
      await updateEvent({
        id: realId,
        event: { exceptions: newExceptions }
      }).unwrap();
      toast.success(eventT('successDeleted'));
      router.push(`/day/${event.date}?guildId=${data.guildId}`);
    } catch {
      toast.error(eventT('error'));
    } finally {
      setDeleteRecurringOpen(false);
    }
  };

  const handleDeleteAllOccurrences = async () => {
    if (!event) return;
    const realId = event.id.split('_')[0];
    try {
      await deleteEvent(realId).unwrap();
      toast.success(eventT('successDeleted'));
      router.push(`/day/${event.date}?guildId=${data.guildId}`);
    } catch {
      toast.error(eventT('error'));
    } finally {
      setDeleteRecurringOpen(false);
    }
  };

  const handleRepeatClick = () => {
    if (!event) return;
    setRepeatDate(event.date);
    setRepeatTime(event.time);
    setRepeatErrors({});
    setRepeatModalOpen(true);
  };

  const handleRepeatSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!event || !data?.guildId) return;

    const errors: { date?: string; time?: string } = {};
    if (!repeatDate) errors.date = eventT('validation.dateRequired');
    if (!repeatTime) errors.time = eventT('validation.timeRequired');

    if (Object.keys(errors).length > 0) {
      setRepeatErrors(errors);
      return;
    }

    try {
      await createEvent({
        guild_id: data.guildId,
        title: event.title,
        description: event.description || '',
        type: event.type,
        date: repeatDate,
        time: repeatTime,
      }).unwrap();
      toast.success(eventT('successCreated'));
      setRepeatModalOpen(false);
    } catch {
      toast.error(eventT('error'));
    }
  };

  if (isEventLoading) {
    return <DetailLayoutSkeleton backLabel={commonT('backToDay')} />;
  }

  if (!event) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.empty}>{eventT('error')}</p>
      </div>
    );
  }

  const typeLabel = commonT(`eventTypes.${event.type}` as Parameters<typeof commonT>[0]);

  const participantsBlock = (
    <>
      <span className={styles.label}>
        {t('participants')}{!isParticipantsLoading && ` (${participants.length})`}
      </span>

      {canAddSelf && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={styles.addSelfButton}
          onClick={handleAddSelf}
          isLoading={isAddingSelf}
        >
          {t('addSelf')}
        </Button>
      )}

      {isParticipantsLoading && (
        <div className={styles.participantSkeleton}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ListRowSkeleton key={i} circle lines={1} />
          ))}
        </div>
      )}

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
              onLeave={() => setLeaveModalOpen(true)}
              isConfirming={statusAction === 'confirmed'}
              isDeclining={statusAction === 'declined'}
              isLeaving={isLeaving}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <DetailLayout
        backHref={`/day/${event.date}?guildId=${data.guildId}`}
        backLabel={commonT('backToDay')}
        title={event.title}
        rightClassName={canReadComments ? styles.columnRightTabs : undefined}
        left={
          <>
            <div className={styles.infoGroup}>
              <span className={styles.label}>{t('type')}</span>
              <div className={`${styles.typeHero} ${styles[`typeHero_${event.type}`]}`}>
                <span className={styles.typeHeroIcon}>{typeIcons[event.type]}</span>
                <span className={styles.typeHeroLabel}>{typeLabel}</span>
              </div>
            </div>

            <div className={styles.infoGroup}>
              <span className={styles.label}>{t('dateTime')}</span>
              <span className={styles.dateTime}>
                {eventDate?.format('dddd')}, <span className={styles.dateNum}>{eventDate?.format('D')}</span>{' '}
                {eventDate?.format('MMMM')} · <span className={styles.dateNum}>{eventDate?.format('HH:mm')}</span>
              </span>
            </div>

            {event.weekDays && event.weekDays.length > 0 && (
              <div className={styles.infoGroup}>
                <span className={styles.label}>{t('recurrence')}</span>
                <span className={styles.dateTime} style={{ color: 'var(--accent-secondary)' }}>
                  {t('recurrenceDays')}{' '}
                  <strong>
                    {event.weekDays
                      .map((d) => getDayLabel(d))
                      .join(', ')}
                  </strong>
                </span>
              </div>
            )}

            {event.description && (
              <div className={styles.infoGroup}>
                <span className={styles.label}>{commonT('description')}</span>
                <Markdown source={event.description} className={styles.description} />
              </div>
            )}
          </>
        }
        right={
          <>
            {isCreator && joinRequests.length > 0 && (
              <div className={styles.requestsGroup}>
                <span className={styles.label}>{t('requests')}</span>
                {joinRequests.map((req) => (
                  <EventJoinRequestItem
                    key={req.id}
                    request={req}
                    onAccept={() => handleResolve(req.id, 'approve')}
                    onDecline={() => handleResolve(req.id, 'decline')}
                    isAccepting={resolvingState?.id === req.id && resolvingState?.action === 'approve'}
                    isDeclining={resolvingState?.id === req.id && resolvingState?.action === 'decline'}
                    disabled={resolvingState?.id === req.id}
                  />
                ))}
              </div>
            )}

            {canApply && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={styles.actionButton}
                onClick={handleApply}
                isLoading={isApplying}
              >
                {t('applyToParticipate')}
              </Button>
            )}

            {viewerHasPendingRequest && !isCreator && (
              <div className={styles.requestSentBadge}>
                <CheckCircle size={20} />
                <span className={styles.requestSentLabel}>{t('requestSent')}</span>
              </div>
            )}

            {canReadComments ? (
              <EventTabs
                eventId={eventId}
                currentUserId={currentUserId}
                participants={participantsBlock}
                comments={
                  <CommentsTab
                    eventId={eventId}
                    canWrite={canWriteComments}
                    currentUserId={currentUserId}
                    viewerProfile={participants.find((p) => p.user_id === currentUserId)?.profile}
                  />
                }
              />
            ) : (
              participantsBlock
            )}
          </>
        }
        footer={
          canManageEvents || isCreator ? (
            <>
              {isCreator && (
                <Button 
                  type="button" 
                  variant="danger" 
                  onClick={() => {
                    if (event.id.includes('_')) {
                      setDeleteRecurringOpen(true);
                    } else {
                      setDeleteModalOpen(true);
                    }
                  }}
                >
                  {commonT('delete')}
                </Button>
              )}
              {canManageEvents && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRepeatClick}
                >
                  {eventT('repeatEvent')}
                </Button>
              )}
              {isCreator && (
                <Button type="button" variant="primary" onClick={handleEdit}>
                  {commonT('edit')}
                </Button>
              )}
            </>
          ) : undefined
        }
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={commonT('delete')}
        description={commonT('confirmDelete')}
        confirmLabel={commonT('delete')}
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onConfirm={handleLeave}
        title={t('leave')}
        description={t('confirmLeave')}
        confirmLabel={t('leave')}
        isLoading={isLeaving}
      />

      <Modal
        isOpen={deleteRecurringOpen}
        onClose={() => setDeleteRecurringOpen(false)}
        title={eventT('deleteOccurrenceTitle')}
      >
        <p style={{ marginBottom: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {eventT('deleteOccurrenceDesc')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => setDeleteRecurringOpen(false)}
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
            {eventT('deleteOnlyThis')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteAllOccurrences}
            isLoading={isDeleting}
            disabled={isUpdating}
          >
            {eventT('deleteAll')}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={repeatModalOpen}
        onClose={() => setRepeatModalOpen(false)}
        title={eventT('repeatEventTitle')}
      >
        {event && (
          <Form.Root onSubmit={handleRepeatSubmit} className={styles.repeatForm}>
            <p className={styles.modalDesc}>
              {event.title}
            </p>
            <div className={styles.formRow}>
              <FormField name="date" label={eventT('dateLabel')} error={repeatErrors.date}>
                <DatePicker
                  value={repeatDate}
                  onChange={setRepeatDate}
                  locale={locale}
                  hasError={!!repeatErrors.date}
                  placeholder={pickerT('selectDate')}
                  labels={{ open: pickerT('openCalendar') }}
                />
              </FormField>
              <FormField name="time" label={eventT('timeLabel')} error={repeatErrors.time}>
                <TimePicker
                  value={repeatTime}
                  onChange={setRepeatTime}
                  hasError={!!repeatErrors.time}
                  placeholder={pickerT('selectTime')}
                  labels={{
                    open: pickerT('openTime'),
                    hours: pickerT('hours'),
                    minutes: pickerT('minutes'),
                  }}
                />
              </FormField>
            </div>
            <div className={styles.formActions}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setRepeatModalOpen(false)}
                disabled={isCreatingEvent}
              >
                {commonT('cancel')}
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isCreatingEvent}
              >
                {eventT('repeatEvent')}
              </Button>
            </div>
          </Form.Root>
        )}
      </Modal>
    </>
  );
};
