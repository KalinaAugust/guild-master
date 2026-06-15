import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import styles from './DetailLayout.module.css';

interface DetailLayoutProps {
  backHref: string;
  backLabel: ReactNode;
  title: ReactNode;
  left: ReactNode;
  right: ReactNode;
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
  footer,
  rightClassName,
}: DetailLayoutProps) => (
  <div className={styles.container}>
    <div className={styles.header}>
      <Link href={backHref} className={styles.backLink}>
        <ChevronLeft size={20} aria-hidden />
        {backLabel}
      </Link>
      <h1 className={styles.title}>{title}</h1>
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
