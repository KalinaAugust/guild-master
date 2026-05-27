import * as React from 'react';
import styles from './Textarea.module.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={[styles.textarea, hasError && styles.textareaError, className].filter(Boolean).join(' ')}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
