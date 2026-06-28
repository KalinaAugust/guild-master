import { useTranslations } from 'next-intl';
import { Calendar, MessagesSquare, Megaphone } from 'lucide-react';
import styles from './Features.module.css';

export const Features = () => {
  const t = useTranslations('Landing');
  const cards = [
    { Icon: Calendar, title: t('features.calendar.title'), body: t('features.calendar.body') },
    { Icon: MessagesSquare, title: t('features.chat.title'), body: t('features.chat.body') },
    { Icon: Megaphone, title: t('features.community.title'), body: t('features.community.body') },
  ];
  return (
    <section className={styles.features}>
      {cards.map(({ Icon, title, body }) => (
        <article key={title} className={styles.card}>
          <Icon className={styles.icon} aria-hidden />
          <h3 className={styles.cardTitle}>{title}</h3>
          <p className={styles.cardBody}>{body}</p>
        </article>
      ))}
    </section>
  );
};
