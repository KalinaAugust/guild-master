import * as React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, icon, className, ...props }, ref) => {
    const inputEl = (
      <input
        ref={ref}
        className={[
          styles.input,
          icon && styles.inputWithIcon,
          hasError && styles.inputError,
          !icon && className,
        ].filter(Boolean).join(' ')}
        {...props}
      />
    );

    if (icon) {
      return (
        <div className={[styles.inputWrapper, className].filter(Boolean).join(' ')}>
          <span className={styles.inputIcon}>{icon}</span>
          {inputEl}
        </div>
      );
    }

    return inputEl;
  }
);
Input.displayName = 'Input';
