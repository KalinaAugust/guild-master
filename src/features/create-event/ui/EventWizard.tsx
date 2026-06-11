'use client';

import React, { useMemo, useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventModal } from '@/entities/calendar';
import {
  useCreateEventMutation,
  useUpdateEventMutation,
  useGetParticipantsQuery,
  useSyncParticipantsMutation,
} from '@/entities/event';
import { useGetGuildMembersQuery } from '@/entities/guild';
import { resolveDisplayName } from '@/entities/user';
import { Button } from '@/shared/ui/Button';
import { WizardDialog, WizardColumn } from '@/shared/ui/WizardDialog';
import { Input } from '@/shared/ui/Input';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import dayjs from '@/shared/lib/dayjs';
import { useWeekdayLabels } from '@/shared/lib/useWeekdayLabels';
import { EventForm } from './EventForm';
import { EventFormData } from '../model/types';
import styles from './EventWizard.module.css';

const FORM_ID = 'event-wizard-form';

export const EventWizard: React.FC<{ guildId?: string; isDayView?: boolean; userId?: string }> = ({
  guildId: propGuildId,
  isDayView,
  userId,
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
  const [filterQuery, setFilterQuery] = useState('');
  const [deferredQuery, setDeferredQuery] = useState('');
  const [, startTransition] = useTransition();

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

  const sortedMembers = useMemo(() => {
    if (!userId) return guildMembers;
    return [...guildMembers].sort((a, b) => {
      if (a.userId === userId) return -1;
      if (b.userId === userId) return 1;
      return 0;
    });
  }, [guildMembers, userId]);

  const filteredMembers = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return q
      ? sortedMembers.filter((m) =>
          (resolveDisplayName({ fullName: m.profile.fullName, alias: m.profile.alias, displayAsAlias: m.profile.displayAsAlias }) ?? '')
            .toLowerCase()
            .includes(q),
        )
      : sortedMembers;
  }, [deferredQuery, sortedMembers]);

  const handleClose = () => {
    setFilterQuery('');
    setDeferredQuery('');
    dispatch(closeEventModal());
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const visibleIds = useMemo(() => filteredMembers.map((m) => m.userId), [filteredMembers]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedParticipants.includes(id));

  const toggleSelectAll = () => {
    setSelectedParticipants((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])]
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
    <WizardDialog
      open={isOpen}
      onClose={handleClose}
      title={editingEvent ? t('editTitle') : t('createTitle')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {commonT('cancel')}
          </Button>
          <Button type="submit" variant="primary" form={FORM_ID} isLoading={isSaving}>
            {editingEvent ? commonT('save') : t('submit')}
          </Button>
        </>
      }
    >
      <WizardColumn>
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
      </WizardColumn>

      <WizardColumn>
              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>{t('wizard.repeatLabel')}</span>
                <div className={styles.dayToggles}>
                  {dayLabels.map((d) => (
                    <div key={d} className={styles.dayToggle}>{d}</div>
                  ))}
                </div>
              </div>

              <div className={`${styles.stubGroup} ${styles.invitedGroup}`}>
                <div className={styles.invitedHeader}>
                  <span className={styles.stubLabel}>{t('wizard.invitedLabel')}</span>
                  {filteredMembers.length > 0 && (
                    <button type="button" className={styles.selectAllButton} onClick={toggleSelectAll}>
                      {allVisibleSelected ? t('wizard.deselectAll') : t('wizard.selectAll')}
                    </button>
                  )}
                </div>
                {guildMembers.length === 0 ? (
                  <p className={styles.noMembers}>{t('wizard.noMembers')}</p>
                ) : (
                  <>
                    <Input
                      className={styles.memberFilter}
                      type="text"
                      value={filterQuery}
                      onChange={(e) => {
                        setFilterQuery(e.target.value);
                        startTransition(() => setDeferredQuery(e.target.value));
                      }}
                      placeholder={t('wizard.filterPlaceholder')}
                    />
                    <div className={styles.memberList}>
                    {filteredMembers.map((member) => {
                      const selected = selectedParticipants.includes(member.userId);
                      const memberName = resolveDisplayName({
                        fullName: member.profile.fullName,
                        alias: member.profile.alias,
                        displayAsAlias: member.profile.displayAsAlias,
                      });
                      return (
                        <div
                          key={member.userId}
                          className={`${styles.memberItem} ${selected ? styles.memberSelected : ''}`}
                          onClick={() => toggleParticipant(member.userId)}
                        >
                          <UserAvatar
                            avatarUrl={member.profile.avatarUrl}
                            name={memberName}
                            size="sm"
                          />
                          <span className={styles.memberName}>{memberName || member.userId}</span>
                          {selected && (
                            <span className={styles.memberCheck}>
                              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="11" cy="11" r="10" fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1.5"/>
                                <path d="M6.5 11L9.5 14L15.5 8" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </>
                )}
              </div>
      </WizardColumn>
    </WizardDialog>
  );
};
