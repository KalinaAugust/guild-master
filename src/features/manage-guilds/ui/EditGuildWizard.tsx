'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as Form from '@radix-ui/react-form';
import { X, Image as ImageIcon, Users, Settings, Trash2 } from 'lucide-react';
import { Guild, useCreateGuildMutation, useUpdateGuildMutation, useAddGuildMemberMutation, useDeleteGuildMutation } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { FormField } from '@/shared/ui/FormField';
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
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [pendingInput, setPendingInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [createGuild, { isLoading: isCreating }] = useCreateGuildMutation();
  const [updateGuild, { isLoading: isUpdating }] = useUpdateGuildMutation();
  const [addMember] = useAddGuildMemberMutation();
  const [deleteGuild, { isLoading: isDeleting }] = useDeleteGuildMutation();
  const isLoading = isCreating || isUpdating;

  const handleDeleteGuild = async () => {
    if (!guild) return;
    try {
      await deleteGuild(guild.id).unwrap();
      toast.success(t('deleteSuccess'));
      handleClose();
    } catch {
      toast.error(t('errorCreate'));
    }
  };

  const handleClose = () => {
    if (!isEdit) {
      setName('');
      setDescription('');
      setPendingEmails([]);
      setPendingInput('');
    }
    onClose();
  };

  const handleAddPending = (e: React.SubmitEvent) => {
    e.preventDefault();
    const email = pendingInput.trim();
    if (!email || pendingEmails.includes(email)) return;
    setPendingEmails((prev) => [...prev, email]);
    setPendingInput('');
  };

  const handleRemovePending = (email: string) => {
    setPendingEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (isEdit) {
        await updateGuild({ id: guild.id, name: name.trim(), description: description.trim() }).unwrap();
        toast.success(t('successUpdated'));
      } else {
        const newGuild = await createGuild({ name: name.trim(), description: description.trim() }).unwrap();
        if (pendingEmails.length > 0) {
          const results = await Promise.allSettled(
            pendingEmails.map((email) => addMember({ guildId: newGuild.id, email }).unwrap())
          );
          const failed = results.filter((r) => r.status === 'rejected').length;
          if (failed > 0) toast.error(`Failed to add ${failed} member(s)`);
        }
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
              <Form.Root id="guild-wizard-form" onSubmit={handleSubmit}>
                <FormField name="name" label={t('nameLabel')} className={styles.formGroup}>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </FormField>
                <FormField name="description" label={t('descriptionLabel')} className={styles.formGroup}>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </FormField>
              </Form.Root>
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
                  : (
                    <div>
                      <Form.Root onSubmit={handleAddPending} className={styles.pendingForm}>
                        <Input
                          type="email"
                          value={pendingInput}
                          onChange={(e) => setPendingInput(e.target.value)}
                          placeholder="user@example.com"
                          className={styles.pendingInput}
                        />
                        <Button type="submit" variant="primary" disabled={!pendingInput.trim()}>
                          Add
                        </Button>
                      </Form.Root>
                      {pendingEmails.length > 0 && (
                        <ul className={styles.pendingList}>
                          {pendingEmails.map((email) => (
                            <li key={email} className={styles.pendingItem}>
                              <span className={styles.pendingEmail}>{email}</span>
                              <button
                                type="button"
                                className={styles.pendingRemove}
                                onClick={() => handleRemovePending(email)}
                                aria-label="Remove"
                              >
                                <X size={12} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
              )}

              {activeTab === 'settings' && (
                <>
                  <div className={styles.stubGroup}>
                    <div className={styles.stubHeader}>
                      <ImageIcon size={16} aria-hidden="true" />
                      <span className={styles.stubLabel}>{t('avatarSection')}</span>
                    </div>
                    <div className={styles.stubField}>{t('comingSoon')}</div>
                  </div>

                  {isEdit && (
                    <div className={styles.dangerZone}>
                      <div className={styles.dangerZoneHeader}>
                        <Trash2 size={16} aria-hidden="true" />
                        <span className={styles.dangerZoneLabel}>{t('deleteLabel')}</span>
                      </div>
                      {showDeleteConfirm ? (
                        <div className={styles.deleteConfirm}>
                          <p className={styles.deleteConfirmText}>{t('deleteConfirm')}</p>
                          <div className={styles.deleteConfirmActions}>
                            <Button type="button" variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                              {commonT('cancel')}
                            </Button>
                            <Button type="button" variant="danger" onClick={handleDeleteGuild} disabled={isDeleting}>
                              {commonT('delete')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button type="button" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                          {t('deleteLabel')}
                        </Button>
                      )}
                    </div>
                  )}
                </>
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
