'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Image, Users, Settings } from 'lucide-react';
import { Guild, useCreateGuildMutation } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import styles from './EditGuildWizard.module.css';

interface GuildWizardProps {
  open: boolean;
  guild: Guild | null;
  onClose: () => void;
}

export const EditGuildWizard: React.FC<GuildWizardProps> = ({ open, guild, onClose }) => {
  const t = useTranslations('Guild');
  const commonT = useTranslations('Common');
  const isEdit = guild !== null;

  const [name, setName] = useState(guild?.name ?? '');
  const [description, setDescription] = useState(guild?.description ?? '');
  const [createGuild, { isLoading }] = useCreateGuildMutation();

  useEffect(() => {
    setName(guild?.name ?? '');
    setDescription(guild?.description ?? '');
  }, [guild]);

  const handleClose = () => {
    if (!isEdit) {
      setName('');
      setDescription('');
    }
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
              {isEdit ? t('editTitle') : t('createTitle')}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <div className={styles.column}>
              <form id="guild-wizard-form" onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="guild-wizard-name">{t('nameLabel')}</label>
                  <input
                    id="guild-wizard-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.input}
                    required
                    autoFocus
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="guild-wizard-description">{t('descriptionLabel')}</label>
                  <textarea
                    id="guild-wizard-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={styles.textarea}
                  />
                </div>
              </form>
            </div>

            <div className={styles.column}>
              <div className={styles.stubGroup}>
                <div className={styles.stubHeader}>
                  <Image size={16} />
                  <span className={styles.stubLabel}>{t('avatarSection')}</span>
                </div>
                <div className={styles.stubField}>{t('comingSoon')}</div>
              </div>

              <div className={styles.stubGroup}>
                <div className={styles.stubHeader}>
                  <Users size={16} />
                  <span className={styles.stubLabel}>{t('membersSection')}</span>
                </div>
                <div className={styles.stubField}>{t('comingSoon')}</div>
              </div>

              <div className={styles.stubGroup}>
                <div className={styles.stubHeader}>
                  <Settings size={16} />
                  <span className={styles.stubLabel}>{t('settingsSection')}</span>
                </div>
                <div className={styles.stubField}>{t('comingSoon')}</div>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button
              type={isEdit ? 'button' : 'submit'}
              variant="primary"
              form={isEdit ? undefined : 'guild-wizard-form'}
              disabled={isEdit || !name.trim() || isLoading}
            >
              {isEdit ? commonT('save') : isLoading ? t('creating') : t('submit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
