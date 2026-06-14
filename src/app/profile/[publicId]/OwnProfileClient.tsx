'use client';

import { useState } from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import {
  ProfileSettingsDialog,
  type ProfileSettingsInitial,
} from '@/features/update-profile-settings';
import { EditableInterests, INTERESTS_MAX } from '@/features/update-profile-interests';
import { ProfileBlock } from './ProfileBlocks';

export const OwnProfileSettings = ({ initial }: { initial: ProfileSettingsInitial }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon_sm"
        aria-label="Profile settings"
        onClick={() => setOpen(true)}
      >
        <Settings size={20} />
      </Button>
      <ProfileSettingsDialog isOpen={open} onClose={() => setOpen(false)} initial={initial} />
    </>
  );
};

/** Interests block whose title shows a `count/max` counter while editing. */
export const EditableInterestsBlock = ({
  initialInterests,
  userId,
}: {
  initialInterests: string[];
  userId: string;
}) => {
  const [meta, setMeta] = useState({ isEditing: false, count: initialInterests.length });
  const title = meta.isEditing ? `Interests (${meta.count}/${INTERESTS_MAX})` : 'Interests';
  return (
    <ProfileBlock icon={Sparkles} title={title}>
      <EditableInterests
        initialInterests={initialInterests}
        userId={userId}
        onEditStateChange={setMeta}
      />
    </ProfileBlock>
  );
};
