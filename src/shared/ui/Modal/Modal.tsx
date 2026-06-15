'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { GradientTitle } from '@/shared/ui/GradientTitle';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content
          className={`${styles.content} ${className || ''}`}
          aria-describedby={undefined}
        >
          <div className={styles.header}>
            {title && (
              <DialogPrimitive.Title asChild>
                <GradientTitle as="h2" fontSize="1.5rem">{title}</GradientTitle>
              </DialogPrimitive.Title>
            )}
            <DialogPrimitive.Close className={styles.closeButton}>
              <X size={20} />
            </DialogPrimitive.Close>
          </div>
          <div className={styles.body}>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
