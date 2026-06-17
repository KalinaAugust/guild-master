'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '../Modal';
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      cancelText={cancelLabel || commonT('cancel')}
      onCancel={onClose}
      cancelButtonProps={{ disabled: isLoading }}
      submitText={confirmLabel || commonT('confirm')}
      onSubmit={handleConfirm}
      submitButtonProps={{
        variant: variant === 'danger' ? 'danger' : 'primary',
        isLoading
      }}
    >
      {description && <p className={styles.description}>{description}</p>}
    </Modal>
  );
};
