'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useCreateGuildMutation } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import styles from './CreateGuildWizard.module.css';

interface CreateGuildWizardProps {
  open: boolean;
  onClose: () => void;
}

export const CreateGuildWizard: React.FC<CreateGuildWizardProps> = ({ open, onClose }) => {
  const t = useTranslations('Guild');
  const commonT = useTranslations('Common');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createGuild, { isLoading }] = useCreateGuildMutation();

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createGuild({ name: name.trim(), description: description.trim() }).unwrap();
      toast.success(t('successCreated'));
      handleClose();
    } catch {
      toast.error(t('errorCreate'));
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className={styles.overlay} aria-describedby={undefined}>
          <div className={styles.header}>
            <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
              <X size={20} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className={styles.title}>
              {t('createTitle')}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <form id="create-guild-form" onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="guild-name">{t('nameLabel')}</label>
                <input
                  id="guild-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="guild-description">{t('descriptionLabel')}</label>
                <textarea
                  id="guild-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.textarea}
                />
              </div>
            </form>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              form="create-guild-form"
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? t('creating') : t('submit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
