'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Image, Users, Settings } from 'lucide-react';
import { Guild } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import styles from './EditGuildWizard.module.css';

interface EditGuildWizardProps {
  guild: Guild | null;
  onClose: () => void;
}

export const EditGuildWizard: React.FC<EditGuildWizardProps> = ({ guild, onClose }) => {
  const t = useTranslations('Guild');
  const commonT = useTranslations('Common');

  return (
    <DialogPrimitive.Root open={guild !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className={styles.overlay} aria-describedby={undefined}>
          <div className={styles.header}>
            <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
              <X size={20} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className={styles.title}>
              {t('editTitle')}
            </DialogPrimitive.Title>
          </div>

          <div className={styles.body}>
            <div className={styles.column}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-guild-name">{t('nameLabel')}</label>
                <input
                  id="edit-guild-name"
                  type="text"
                  defaultValue={guild?.name ?? ''}
                  className={styles.input}
                  readOnly
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-guild-description">{t('descriptionLabel')}</label>
                <textarea
                  id="edit-guild-description"
                  defaultValue={guild?.description ?? ''}
                  className={styles.textarea}
                  readOnly
                />
              </div>
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
            <Button type="button" variant="secondary" onClick={onClose}>
              {commonT('cancel')}
            </Button>
            <Button type="button" variant="primary" disabled>
              {commonT('save')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
