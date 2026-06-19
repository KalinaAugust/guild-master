'use client';

import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';
import styles from './CopyLinkButton.module.css';

export interface CopyLinkButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'secondary_glass' | 'ghost' | 'icon' | 'icon_floating' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon_sm';
  /** Optional link to copy. If not provided, window.location.href is used. */
  link?: string;
}

export const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({
  className,
  variant = 'ghost',
  size = 'icon',
  link,
}) => {
  const t = useTranslations('Common');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const textToCopy = link || window.location.href;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success(t('linkCopied'));
    } catch (err) {
      toast.error(t('copyError'));
    }
  };

  return (
    <Tooltip content={t('copyLink')}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={`${styles.button} ${className || ''}`}
        onClick={handleCopy}
        aria-label={t('copyLink')}
      >
        {copied ? <Check size={20} /> : <LinkIcon size={20} />}
      </Button>
    </Tooltip>
  );
};

