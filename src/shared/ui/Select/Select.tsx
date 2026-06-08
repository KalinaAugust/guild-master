'use client';
import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import styles from './Select.module.css';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { label: React.ReactNode; value: string; avatar?: string; avatarFallback?: React.ReactNode }[];
  placeholder?: string;
  className?: string;
  centered?: boolean;
  truncate?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  centered,
  truncate
}) => (
  <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
    <SelectPrimitive.Trigger className={`${styles.trigger} ${truncate ? styles.triggerTruncate : ''} ${className || ''}`}>
      <SelectPrimitive.Value placeholder={placeholder} />
      <SelectPrimitive.Icon className={styles.icon}>
        <ChevronDown size={16} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={styles.content}
        position="popper"
        sideOffset={4}
      >
        <SelectPrimitive.ScrollUpButton className={styles.scrollButton}>
          <ChevronUp size={16} />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className={styles.viewport}>
          {options.map((opt) => (
            <SelectPrimitive.Item key={opt.value} value={opt.value} className={`${styles.item} ${centered ? styles.itemCentered : ''}`}>
              <SelectPrimitive.ItemText>
                <span className={styles.itemContent}>
                  {opt.avatar ? (
                    <Image
                      src={opt.avatar}
                      alt="avatar"
                      className={styles.avatar}
                      width={20}
                      height={20}
                    />
                  ) : opt.avatarFallback ? (
                    <span className={styles.avatarFallback}>{opt.avatarFallback}</span>
                  ) : null}
                  <span className={styles.label}>{opt.label}</span>
                </span>
              </SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className={styles.scrollButton}>
          <ChevronDown size={16} />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>
);
