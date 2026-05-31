'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { baseApi } from '@/shared/api/baseApi';
import { useSendAiMessageMutation } from '../api/aiHelperApi';
import { sanitizeHtml } from '@/shared/lib/sanitizeHtml';
import styles from './AiHelperModal.module.css';
import { CatSearchIllustration } from './CatSearchIllustration';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const AiHelperModal = ({ isOpen, onClose, messages, setMessages }: AiHelperModalProps) => {
  const t = useTranslations('AiHelper');
  const dispatch = useAppDispatch();
  const guildId = useAppSelector((state) => state.guild.currentGuildId) ?? '';
  const [input, setInput] = useState('');
  const [sendMessage, { isLoading }] = useSendAiMessageMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || !guildId) return;
    const userMessage = input.trim();
    setInput('');
    const history = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(history);
    try {
      const result = await sendMessage({ messages: history, guildId }).unwrap();
      setMessages((prev) => [...prev, { role: 'assistant', content: result.message }]);
      if (result.eventCreated || result.eventUpdated) {
        dispatch(baseApi.util.invalidateTags([{ type: 'Event', id: 'LIST' }]));
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('error') }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleClose = () => {
    setInput('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('modalTitle')} className={styles.modalContent}>
      <div className={styles.body}>
        <div className={styles.messages}>
          {messages.length === 0 && !isLoading && (
            <div className={styles.empty}>
              <CatSearchIllustration />
              <p>{t('emptyHint')}</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={msg.role === 'user' ? styles.messageUser : styles.messageAssistant}
              {...(msg.role === 'assistant'
                ? { dangerouslySetInnerHTML: { __html: sanitizeHtml(msg.content) } }
                : { children: msg.content }
              )}
            />
          ))}
          {isLoading && (
            <div className={`${styles.messageAssistant} ${styles.thinking}`}>
              {t('thinking')}
              <span className={styles.dot}>.</span>
              <span className={styles.dot}>.</span>
              <span className={styles.dot}>.</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className={styles.inputRow}>
          <Textarea
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
