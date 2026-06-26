'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useAppSelector } from '@/shared/lib/hooks';
import { useGuildPermissions } from '@/entities/guild';
import { AiHelperModal, Message } from './AiHelperModal';
import styles from './AiHelperButton.module.css';

interface AiHelperButtonProps {
  userId: string;
}

export const AiHelperButton = ({ userId }: AiHelperButtonProps) => {
  const t = useTranslations('AiHelper');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const guildId = useAppSelector((state) => state.guild.currentGuildId);
  const { canCreateEvents, canEditEvents } = useGuildPermissions(guildId, userId);

  if (!canCreateEvents && !canEditEvents) return null;

  return (
    <>
      <Tooltip content={t('tooltip')} side="bottom">
        <button
          className={styles.button}
          onClick={() => setIsModalOpen(true)}
          aria-label="AI helper"
        >
          <Bot size={20} />
        </button>
      </Tooltip>
      <AiHelperModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        messages={messages}
        setMessages={setMessages}
      />
    </>
  );
};
