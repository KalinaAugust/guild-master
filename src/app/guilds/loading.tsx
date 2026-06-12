import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ListRowSkeleton } from '@/shared/ui/ListRowSkeleton';
import pageStyles from './GuildsPage.module.css';
import styles from './loading.module.css';

/** Streaming fallback for the guilds management route. */
export default function GuildsLoading() {
  return (
    <>
      <span className={pageStyles.backLink}>
        <ChevronLeft size={20} />
        <Skeleton className={styles.backText} />
      </span>
      <main className={pageStyles.main} aria-busy="true">
        <div className={styles.header}>
          <Skeleton className={styles.title} />
          <Skeleton className={styles.button} />
        </div>
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </div>
      </main>
    </>
  );
}
