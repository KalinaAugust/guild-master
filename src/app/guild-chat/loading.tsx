import { Skeleton } from '@/shared/ui/Skeleton';
import pageStyles from './GuildChatPage.module.css';
import styles from './loading.module.css';

/** Streaming fallback for the guild chat route — conversations sidebar + chat panel shell. */
export default function GuildChatLoading() {
  return (
    <main className={pageStyles.main} aria-busy="true">
      <div className={pageStyles.chatWrapper}>
        <div className={styles.container}>
          <div className={styles.sidebar}>
            <Skeleton className={styles.search} />
            <div className={styles.sidebarItem}>
              <Skeleton circle className={styles.avatar} />
              <Skeleton className={styles.itemName} />
            </div>
            <div className={styles.conversations}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.sidebarItem}>
                  <Skeleton circle className={styles.avatar} />
                  <div className={styles.itemText}>
                    <Skeleton className={styles.itemName} />
                    <Skeleton className={styles.itemPreview} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <Skeleton className={styles.select} />
            </div>
            <div className={styles.body}>
              <div className={styles.chatCol}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const own = Boolean(i % 2);
                  return (
                    <div key={i} className={own ? styles.msgRowOwn : styles.msgRow}>
                      {!own && <Skeleton circle className={styles.msgAvatar} />}
                      <div className={own ? styles.bubbleOwn : styles.bubble}>
                        <Skeleton className={styles.line} />
                        <Skeleton className={styles.lineShort} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <Skeleton className={styles.composer} />
          </div>
        </div>
      </div>
    </main>
  );
}
