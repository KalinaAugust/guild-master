'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Tooltip } from '@/shared/ui/Tooltip';
import { AiHelperModal } from './AiHelperModal';
import styles from './AiHelperButton.module.css';

export const AiHelperButton = () => {
  const t = useTranslations('AiHelper');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      <AiHelperModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
