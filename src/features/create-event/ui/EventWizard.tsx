'use client';

import React, { useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventModal } from '@/entities/calendar';
import { createEventThunk, updateEventThunk } from '@/entities/event';
import { Button } from '@/shared/ui/Button';
import dayjs from '@/shared/lib/dayjs';
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

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    dispatch(closeEventModal());
  };

  const handleSubmit = (data: EventFormData) => {
    if (!activeGuildId) {
      toast.error(t('error'));
      return;
    }

    if (editingEvent) {
      dispatch(updateEventThunk({ id: editingEvent.id, event: data })).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          toast.success(t('successUpdated'));
          handleClose();
        } else {
          toast.error(t('error'));
        }
      });
    } else {
      dispatch(createEventThunk({ ...data, guild_id: activeGuildId })).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          toast.success(t('successCreated'));
          handleClose();
        } else {
          toast.error(t('error'));
        }
      });
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
              <p className={styles.columnTitle}>{t('wizard.mainColumn')}</p>
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
              <p className={styles.columnTitle}>{t('wizard.additionalColumn')}</p>

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
                  {DAY_LABELS.map((d) => (
                    <div key={d} className={styles.dayToggle}>{d}</div>
                  ))}
                </div>
              </div>

              <div className={styles.stubGroup}>
                <span className={styles.stubLabel}>{t('wizard.invitedLabel')}</span>
                <div className={styles.stubField}>{t('wizard.invitedPlaceholder')}</div>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button type="submit" variant="primary" form={FORM_ID}>
              {editingEvent ? commonT('save') : t('submit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
