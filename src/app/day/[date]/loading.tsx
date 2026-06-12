import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EventCardSkeleton } from '@/shared/ui/EventCardSkeleton';
import pageStyles from './DayPage.module.css';
import styles from './loading.module.css';

/** Streaming fallback for the day route — back link + a few event-card rows. */
export default function DayLoading() {
  return (
    <>
      <span className={pageStyles.backLink}>
        <ChevronLeft size={20} />
        <Skeleton className={styles.backText} />
      </span>
      <main className={pageStyles.main} aria-busy="true">
        <Skeleton className={styles.title} />
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </>
  );
}
