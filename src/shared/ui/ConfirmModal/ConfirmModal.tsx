'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '../Modal';
import { Button } from '../Button';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
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
}) => {
  const commonT = useTranslations('Common');

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel || commonT('cancel')}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm}>
          {confirmLabel || commonT('confirm')}
        </Button>
      </div>
    </Modal>
  );
};
