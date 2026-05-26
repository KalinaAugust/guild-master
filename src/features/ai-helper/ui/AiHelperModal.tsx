'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { useSendTestMessageMutation } from '../api/aiHelperApi';
import styles from './AiHelperModal.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiHelperModal = ({ isOpen, onClose }: AiHelperModalProps) => {
  const t = useTranslations('AiHelper');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendMessage, { isLoading }] = useSendTestMessageMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    try {
      const result = await sendMessage({ message: userMessage }).unwrap();
      setMessages((prev) => [...prev, { role: 'assistant', content: result.message }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('error') }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClose = () => {
    setInput('');
    setMessages([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('modalTitle')}>
      <div className={styles.body}>
        <div className={styles.messages}>
          {messages.length === 0 && !isLoading && (
            <div className={styles.empty}>{t('emptyHint')}</div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={msg.role === 'user' ? styles.messageUser : styles.messageAssistant}
            >
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.messageAssistant} ${styles.thinking}`}>
              {t('thinking')}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className={styles.inputRow}>
          <textarea
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            rows={2}
            disabled={isLoading}
          />
          <button
            className={styles.sendButton}
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            aria-label={t('send')}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
};
