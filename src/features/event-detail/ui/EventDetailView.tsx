'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventDetail, openEventModal } from '@/entities/calendar';
import { useGetParticipantsQuery } from '@/entities/event';
import { Button } from '@/shared/ui/Button';
import { useUpdateParticipantStatusMutation } from '../api/detailApi';
import { ParticipantItem } from './ParticipantItem';
import styles from './EventDetailView.module.css';

export const EventDetailView: React.FC = () => {
  const dispatch = useAppDispatch();
  const t = useTranslations('EventDetail');
  const commonT = useTranslations('Common');
  const eventT = useTranslations('Event');

  const isOpen = useAppSelector((state) => state.ui.isEventDetailOpen);
  const event = useAppSelector((state) => state.ui.viewingEvent);

  const { data, isLoading } = useGetParticipantsQuery(event?.id ?? '', {
    skip: !isOpen || !event,
  });
  const participants = data?.participants ?? [];
  const currentUserId = data?.currentUserId ?? '';

  const [updateStatus] = useUpdateParticipantStatusMutation();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => dispatch(closeEventDetail());

  const handleEdit = () => {
    if (!event) return;
    dispatch(closeEventDetail());
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

  const typeLabel = event ? eventT(`types.${event.type}` as Parameters<typeof eventT>[0]) : '';

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className={styles.overlay} aria-describedby={undefined}>
          <div className={styles.header}>
            <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
              <X size={20} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className={styles.title}>
              {event?.title}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <div className={styles.column}>
              <div className={styles.infoGroup}>
                <span className={styles.label}>{t('type')}</span>
                <span className={`${styles.typeBadge} ${event?.type ? styles[`type_${event.type}`] : ''}`}>
                  {typeLabel}
                </span>
              </div>

              <div className={styles.infoGroup}>
                <span className={styles.label}>{t('dateTime')}</span>
                <span className={styles.dateTime}>
                  <span>{event?.date}</span>
                  {' '}
                  <span>{event?.time}</span>
                </span>
              </div>

              {event?.description && (
                <div className={styles.infoGroup}>
                  <span className={styles.label}>{t('description')}</span>
                  <p className={styles.description}>{event.description}</p>
                </div>
              )}
            </div>

            <div className={styles.column}>
              <span className={styles.label}>
                {t('participants')} {!isLoading && `(${participants.length})`}
              </span>

              {isLoading && <div className={styles.skeleton} />}

              {!isLoading && participants.length === 0 && (
                <p className={styles.empty}>{t('noParticipants')}</p>
              )}

              {!isLoading &&
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

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={handleEdit}>
              {t('edit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
