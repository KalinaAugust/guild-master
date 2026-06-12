import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { FileText, Sparkles, Cake, Users } from 'lucide-react';
import type { CommonGuild, SocialLink } from '@/entities/user';
import { SOCIAL_META, SocialIcon } from '@/entities/user';
import { Button } from '@/shared/ui/Button';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import dayjs from '@/shared/lib/dayjs';
import { NameWithIcon as SharedNameWithIcon } from '@/shared/ui/NameWithIcon';
import styles from './ProfileBlocks.module.css';

type BlockIcon = ComponentType<{ size?: number; className?: string }>;

/**
 * Unified profile block shell: a glass panel with an icon + title header and a
 * body. Every block on the profile page (Name, Email, About, Interests, …)
 * shares this chrome so headers and spacing stay consistent.
 */
export const ProfileBlock = ({
  icon: Icon,
  title,
  children,
}: {
  icon: BlockIcon;
  title: string;
  children: ReactNode;
}) => (
  <section className={styles.block}>
    <div className={styles.blockHeader}>
      <span className={styles.blockIconTile}>
        <Icon size={16} className={styles.blockIcon} />
      </span>
      <h2 className={styles.blockTitle}>{title}</h2>
    </div>
    {children}
  </section>
);

/** Convenience block for a single primary value (Email, Joined, Birth date, …). */
export const ValueBlock = ({
  icon,
  title,
  value,
}: {
  icon: BlockIcon;
  title: string;
  value: ReactNode;
}) => (
  <ProfileBlock icon={icon} title={title}>
    <p className={styles.value}>{value}</p>
  </ProfileBlock>
);

export const NameWithIcon = ({ name, icon }: { name: string | null; icon: string | null }) => (
  <SharedNameWithIcon name={name} icon={icon} iconSize={18} className={styles.nameRow} />
);

export const AboutBlock = ({ about }: { about: string }) => (
  <ProfileBlock icon={FileText} title="About">
    <p className={styles.about}>{about}</p>
  </ProfileBlock>
);

export const InterestsBlock = ({ interests }: { interests: string[] }) => (
  <ProfileBlock icon={Sparkles} title="Interests">
    <div className={styles.chips}>
      {interests.map((tag) => (
        <span key={tag} className={styles.chip}>{tag}</span>
      ))}
    </div>
  </ProfileBlock>
);

export const SocialsBlock = ({ socials }: { socials: SocialLink[] }) => (
  <section>
    <ul className={styles.socials}>
      {socials.map((s) => {
        const isUrl = /^https?:\/\//i.test(s.value);
        const label = SOCIAL_META[s.platform].label;
        return (
          <li key={s.platform}>
            {isUrl ? (
              <a
                href={s.value}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialItem}
                title={label}
                aria-label={label}
              >
                <SocialIcon platform={s.platform} className={styles.socialIcon} size={22} />
              </a>
            ) : (
              <span className={styles.socialItem} title={`${label}: ${s.value}`} aria-label={label}>
                <SocialIcon platform={s.platform} className={styles.socialIcon} size={22} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  </section>
);

/**
 * Direct messaging is not implemented yet, so this is an intentionally disabled
 * placeholder matching the public-profile design.
 */
export const SendMessageButton = () => (
  <Button variant="primary" fullWidth>
    Send message
  </Button>
);

export const BirthDateBlock = ({ birthDate, locale }: { birthDate: string; locale: string }) => (
  <ProfileBlock icon={Cake} title="Birth date">
    <p className={styles.value}>{dayjs(birthDate).locale(locale).format('D MMMM YYYY')}</p>
  </ProfileBlock>
);

export const CommonGuildsBlock = ({ guilds }: { guilds: CommonGuild[] }) => (
  <ProfileBlock icon={Users} title="Common guilds">
    {guilds.length === 0 ? (
      <p className={styles.muted}>No common guilds</p>
    ) : (
      <ul className={styles.guilds}>
        {guilds.map((g) => (
          <li key={g.id}>
            <Link href={`/guilds/${g.id}`} className={styles.guildItem}>
              <UserAvatar avatarUrl={g.avatarUrl} name={g.name} size="sm" />
              <span className={styles.guildName}>{g.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </ProfileBlock>
);
