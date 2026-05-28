import { ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'icon_floating' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon_sm';
  fullWidth?: boolean;
  asChild?: boolean;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  asChild = false,
  className = '',
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : 'button';
  const classes = [
    styles.button,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth ? styles.fullWidth : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <Comp className={classes} {...props}>
      {children}
    </Comp>
  );
};
