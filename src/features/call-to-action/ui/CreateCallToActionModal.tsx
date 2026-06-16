'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useCreateCallToActionMutation } from '@/entities/call-to-action';
import { CallToActionForm } from './CallToActionForm';
import type { CtaFormData } from '../model/schema';
import styles from './CreateCallToActionModal.module.css';

const FORM_ID = 'cta-create-form';

interface CreateCallToActionModalProps {
  open: boolean;
  onClose: () => void;
  guildId: string;
}

export const CreateCallToActionModal: React.FC<CreateCallToActionModalProps> = ({
  open,
  onClose,
  guildId,
}) => {
  const t = useTranslations('CallToAction');
  const commonT = useTranslations('Common');
  const [createCallToAction, { isLoading }] = useCreateCallToActionMutation();

  // Remount the form on each open so its internal state resets cleanly.
  const [session, setSession] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSession((s) => s + 1);
  }

  const handleSubmit = async (data: CtaFormData) => {
    try {
      await createCallToAction({
        guildId,
        input: {
          title: data.title,
          description: data.description,
          type: data.type,
          date: data.date,
          time: data.time,
          targetCount: data.targetCount,
        },
      }).unwrap();
      onClose();
    } catch {
      toast.error(t('createError'));
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t('createTitle')} className={styles.modal}>
      <CallToActionForm
        key={session}
        formId={FORM_ID}
        hideActions
        submitLabel={t('publishButton')}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onClose}>
          {commonT('cancel')}
        </Button>
        <Button type="submit" variant="primary" form={FORM_ID} isLoading={isLoading}>
          {t('publishButton')}
        </Button>
      </div>
    </Modal>
  );
};
