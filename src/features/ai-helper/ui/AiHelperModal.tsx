'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { useSendTestMessageMutation } from '../api/aiHelperApi';
import styles from './AiHelperModal.module.css';

interface AiHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiHelperModal = ({ isOpen, onClose }: AiHelperModalProps) => {
  const t = useTranslations('AiHelper');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [sendMessage, { isLoading }] = useSendTestMessageMutation();

  const handleSubmit = async () => {
    setResponse(null);
    try {
      const result = await sendMessage({ message }).unwrap();
      setResponse(result.message);
    } catch {
      setResponse(t('error'));
    }
  };

  const handleClose = () => {
    setMessage('');
    setResponse(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('modalTitle')}>
      <div className={styles.body}>
        <textarea
          className={styles.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('placeholder')}
          rows={4}
        />
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !message.trim()}
          fullWidth
        >
          {t('send')}
        </Button>
        {(isLoading || response !== null) && (
          <div className={styles.response}>
            {isLoading ? t('thinking') : response}
          </div>
        )}
      </div>
    </Modal>
  );
};
