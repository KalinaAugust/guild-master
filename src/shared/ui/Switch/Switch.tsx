import React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import styles from './Switch.module.css';

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  ariaLabel,
}) => {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={styles.SwitchRoot}
      aria-label={ariaLabel}
    >
      <RadixSwitch.Thumb className={styles.SwitchThumb} />
    </RadixSwitch.Root>
  );
};
