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
    <Modal isOpen={isOpen} onClose={handleClose} title={t('modalTitle')} className={styles.modalContent}>
      <div className={styles.body}>
        <div className={styles.messages}>
          {messages.length === 0 && !isLoading && (
            <div className={styles.empty}>
              <svg width="96" height="88" viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="42" cy="76" rx="20" ry="13" fill="#6888a8" fillOpacity="0.65" />
                <circle cx="42" cy="50" r="18" fill="#7898b8" fillOpacity="0.75" />
                <polygon points="27,38 21,21 37,36" fill="#7898b8" fillOpacity="0.75" />
                <polygon points="27,38 24,25 35,36" fill="#c4a8d4" fillOpacity="0.45" />
                <polygon points="57,38 63,21 47,36" fill="#7898b8" fillOpacity="0.75" />
                <polygon points="57,38 60,25 49,36" fill="#c4a8d4" fillOpacity="0.45" />
                <circle cx="36" cy="47" r="4" fill="#ddeeff" fillOpacity="0.9" />
                <circle cx="37.2" cy="47.2" r="2.2" fill="#0d1825" />
                <circle cx="36.4" cy="45.8" r="0.8" fill="white" fillOpacity="0.55" />
                <circle cx="50" cy="47" r="4" fill="#ddeeff" fillOpacity="0.9" />
                <circle cx="51.2" cy="47.2" r="2.2" fill="#0d1825" />
                <circle cx="50.4" cy="45.8" r="0.8" fill="white" fillOpacity="0.55" />
                <ellipse cx="43" cy="54.5" rx="2.5" ry="2" fill="#c090b4" fillOpacity="0.8" />
                <line x1="40" y1="54" x2="23" y2="51" stroke="#c8dff0" strokeOpacity="0.3" strokeWidth="0.9" />
                <line x1="40" y1="56" x2="23" y2="58" stroke="#c8dff0" strokeOpacity="0.3" strokeWidth="0.9" />
                <line x1="46" y1="54" x2="62" y2="51" stroke="#c8dff0" strokeOpacity="0.3" strokeWidth="0.9" />
                <line x1="46" y1="56" x2="62" y2="58" stroke="#c8dff0" strokeOpacity="0.3" strokeWidth="0.9" />
                <path d="M 57 67 Q 66 60 70 53" stroke="#6888a8" strokeWidth="6" strokeLinecap="round" fill="none" strokeOpacity="0.75" />
                <line x1="83" y1="67" x2="93" y2="79" stroke="#50709a" strokeWidth="4.5" strokeLinecap="round" />
                <circle cx="75" cy="55" r="14" stroke="#90b8d8" strokeWidth="2.5" fill="white" fillOpacity="0.05" />
                <path d="M 65 47 Q 68 43 75 43" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
              <p>{t('emptyHint')}</p>
            </div>
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
