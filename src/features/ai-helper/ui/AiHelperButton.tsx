'use client';

import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { useSendTestMessageMutation } from '../api/aiHelperApi';
import styles from './AiHelperButton.module.css';

export const AiHelperButton = () => {
  const [sendTestMessage, { isLoading }] = useSendTestMessageMutation();

  const handleClick = async () => {
    try {
      const result = await sendTestMessage().unwrap();
      toast.success(result.message);
    } catch {
      toast.error('AI helper failed to respond');
    }
  };

  return (
    <button
      className={styles.button}
      onClick={handleClick}
      disabled={isLoading}
      aria-label="AI helper"
    >
      <Bot size={20} className={isLoading ? styles.loading : undefined} />
    </button>
  );
};
