import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Spinner } from '@/shared/ui/Spinner';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'secondary_glass' | 'ghost' | 'icon' | 'icon_floating' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon_sm';
  fullWidth?: boolean;
  asChild?: boolean;
  isLoading?: boolean;
  /** Leading icon, always rendered with consistent spacing before the label. */
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  asChild = false,
  className = '',
  isLoading = false,
  icon,
  disabled,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : 'button';
  const classes = [
    styles.button,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth ? styles.fullWidth : '',
    isLoading ? styles.loading : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <Comp
      ref={ref}
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {isLoading && (
            <Spinner
              size="sm"
              color="currentColor"
              className={styles.buttonSpinner}
              data-testid="button-spinner"
            />
          )}
          {isLoading ? (
            <span className={styles.contentHidden}>
              {icon && <span className={styles.icon}>{icon}</span>}
              {children}
            </span>
          ) : (
            <>
              {icon && <span className={styles.icon}>{icon}</span>}
              {children}
            </>
          )}
        </>
      )}
    </Comp>
  );
});

Button.displayName = 'Button';


