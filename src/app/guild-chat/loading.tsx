import { Skeleton } from '@/shared/ui/Skeleton';
import pageStyles from './GuildChatPage.module.css';
import styles from './loading.module.css';

/** Streaming fallback for the guild chat route — strip + chat panel shell. */
export default function GuildChatLoading() {
  return (
    <main className={pageStyles.main} aria-busy="true">
      <Skeleton className={styles.strip} />
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <Skeleton className={styles.select} />
          <Skeleton className={styles.pollButton} />
        </div>
        <div className={styles.body}>
          <div className={styles.chatCol}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={i % 2 ? styles.bubbleOwn : styles.bubble}>
                <Skeleton className={styles.line} />
                <Skeleton className={styles.lineShort} />
              </div>
            ))}
          </div>
          <div className={styles.pollsCol}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className={styles.pollCard} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
