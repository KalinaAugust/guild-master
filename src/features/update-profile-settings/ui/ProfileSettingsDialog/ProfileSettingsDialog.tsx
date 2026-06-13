'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

const PRIVACY_ROWS: { field: PrivacyField; label: string }[] = [
  { field: 'name', label: 'Real name' },
  { field: 'alias', label: 'Alias' },
  { field: 'about', label: 'About' },
  { field: 'interests', label: 'Interests' },
  { field: 'socials', label: 'Socials' },
  { field: 'birth_date', label: 'Birth date' },
  { field: 'email', label: 'Email' },
  { field: 'joined', label: 'Join date' },
  { field: 'common_guilds', label: 'Common guilds' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initial: ProfileSettingsInitial;
}

export const ProfileSettingsDialog = ({ isOpen, onClose, initial }: Props) => {
  const router = useRouter();
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
      toast.success('Profile updated');
      onClose();
      router.refresh();
    } catch {
      toast.error('Failed to update profile');
    }
  };

  return (
    <WizardDialog
      open={isOpen}
      onClose={onClose}
      title="Profile settings"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSave} isLoading={isLoading}>Save</Button>
        </>
      }
    >
      <WizardColumn>
        <div className={styles.section}>
          <label className={styles.toggleRow}>
            <span>Show me as alias</span>
            <Switch checked={displayAsAlias} onCheckedChange={setDisplayAsAlias} ariaLabel="Show me as alias" />
          </label>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Icon after name</span>
          <IconPicker value={icon} onChange={(v: ProfileIcon | null) => setIcon(v)} />
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Socials</span>
          {SOCIAL_PLATFORMS.map((platform) => (
            <div key={platform} className={styles.socialRow}>
              <span className={styles.socialLabel}>{SOCIAL_META[platform].label}</span>
              <Input
                value={socials.find((s) => s.platform === platform)?.value ?? ''}
                onChange={(e) => setSocial(platform, e.target.value)}
                placeholder="handle or link"
              />
            </div>
          ))}
        </div>
      </WizardColumn>

      <WizardColumn>
        <div className={styles.section}>
          <span className={styles.label}>Field privacy</span>
          <div className={styles.privacyList}>
            {PRIVACY_ROWS.map(({ field, label }) => (
              <div key={field} className={styles.privacyRow}>
                <span>{label}</span>
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
