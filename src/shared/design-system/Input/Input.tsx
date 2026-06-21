import { InputHTMLAttributes, forwardRef } from 'react';
import styles from './Input.module.css';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  error,
  fullWidth = false,
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      className={clsx(
        styles.input,
        error && styles.error,
        fullWidth && styles.fullWidth,
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
