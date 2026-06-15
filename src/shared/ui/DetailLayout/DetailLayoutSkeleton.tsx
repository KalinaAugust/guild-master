import React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ListRowSkeleton } from '@/shared/ui/ListRowSkeleton';
import { DetailLayout } from './DetailLayout';
import styles from './DetailLayoutSkeleton.module.css';

interface DetailLayoutSkeletonProps {
  backHref?: string;
  backLabel?: React.ReactNode;
}

/**
 * A unified loading skeleton for detail pages that use DetailLayout.
 * It renders the same structural elements (header, columns, footer) as
 * the final page, preventing layout shifts and providing a smooth visual transition.
 */
export const DetailLayoutSkeleton: React.FC<DetailLayoutSkeletonProps> = ({
  backHref = '#',
  backLabel = <Skeleton className={styles.backText} />,
}) => {
  return (
    <DetailLayout
      backHref={backHref}
      backLabel={backLabel}
      title={<Skeleton className={styles.title} />}
      left={
        <div className={styles.skeletonColumn}>
          <div className={styles.infoGroup}>
            <Skeleton className={styles.label} />
            <Skeleton className={styles.description} />
          </div>
          <div className={styles.infoGroup}>
            <Skeleton className={styles.label} />
            <Skeleton className={styles.value} />
          </div>
        </div>
      }
      right={
        <div className={styles.skeletonColumn}>
          <div className={styles.infoGroup}>
            <Skeleton className={styles.label} />
            <div className={styles.list}>
              {Array.from({ length: 3 }).map((_, i) => (
                <ListRowSkeleton key={i} circle lines={1} />
              ))}
            </div>
          </div>
        </div>
      }
      footer={<Skeleton className={styles.button} />}
    />
  );
};
