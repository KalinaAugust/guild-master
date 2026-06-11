import { ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Spinner } from '@/shared/ui/Spinner';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'secondary_glass' | 'ghost' | 'icon' | 'icon_floating' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon_sm';
  fullWidth?: boolean;
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  asChild = false,
  className = '',
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) => {
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
              {children}
            </span>
          ) : (
            children
          )}
        </>
      )}
    </Comp>
  );
};


