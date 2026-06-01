'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventModal } from '@/entities/calendar';
import {
  useCreateEventMutation,
  useUpdateEventMutation,
  useGetParticipantsQuery,
  useSyncParticipantsMutation,
} from '@/entities/event';
import { useGetGuildMembersQuery } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import dayjs from '@/shared/lib/dayjs';
import { useWeekdayLabels } from '@/shared/lib/useWeekdayLabels';
import { EventForm } from './EventForm';
import { EventFormData } from '../model/types';
import styles from './EventWizard.module.css';

const COLOR_DOTS = [
  { cls: styles.colorDotPurple, label: 'Purple' },
  { cls: styles.colorDotPink,   label: 'Pink' },
  { cls: styles.colorDotGreen,  label: 'Green' },
  { cls: styles.colorDotOrange, label: 'Orange' },
  { cls: styles.colorDotBlue,   label: 'Blue' },
];

const FORM_ID = 'event-wizard-form';

export const EventWizard: React.FC<{ guildId?: string; isDayView?: boolean }> = ({
  guildId: propGuildId,
  isDayView,
}) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isEventModalOpen);
  const selectedDate = useAppSelector((state) => state.ui.selectedDate);
  const editingEvent = useAppSelector((state) => state.ui.editingEvent);
  const currentGuildId = useAppSelector((state) => state.guild.currentGuildId);

  const activeGuildId = currentGuildId || propGuildId;

  const t = useTranslations('Event');
  const commonT = useTranslations('Common');
  const dayLabels = useWeekdayLabels();

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const { data: guildMembers = [] } = useGetGuildMembersQuery(activeGuildId ?? '', {
    skip: !isOpen || !activeGuildId,
  });

  const { data: participantsData } = useGetParticipantsQuery(editingEvent?.id ?? '', {
    skip: !isOpen || !editingEvent,
  });

  const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const [syncParticipants, { isLoading: isSyncing }] = useSyncParticipantsMutation();

  const isSaving = isCreating || isUpdating || isSyncing;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (participantsData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedParticipants(participantsData.participants.map((p) => p.user_id));
    } else if (!editingEvent) {
      setSelectedParticipants([]);
    }
  }, [participantsData, editingEvent]);

  const handleClose = () => dispatch(closeEventModal());

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (data: EventFormData) => {
    if (!activeGuildId) {
      toast.error(t('error'));
      return;
    }
    try {
      if (editingEvent) {
        await updateEvent({ id: editingEvent.id, event: data }).unwrap();
        await syncParticipants({ eventId: editingEvent.id, userIds: selectedParticipants }).unwrap();
        toast.success(t('successUpdated'));
      } else {
        const newEvent = await createEvent({ ...data, guild_id: activeGuildId }).unwrap();
        await syncParticipants({ eventId: newEvent.id, userIds: selectedParticipants }).unwrap();
        toast.success(t('successCreated'));
      }
      handleClose();
    } catch {
      toast.error(t('error'));
    }
  };

  const initialData = useMemo(() => {
    if (editingEvent) return editingEvent;
    if (selectedDate) return { date: dayjs(selectedDate).format('YYYY-MM-DD') };
    return undefined;
  }, [editingEvent, selectedDate]);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className={styles.overlay} aria-describedby={undefined}>
          <div className={styles.header}>
            <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
              <X size={20} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className={styles.title}>
              {editingEvent ? t('editTitle') : t('createTitle')}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <div className={styles.column}>
              {isOpen && (
                <EventForm
                  key={editingEvent?.id || selectedDate || 'new'}
                  initialData={initialData}
                  onSubmit={handleSubmit}
                  onCancel={handleClose}
                  submitLabel={editingEvent ? commonT('save') : t('submit')}
                  isDayView={isDayView}
                  isEdit={!!editingEvent}
                  hideActions
                  formId={FORM_ID}
                />
              )}
            </div>

            <div className={styles.column}>
              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>{t('wizard.iconLabel')}</span>
                <div className={styles.stubField}>{t('wizard.iconPlaceholder')}</div>
              </div>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>{t('wizard.colorLabel')}</span>
                <div className={styles.colorDots}>
                  {COLOR_DOTS.map(({ cls, label }) => (
                    <div key={label} className={`${styles.colorDot} ${cls}`} />
                  ))}
                </div>
              </div>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>{t('wizard.repeatLabel')}</span>
                <div className={styles.dayToggles}>
                  {dayLabels.map((d) => (
                    <div key={d} className={styles.dayToggle}>{d}</div>
                  ))}
                </div>
              </div>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>{t('wizard.invitedLabel')}</span>
                {guildMembers.length === 0 ? (
                  <p className={styles.noMembers}>{t('wizard.noMembers')}</p>
                ) : (
                  <div className={styles.memberList}>
                    {guildMembers.map((member) => {
                      const initials = (member.profile.fullName || '?')
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase();
                      const selected = selectedParticipants.includes(member.userId);
                      return (
                        <div
                          key={member.userId}
                          className={`${styles.memberItem} ${selected ? styles.memberSelected : ''}`}
                          onClick={() => toggleParticipant(member.userId)}
                        >
                          <div className={styles.memberAvatar}>{initials}</div>
                          <span className={styles.memberName}>{member.profile.fullName || member.userId}</span>
                          {selected && <span className={styles.memberCheck}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button type="submit" variant="primary" form={FORM_ID} isLoading={isSaving}>
              {editingEvent ? commonT('save') : t('submit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
