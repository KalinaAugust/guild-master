import { Skeleton } from '@/shared/ui/Skeleton';
import pageStyles from './GuildChatPage.module.css';
import styles from './loading.module.css';

/** Streaming fallback for the guild chat route — chat panel shell. */
export default function GuildChatLoading() {
  return (
    <main className={pageStyles.main} aria-busy="true">
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <Skeleton className={styles.select} />
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
        </div>
      </div>
    </main>
  );
}
