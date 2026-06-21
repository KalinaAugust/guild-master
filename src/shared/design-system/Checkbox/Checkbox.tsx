import { InputHTMLAttributes, forwardRef } from 'react';
import styles from './Checkbox.module.css';
import { clsx } from 'clsx';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  className,
  label,
  ...props
}, ref) => {
  return (
    <label className={clsx(styles.wrapper, className)}>
      <input type="checkbox" ref={ref} className={styles.input} {...props} />
      <span className={styles.checkmark} />
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
