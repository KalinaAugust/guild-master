import Link from 'next/link';
import type { CommonGuild, PublicProfile, SocialLink } from '@/entities/user';
import { SOCIAL_META } from '@/entities/user';
import { NameWithIcon as SharedNameWithIcon } from '@/shared/ui/NameWithIcon';
import styles from './ProfileBlocks.module.css';

export const NameWithIcon = ({ name, icon }: { name: string | null; icon: string | null }) => (
  <SharedNameWithIcon name={name} icon={icon} iconSize={18} className={styles.nameRow} />
);

export const AboutBlock = ({ about }: { about: string }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>About</h2>
    <p className={styles.about}>{about}</p>
  </section>
);

export const InterestsBlock = ({ interests }: { interests: string[] }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>Interests</h2>
    <div className={styles.chips}>
      {interests.map((tag) => (
        <span key={tag} className={styles.chip}>{tag}</span>
      ))}
    </div>
  </section>
);

export const SocialsBlock = ({ socials }: { socials: SocialLink[] }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>Socials</h2>
    <ul className={styles.socials}>
      {socials.map((s) => {
        const isUrl = /^https?:\/\//i.test(s.value);
        return (
          <li key={s.platform}>
            <span className={styles.socialLabel}>{SOCIAL_META[s.platform].label}:</span>{' '}
            {isUrl ? (
              <a href={s.value} target="_blank" rel="noopener noreferrer">{s.value}</a>
            ) : (
              <span>{s.value}</span>
            )}
          </li>
        );
      })}
    </ul>
  </section>
);

export const CommonGuildsBlock = ({ guilds }: { guilds: CommonGuild[] }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>Common guilds</h2>
    {guilds.length === 0 ? (
      <p className={styles.muted}>No common guilds</p>
    ) : (
      <ul className={styles.guilds}>
        {guilds.map((g) => (
          <li key={g.id}>
            <Link href={`/guilds/${g.id}`}>{g.name}</Link>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export const StatsBlock = ({ profile }: { profile: Pick<PublicProfile, 'guildsCount' | 'eventsCount'> }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>Statistics</h2>
    <div className={styles.statsRow}>
      <div className={styles.statCard}>
        <span className={styles.statValue}>{profile.guildsCount ?? 0}</span>
        <span className={styles.statLabel}>Guilds</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statValue}>{profile.eventsCount ?? 0}</span>
        <span className={styles.statLabel}>Events</span>
      </div>
    </div>
  </section>
);
