import { TextareaHTMLAttributes, forwardRef } from 'react';
import styles from './Textarea.module.css';
import { clsx } from 'clsx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className,
  error,
  fullWidth = false,
  ...props
}, ref) => {
  return (
    <textarea
      ref={ref}
      className={clsx(
        styles.textarea,
        error && styles.error,
        fullWidth && styles.fullWidth,
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
