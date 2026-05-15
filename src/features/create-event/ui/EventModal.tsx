'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventModal } from '@/entities/calendar';
import { createEventThunk, updateEventThunk } from '@/entities/event';
import { Modal } from '@/shared/ui/Modal';
import dayjs from '@/shared/lib/dayjs';
import { EventForm } from './EventForm';
import { EventFormData } from '../model/types';

export const EventModal: React.FC<{ guildId: string, isDayView?: boolean }> = ({ guildId, isDayView }) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isEventModalOpen);
  const selectedDate = useAppSelector((state) => state.ui.selectedDate);
  const editingEvent = useAppSelector((state) => state.ui.editingEvent);
  
  const t = useTranslations('Event');
  const commonT = useTranslations('Common');

  const handleClose = () => {
    dispatch(closeEventModal());
  };

  const handleSubmit = (data: EventFormData) => {
    if (editingEvent) {
      dispatch(updateEventThunk({
        id: editingEvent.id,
        event: data
      })).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          toast.success(t('successUpdated'));
        } else {
          toast.error(t('error'));
        }
      });
    } else {
      dispatch(createEventThunk({
        ...data,
        guild_id: guildId,
      })).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          toast.success(t('successCreated'));
        } else {
          toast.error(t('error'));
        }
      });
    }
    handleClose();
  };

  const initialData = useMemo(() => {
    if (editingEvent) return editingEvent;
    if (selectedDate) return { date: dayjs(selectedDate).format('YYYY-MM-DD') };
    return undefined;
  }, [editingEvent, selectedDate]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={editingEvent ? t('editTitle') : t('createTitle')}
    >
      {/* Use key to force re-render when modal opens or editingEvent changes */}
      {isOpen && (
        <EventForm 
          key={editingEvent?.id || selectedDate || 'new'}
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          submitLabel={editingEvent ? commonT('save') : t('submit')}
          isDayView={isDayView}
          isEdit={!!editingEvent}
        />
      )}
    </Modal>
  );
};
