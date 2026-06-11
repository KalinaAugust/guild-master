'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import {
  ProfileSettingsDialog,
  type ProfileSettingsInitial,
} from '@/features/update-profile-settings';

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
