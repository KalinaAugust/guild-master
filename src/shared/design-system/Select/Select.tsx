import { SelectHTMLAttributes, forwardRef } from 'react';
import styles from './Select.module.css';
import { clsx } from 'clsx';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  className,
  fullWidth = false,
  children,
  ...props
}, ref) => {
  return (
    <div className={clsx(styles.wrapper, fullWidth && styles.fullWidth, className)}>
      <select ref={ref} className={styles.select} {...props}>
        {children}
      </select>
      <div className={styles.icon}>▼</div>
    </div>
  );
});

Select.displayName = 'Select';
