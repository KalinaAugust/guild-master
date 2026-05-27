import * as React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, className, ...props }, ref) => (
    <input
      ref={ref}
      className={[styles.input, hasError && styles.inputError, className].filter(Boolean).join(' ')}
      {...props}
    />
  )
);
Input.displayName = 'Input';
