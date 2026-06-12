'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Switch } from '@/shared/ui/Switch';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
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
import {
  ABOUT_MAX,
  INTERESTS_MAX,
  ALIAS_MAX,
  type ProfileSettingsInput,
} from '../../model/types';
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

  const [alias, setAlias] = useState(initial.alias ?? '');
  const [displayAsAlias, setDisplayAsAlias] = useState(initial.displayAsAlias);
  const [icon, setIcon] = useState<string | null>(initial.icon);
  const [birthDate, setBirthDate] = useState(initial.birthDate ?? '');
  const [about, setAbout] = useState(initial.about ?? '');
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [interestDraft, setInterestDraft] = useState('');
  const [socials, setSocials] = useState<SocialLink[]>(initial.socials);
  const [privacy, setPrivacy] = useState(resolvePrivacy(initial.privacy));

  const addInterest = () => {
    const v = interestDraft.trim();
    if (v && interests.length < INTERESTS_MAX && !interests.includes(v)) {
      setInterests([...interests, v]);
    }
    setInterestDraft('');
  };

  const setSocial = (platform: SocialPlatform, value: string) => {
    setSocials((prev) => {
      const next = prev.filter((s) => s.platform !== platform);
      if (value.trim()) next.push({ platform, value });
      return next;
    });
  };

  const handleSave = async () => {
    const payload: ProfileSettingsInput = {
      alias,
      displayAsAlias,
      icon,
      birthDate,
      about,
      interests,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Profile settings" className={styles.dialog}>
      <div className={styles.section}>
        <label className={styles.toggleRow}>
          <span>Show me as alias</span>
          <Switch checked={displayAsAlias} onCheckedChange={setDisplayAsAlias} ariaLabel="Show me as alias" />
        </label>
        <Input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          maxLength={ALIAS_MAX}
          placeholder="Alias / character name"
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Icon after name</span>
        <IconPicker value={icon} onChange={(v: ProfileIcon | null) => setIcon(v)} />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Birth date</span>
        <Input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>About</span>
        <Textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          maxLength={ABOUT_MAX}
          rows={3}
          placeholder="A few words about yourself"
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Interests ({interests.length}/{INTERESTS_MAX})</span>
        <div className={styles.chips}>
          {interests.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.chip}
              onClick={() => setInterests(interests.filter((t) => t !== tag))}
            >
              {tag} ✕
            </button>
          ))}
        </div>
        <Input
          value={interestDraft}
          onChange={(e) => setInterestDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addInterest();
            }
          }}
          placeholder="Add interest and press Enter"
          disabled={interests.length >= INTERESTS_MAX}
        />
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

      <div className={styles.section}>
        <span className={styles.label}>Field privacy</span>
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

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSave} isLoading={isLoading}>Save</Button>
      </div>
    </Modal>
  );
};
