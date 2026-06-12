import { Skeleton } from '@/shared/ui/Skeleton';
import styles from './loading.module.css';

function BlockSkeleton({ lines = 1 }: { lines?: 1 | 2 }) {
  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>
        <Skeleton className={styles.tile} />
        <Skeleton className={styles.titleLine} />
      </div>
      <Skeleton className={styles.bodyLine} />
      {lines === 2 && <Skeleton className={styles.bodyLineShort} />}
    </div>
  );
}

/** Streaming fallback for the profile route — mirrors the two-column layout. */
export default function ProfileLoading() {
  return (
    <div className={styles.container} aria-busy="true">
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <Skeleton circle className={styles.avatar} />
          <Skeleton className={styles.name} />
          <Skeleton className={styles.status} />
          <div className={styles.socials}>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} circle className={styles.social} />
            ))}
          </div>
        </aside>

        <section className={styles.main}>
          <BlockSkeleton />
          <BlockSkeleton />
          <BlockSkeleton />
          <BlockSkeleton lines={2} />
          <BlockSkeleton lines={2} />
        </section>
      </div>
    </div>
  );
}
