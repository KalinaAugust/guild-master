'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import Image from 'next/image';
import { X } from 'lucide-react';
import styles from './ImageLightbox.module.css';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  /** Accessible label for the close button. */
  closeLabel?: string;
}

/** Full-screen overlay that shows a single image fitted to the viewport. */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  onClose,
  src,
  alt = '',
  closeLabel = 'Close',
}) => {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content
          className={styles.content}
          aria-describedby={undefined}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <DialogPrimitive.Title className={styles.srOnly}>{alt || closeLabel}</DialogPrimitive.Title>
          <div className={styles.imageWrap}>
            <Image
              src={src}
              alt={alt}
              fill
              unoptimized
              sizes="90vw"
              className={styles.image}
            />
          </div>
          <DialogPrimitive.Close className={styles.closeButton} aria-label={closeLabel}>
            <X size={24} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
