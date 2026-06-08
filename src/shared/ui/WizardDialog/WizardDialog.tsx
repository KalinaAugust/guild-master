'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import styles from './WizardDialog.module.css';

interface WizardDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const WizardDialog: React.FC<WizardDialogProps> = ({ open, onClose, title, footer, children }) => (
  <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Content className={styles.overlay} aria-describedby={undefined}>
        <div className={styles.header}>
          <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
            <X size={20} />
          </DialogPrimitive.Close>
          <DialogPrimitive.Title className={styles.title}>{title}</DialogPrimitive.Title>
        </div>

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);

interface WizardColumnProps {
  children: React.ReactNode;
  className?: string;
}

export const WizardColumn: React.FC<WizardColumnProps> = ({ children, className }) => (
  <div className={[styles.column, className].filter(Boolean).join(' ')}>{children}</div>
);
