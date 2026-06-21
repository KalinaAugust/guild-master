'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as Form from '@radix-ui/react-form';
import { X, Image as ImageIcon, Users, Settings, Trash2, ShieldCheck } from 'lucide-react';
import { Guild, useCreateGuildMutation, useUpdateGuildMutation, useAddGuildMemberMutation, useDeleteGuildMutation, uploadGuildAvatar } from '@/entities/guild';
import { useGuildPermissions } from '@/entities/guild';
import { Select } from '@/shared/ui/Select';
import { GUILD_ACTIONS, DEFAULT_PERMISSIONS, resolveLevel, type GuildAction, type PermissionLevel, type GuildPermissions } from '@/shared/api/guildPermissions';
import { Button } from '@/shared/ui/Button';
import { WizardDialog, WizardColumn } from '@/shared/ui/WizardDialog';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { FormField } from '@/shared/ui/FormField';
import { GuildMembersSection } from '@/widgets/guild-members';
import { GuildAvatarUpload } from './GuildAvatarUpload';
import styles from './EditGuildWizard.module.css';

type Tab = 'members' | 'settings';

interface GuildWizardProps {
  open: boolean;
  guild: Guild | null;
  onClose: () => void;
  userId: string;
}

export const EditGuildWizard: React.FC<GuildWizardProps> = ({ open, guild, onClose, userId }) => {
  const t = useTranslations('Guild');
  const commonT = useTranslations('Common');
  const isEdit = guild !== null;

  const [name, setName] = useState(guild?.name ?? '');
  const [description, setDescription] = useState(guild?.description ?? '');
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [pendingInput, setPendingInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [createGuild, { isLoading: isCreating }] = useCreateGuildMutation();
  const [updateGuild, { isLoading: isUpdating }] = useUpdateGuildMutation();
  const [addMember] = useAddGuildMemberMutation();
  const [deleteGuild, { isLoading: isDeleting }] = useDeleteGuildMutation();
  const isLoading = isCreating || isUpdating || isUploadingAvatar;

  const { isOwner } = useGuildPermissions(guild?.id, userId);
  const canEditPermissions = isEdit ? isOwner : true;

  const [permissions, setPermissions] = useState<GuildPermissions>(() => {
    const base = (guild?.permissions ?? {}) as GuildPermissions;
    return Object.fromEntries(
      GUILD_ACTIONS.map((a) => [a, base[a] ?? DEFAULT_PERMISSIONS[a]]),
    ) as GuildPermissions;
  });

  const actionLabel: Record<GuildAction, string> = {
    events: t('permEvents'),
    announcements: t('permAnnouncements'),
    polls: t('permPolls'),
    call_to_actions: t('permCallToActions'),
  };
  const levelOptions: { label: string; value: PermissionLevel }[] = [
    { label: t('permLevelAll'), value: 'all' },
    { label: t('permLevelOfficers'), value: 'officers' },
    { label: t('permLevelOwner'), value: 'owner' },
  ];

  const handleSelectAvatar = (blob: Blob) => {
    setAvatarBlob(blob);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  };

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
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarBlob(null);
    setAvatarPreview(null);
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
        let avatarUrl: string | undefined;
        if (avatarBlob) {
          setIsUploadingAvatar(true);
          avatarUrl = await uploadGuildAvatar(guild.id, avatarBlob);
        }
        await updateGuild({
          id: guild.id,
          name: name.trim(),
          description: description.trim(),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
          permissions,
        }).unwrap();
        toast.success(t('successUpdated'));
      } else {
        const newGuild = await createGuild({ name: name.trim(), description: description.trim() }).unwrap();
        let avatarUrl: string | undefined;
        if (avatarBlob) {
          setIsUploadingAvatar(true);
          avatarUrl = await uploadGuildAvatar(newGuild.id, avatarBlob);
        }
        await updateGuild({
          id: newGuild.id,
          name: name.trim(),
          description: description.trim(),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
          permissions,
        }).unwrap();
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
    } catch (err) {
      const status = (err as { status?: number })?.status;
      toast.error(status === 403 ? t('errorLimit') : t('errorCreate'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <WizardDialog
      open={open}
      onClose={handleClose}
      title={isEdit ? t('editTitle') : t('createTitle')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {commonT('cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            form="guild-wizard-form"
            isLoading={isLoading}
            disabled={!name.trim()}
          >
            {isEdit
              ? isLoading ? commonT('saving') : commonT('save')
              : isLoading ? t('creating') : t('submit')}
          </Button>
        </>
      }
    >
      <WizardColumn>
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
                    rows={8}
                  />
                </FormField>
              </Form.Root>
      </WizardColumn>

      <WizardColumn>
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
                  ? <GuildMembersSection guildId={guild.id} userId={userId} fill />
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
                    <GuildAvatarUpload
                      avatarUrl={avatarPreview ?? guild?.avatarUrl ?? null}
                      onSelect={handleSelectAvatar}
                      disabled={isLoading}
                    />
                  </div>

                  {canEditPermissions && (
                    <div className={styles.permGroup}>
                      <div className={styles.stubHeader}>
                        <ShieldCheck size={16} aria-hidden="true" />
                        <span className={styles.stubLabel}>{t('permissionsSection')}</span>
                      </div>
                      <ul className={styles.permList}>
                        {GUILD_ACTIONS.map((action) => (
                          <li key={action} className={styles.permRow}>
                            <span className={styles.permRowLabel}>{actionLabel[action]}</span>
                            <Select
                              value={resolveLevel(permissions, action)}
                              onValueChange={(v) =>
                                setPermissions((prev) => ({ ...prev, [action]: v as PermissionLevel }))
                              }
                              options={levelOptions}
                              className={styles.permSelect}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

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
                            <Button type="button" variant="danger" onClick={handleDeleteGuild} isLoading={isDeleting}>
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
      </WizardColumn>
    </WizardDialog>
  );
};
