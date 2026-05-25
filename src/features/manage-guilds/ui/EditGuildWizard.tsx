'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Image as ImageIcon, Users, Settings } from 'lucide-react';
import { Guild, useCreateGuildMutation, useUpdateGuildMutation } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import { GuildMembersSection } from './GuildMembersSection';
import styles from './EditGuildWizard.module.css';

type Tab = 'members' | 'settings';

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
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [createGuild, { isLoading: isCreating }] = useCreateGuildMutation();
  const [updateGuild, { isLoading: isUpdating }] = useUpdateGuildMutation();
  const isLoading = isCreating || isUpdating;

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
      if (isEdit) {
        await updateGuild({ id: guild.id, name: name.trim(), description: description.trim() }).unwrap();
        toast.success(t('successUpdated'));
      } else {
        await createGuild({ name: name.trim(), description: description.trim() }).unwrap();
        toast.success(t('successCreated'));
      }
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
              <div className={styles.tabBar}>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'members' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('members')}
                >
                  <Users size={15} />
                  {t('membersSection')}
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings size={15} />
                  {t('settingsSection')}
                </button>
              </div>

              {activeTab === 'members' && (
                guild
                  ? <GuildMembersSection guildId={guild.id} />
                  : <p className={styles.tabEmpty}>Save guild first to manage members.</p>
              )}

              {activeTab === 'settings' && (
                <div className={styles.stubGroup}>
                  <div className={styles.stubHeader}>
                    <ImageIcon size={16} aria-hidden="true" />
                    <span className={styles.stubLabel}>{t('avatarSection')}</span>
                  </div>
                  <div className={styles.stubField}>{t('comingSoon')}</div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {commonT('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              form="guild-wizard-form"
              disabled={!name.trim() || isLoading}
            >
              {isEdit
                ? isLoading ? commonT('saving') : commonT('save')
                : isLoading ? t('creating') : t('submit')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
