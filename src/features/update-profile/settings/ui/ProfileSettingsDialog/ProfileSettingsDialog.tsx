'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { WizardDialog, WizardColumn } from '@/shared/ui/WizardDialog';
import { Button } from '@/shared/ui/Button';
import { Switch } from '@/shared/ui/Switch';
import { Input } from '@/shared/ui/Input';
import {
  type PrivacyField,
  type PrivacyLevel,
  type SocialLink,
  resolvePrivacy,
  SOCIAL_PLATFORMS,
  SOCIAL_META,
  type SocialPlatform,
  type ProfileIcon,
} from '@/entities/user';
import { type ProfileSettingsInput } from '../../model/types';
import { useUpdateProfileSettingsMutation } from '../../api/profileSettingsApi';
import { PrivacySelector } from '../PrivacySelector';
import { IconPicker } from '../IconPicker';
import styles from './ProfileSettingsDialog.module.css';

export interface ProfileSettingsInitial {
  alias: string | null;
  displayAsAlias: boolean;
  icon: string | null;
  birthDate: string | null;
  about: string | null;
  interests: string[];
  socials: SocialLink[];
  privacy: Record<PrivacyField, PrivacyLevel>;
}

const PRIVACY_FIELDS: PrivacyField[] = [
  'name',
  'alias',
  'about',
  'interests',
  'socials',
  'birth_date',
  'email',
  'joined',
  'common_guilds',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initial: ProfileSettingsInitial;
}

export const ProfileSettingsDialog = ({ isOpen, onClose, initial }: Props) => {
  const router = useRouter();
  const t = useTranslations('UpdateProfile');
  const tc = useTranslations('Common');
  const [updateSettings, { isLoading }] = useUpdateProfileSettingsMutation();

  const [displayAsAlias, setDisplayAsAlias] = useState(initial.displayAsAlias);
  const [icon, setIcon] = useState<string | null>(initial.icon);
  const [socials, setSocials] = useState<SocialLink[]>(initial.socials);
  const [privacy, setPrivacy] = useState(resolvePrivacy(initial.privacy));

  const setSocial = (platform: SocialPlatform, value: string) => {
    setSocials((prev) => {
      const next = prev.filter((s) => s.platform !== platform);
      if (value.trim()) next.push({ platform, value });
      return next;
    });
  };

  const handleSave = async () => {
    const payload: ProfileSettingsInput = {
      displayAsAlias,
      icon,
      socials,
      privacy,
    };
    try {
      await updateSettings(payload).unwrap();
      toast.success(t('settings.updated'));
      onClose();
      router.refresh();
    } catch {
      toast.error(t('settings.updateError'));
    }
  };

  return (
    <WizardDialog
      open={isOpen}
      onClose={onClose}
      title={t('settings.title')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>{tc('cancel')}</Button>
          <Button onClick={handleSave} isLoading={isLoading}>{tc('save')}</Button>
        </>
      }
    >
      <WizardColumn>
        <div className={styles.section}>
          <label className={styles.toggleRow}>
            <span>{t('settings.showAsAlias')}</span>
            <Switch checked={displayAsAlias} onCheckedChange={setDisplayAsAlias} ariaLabel={t('settings.showAsAlias')} />
          </label>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>{t('settings.iconAfterName')}</span>
          <IconPicker value={icon} onChange={(v: ProfileIcon | null) => setIcon(v)} />
        </div>

        <div className={styles.section}>
          <span className={styles.label}>{t('settings.socials')}</span>
          {SOCIAL_PLATFORMS.map((platform) => (
            <div key={platform} className={styles.socialRow}>
              <span className={styles.socialLabel}>{SOCIAL_META[platform].label}</span>
              <Input
                value={socials.find((s) => s.platform === platform)?.value ?? ''}
                onChange={(e) => setSocial(platform, e.target.value)}
                placeholder={t('settings.socialPlaceholder')}
              />
            </div>
          ))}
        </div>
      </WizardColumn>

      <WizardColumn>
        <div className={styles.section}>
          <span className={styles.label}>{t('settings.fieldPrivacy')}</span>
          <div className={styles.privacyList}>
            {PRIVACY_FIELDS.map((field) => (
              <div key={field} className={styles.privacyRow}>
                <span>{t(`settings.fields.${field}`)}</span>
                <PrivacySelector
                  value={privacy[field]}
                  onChange={(level) => setPrivacy({ ...privacy, [field]: level })}
                />
              </div>
            ))}
          </div>
        </div>
      </WizardColumn>
    </WizardDialog>
  );
};
