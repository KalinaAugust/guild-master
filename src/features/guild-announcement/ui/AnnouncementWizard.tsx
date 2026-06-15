'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as Form from '@radix-ui/react-form';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Switch } from '@/shared/ui/Switch';
import { FormField } from '@/shared/ui/FormField';
import { WizardDialog, WizardColumn } from '@/shared/ui/WizardDialog';
import { Markdown } from '@/shared/ui/Markdown';
import {
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
} from '@/entities/announcement';
import styles from './AnnouncementWizard.module.css';

const FORM_ID = 'announcement-wizard-form';

interface AnnouncementWizardProps {
  open: boolean;
  onClose: () => void;
  guildId: string;
  /** When set, the wizard edits an existing announcement instead of creating one. */
  editing?: { id: string; title: string; content: string } | null;
}

export const AnnouncementWizard: React.FC<AnnouncementWizardProps> = ({
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
  const [tab, setTab] = useState<'write' | 'preview'>('write');

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
      setTab('write');
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
    <WizardDialog
      open={open}
      onClose={handleClose}
      title={editing ? t('editTitle') : t('createTitle')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {commonT('cancel')}
          </Button>
          <Button type="submit" variant="primary" form={FORM_ID} disabled={!isValid} isLoading={isLoading}>
            {editing ? t('saveButton') : t('publishButton')}
          </Button>
        </>
      }
    >
      <WizardColumn className={styles.column}>
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
            <div className={styles.tabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'write'}
                className={`${styles.tab} ${tab === 'write' ? styles.tabActive : ''}`}
                onClick={() => setTab('write')}
              >
                {t('write')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'preview'}
                className={`${styles.tab} ${tab === 'preview' ? styles.tabActive : ''}`}
                onClick={() => setTab('preview')}
              >
                {t('preview')}
              </button>
            </div>
          </div>

          {tab === 'write' ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('contentPlaceholder')}
              className={styles.editor}
              rows={10}
              maxLength={10000}
            />
          ) : (
            <div className={styles.preview}>
              {content.trim() ? <Markdown source={content} /> : <p className={styles.previewEmpty}>{t('previewEmpty')}</p>}
            </div>
          )}

          {!editing && (
            <div className={styles.pinRow}>
              <span className={styles.pinLabel}>{t('pinLabel')}</span>
              <Switch checked={isPinned} onCheckedChange={setIsPinned} ariaLabel={t('pinLabel')} />
            </div>
          )}
        </Form.Root>
      </WizardColumn>
    </WizardDialog>
  );
};
