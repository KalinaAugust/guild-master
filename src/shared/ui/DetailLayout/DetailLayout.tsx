import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { GradientTitle } from '@/shared/ui/GradientTitle';
import styles from './DetailLayout.module.css';

interface DetailLayoutProps {
  backHref: string;
  backLabel: ReactNode;
  title: ReactNode;
  left: ReactNode;
  right: ReactNode;
  /** Optional actions to render in the header (e.g. copy link button) */
  actions?: ReactNode;
  /** Optional — some states render no footer. */
  footer?: ReactNode;
  /** Modifier class applied to the right column (e.g. a feature's tab padding). */
  rightClassName?: string;
}

export const DetailLayout = ({
  backHref,
  backLabel,
  title,
  left,
  right,
  actions,
  footer,
  rightClassName,
}: DetailLayoutProps) => (
  <div className={clsx(styles.container, 'detail-layout-active')}>
    <div className={styles.header}>
      <Link href={backHref} className={styles.backLink}>
        <ChevronLeft size={20} aria-hidden />
        {backLabel}
      </Link>
      <GradientTitle as="h1" className={styles.title} fontSize="1.25rem">
        {title}
      </GradientTitle>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>

    <div className={styles.body}>
      <div className={styles.column}>{left}</div>
      <div className={clsx(styles.column, styles.columnRight, rightClassName)}>
        {right}
      </div>
    </div>

    {footer && <div className={styles.footer}>{footer}</div>}
  </div>
);

