import { InputHTMLAttributes, forwardRef } from 'react';
import styles from './Switch.module.css';
import { clsx } from 'clsx';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({
  className, ...props
}, ref) => {
  return (
    <label className={clsx(styles.wrapper, className)}>
      <input type="checkbox" ref={ref} className={styles.input} {...props} />
      <span className={styles.slider} />
    </label>
  );
});
Switch.displayName = 'Switch';
