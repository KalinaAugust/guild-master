'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as Form from '@radix-ui/react-form';
import { Input } from '@/shared/ui/Input';
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { Switch } from '@/shared/ui/Switch';
import { FormField } from '@/shared/ui/FormField';
import { Modal } from '@/shared/ui/Modal';
import {
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
} from '@/entities/announcement';
import styles from './AnnouncementModal.module.css';

const FORM_ID = 'announcement-form';

interface AnnouncementModalProps {
  open: boolean;
  onClose: () => void;
  guildId: string;
  /** When set, the modal edits an existing announcement instead of creating one. */
  editing?: { id: string; title: string; content: string } | null;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  open,
  onClose,
  guildId,
  editing,
}) => {
  const t = useTranslations('Announcements');
  const commonT = useTranslations('Common');
  const [createAnnouncement, { isLoading: isCreating }] = useCreateAnnouncementMutation();
  const [updateAnnouncement, { isLoading: isUpdating }] = useUpdateAnnouncementMutation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  // Load the edited values whenever the dialog opens for a given target, using
  // React's render-phase "adjust state on prop change" pattern instead of an
  // effect (avoids cascading renders and the synchronous-setState lint error).
  const session = open ? `${editing?.id ?? 'new'}` : null;
  const [prevSession, setPrevSession] = useState(session);
  if (session !== prevSession) {
    setPrevSession(session);
    if (open) {
      setTitle(editing?.title ?? '');
      setContent(editing?.content ?? '');
      setIsPinned(false);
    }
  }

  const isLoading = isCreating || isUpdating;
  const isValid = title.trim() !== '' && content.trim() !== '';

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;
    try {
      if (editing) {
        await updateAnnouncement({
          guildId,
          announcementId: editing.id,
          input: { title, content },
        }).unwrap();
      } else {
        await createAnnouncement({ guildId, input: { title, content, isPinned } }).unwrap();
      }
      handleClose();
    } catch {
      toast.error(editing ? t('updateError') : t('createError'));
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={editing ? t('editTitle') : t('createTitle')}
      className={styles.modal}
      cancelText={commonT('cancel')}
      onCancel={handleClose}
      submitText={editing ? t('saveButton') : t('publishButton')}
      submitButtonProps={{
        type: 'submit',
        form: FORM_ID,
        disabled: !isValid,
        isLoading
      }}
    >
      <Form.Root id={FORM_ID} onSubmit={handleSubmit} className={styles.form}>
        <FormField name="title" label={t('titleLabel')} className={styles.formGroup}>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            required
            autoFocus
            maxLength={200}
          />
        </FormField>

        <div className={styles.editorHead}>
          <span className={styles.editorLabel}>{t('contentLabel')}</span>
        </div>

        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder={t('contentPlaceholder')}
        />

        {!editing && (
          <div className={styles.pinRow}>
            <span className={styles.pinLabel}>{t('pinLabel')}</span>
            <Switch checked={isPinned} onCheckedChange={setIsPinned} ariaLabel={t('pinLabel')} />
          </div>
        )}
      </Form.Root>
    </Modal>
  );
};
