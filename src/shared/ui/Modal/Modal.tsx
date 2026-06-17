'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { GradientTitle } from '@/shared/ui/GradientTitle';
import { Button, ButtonProps } from '@/shared/ui/Button';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  submitText?: string;
  onSubmit?: () => void | Promise<void>;
  submitButtonProps?: Partial<ButtonProps>;
  cancelText?: string;
  onCancel?: () => void;
  cancelButtonProps?: Partial<ButtonProps>;
  footerActions?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  submitText,
  onSubmit,
  submitButtonProps,
  cancelText,
  onCancel,
  cancelButtonProps,
  footerActions,
}) => {
  const hasFooter = !!submitText || !!cancelText || !!footerActions;

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
          <div className={`${styles.body} ${hasFooter ? styles.bodyWithFooter : ''}`}>
            {children}
          </div>
          {hasFooter && (
            <div className={styles.footer}>
              {footerActions ? (
                footerActions
              ) : (
                <>
                  {cancelText && (
                    <Button
                      variant="secondary"
                      onClick={onCancel || onClose}
                      {...cancelButtonProps}
                    >
                      {cancelText}
                    </Button>
                  )}
                  {submitText && (
                    <Button
                      variant="primary"
                      onClick={onSubmit}
                      {...submitButtonProps}
                    >
                      {submitText}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
