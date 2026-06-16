'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
  Clock, Users, Trash2, CheckCircle2, CalendarCheck,
  Sword, Gamepad2, Calendar, Skull, PartyPopper, Dumbbell, Dices, Puzzle,
} from 'lucide-react';
import type { ActivityType } from '@/shared/types';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { NameWithIcon } from '@/shared/ui/NameWithIcon';
import { Tooltip } from '@/shared/ui/Tooltip';
import { GradientTitle } from '@/shared/ui/GradientTitle';
import { Button } from '@/shared/ui/Button';
import dayjs from '@/shared/lib/dayjs';
import { resolveDisplayName } from '@/entities/user';
import type { CallToAction } from '@/entities/call-to-action';
import { ParticipantSlots } from './ParticipantSlots';
import styles from './CallToActionCard.module.css';

const typeIcons: Record<ActivityType, React.ReactNode> = {
  raid: <Sword size={14} />,
  game: <Gamepad2 size={14} />,
  meeting: <Users size={14} />,
  other: <Calendar size={14} />,
  dungeon: <Skull size={14} />,
  party: <PartyPopper size={14} />,
  sport: <Dumbbell size={14} />,
  dnd: <Dices size={14} />,
  boardgame: <Puzzle size={14} />,
};

interface CallToActionCardProps {
  cta: CallToAction;
  onToggleInterest: (ctaId: string) => void;
  onDelete?: (ctaId: string) => void;
  isToggling?: boolean;
}

export const CallToActionCard: React.FC<CallToActionCardProps> = ({
  cta,
  onToggleInterest,
  onDelete,
  isToggling,
}) => {
  const t = useTranslations('CallToAction');
  const locale = useLocale();
  const launched = cta.eventId !== null;
  const eventTime = dayjs(cta.eventDate);
  const authorName = resolveDisplayName({
    fullName: cta.author.fullName,
    alias: cta.author.alias,
    displayAsAlias: cta.author.displayAsAlias,
  });

  return (
    <article className={`${styles.card} ${styles[`type_${cta.type}`]}`}>
      <header className={styles.head}>
        <ProfileLink publicId={cta.author.publicId} aria-label={authorName ?? undefined}>
          <UserAvatar avatarUrl={cta.author.avatarUrl} name={authorName} size="md" />
        </ProfileLink>
        <div className={styles.headText}>
          <ProfileLink publicId={cta.author.publicId} className={styles.author}>
            <NameWithIcon name={authorName} icon={cta.author.icon} iconSize={14} />
          </ProfileLink>
          <span className={styles.time}>{dayjs(cta.createdAt).locale(locale).format('LLL')}</span>
        </div>

        {onDelete && cta.canManage && (
          <div className={styles.actions}>
            <Tooltip content={t('deleteLabel')}>
              <button
                type="button"
                className={`${styles.action} ${styles.danger}`}
                onClick={() => onDelete(cta.id)}
                aria-label={t('deleteLabel')}
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        )}
      </header>

      <div className={styles.divider} />

      <div className={styles.titleRow}>
        <GradientTitle as="h3" fontSize="1.15rem" className={styles.title}>
          {cta.title}
        </GradientTitle>
        {launched && (
          <span className={styles.launchedBadge}>
            <CalendarCheck size={12} aria-hidden="true" />
            {t('launchedBadge')}
          </span>
        )}
      </div>

      {cta.description && <p className={styles.content}>{cta.description}</p>}

      <ParticipantSlots participants={cta.participants} targetCount={cta.targetCount} />

      <footer className={styles.foot}>
        <div className={styles.meta}>
          <span className={`${styles.metaItem} ${styles.typeIcon}`}>{typeIcons[cta.type]}</span>
          <span className={styles.metaItem}>
            <Clock size={14} />
            {eventTime.format('DD MMM, HH:mm')}
          </span>
          <span className={styles.metaItem}>
            <Users size={14} />
            {t('progress', { count: cta.interestedCount, target: cta.targetCount })}
          </span>
        </div>

        {launched ? (
          cta.eventId && (
            <Link href={`/events/${cta.eventId}`} className={styles.eventLink}>
              {t('openEvent')}
            </Link>
          )
        ) : (
          <Button
            type="button"
            variant={cta.interested ? 'secondary' : 'primary'}
            onClick={() => onToggleInterest(cta.id)}
            isLoading={isToggling}
            className={styles.wantButton}
          >
            {cta.interested ? (
              <>
                <CheckCircle2 size={16} />
                {t('wantedButton')}
              </>
            ) : (
              t('wantButton')
            )}
          </Button>
        )}
      </footer>
    </article>
  );
};
