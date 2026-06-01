'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '../Modal';
import { Button } from '../Button';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  isLoading = false,
}) => {
  const commonT = useTranslations('Common');

  const handleConfirm = () => {
    const result = onConfirm();
    if (result instanceof Promise) {
      result.then(() => {
        if (isLoading === undefined || !isLoading) {
          onClose();
        }
      }).catch(() => {});
    } else {
      if (isLoading === undefined || !isLoading) {
        onClose();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelLabel || commonT('cancel')}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm} isLoading={isLoading}>
          {confirmLabel || commonT('confirm')}
        </Button>
      </div>
    </Modal>
  );
};
