'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Clock, Users, Trash2, CheckCircle2, CalendarCheck,
  Sword, Gamepad2, Calendar, Skull, PartyPopper, Dumbbell, Dices, Puzzle,
} from 'lucide-react';
import type { ActivityType } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import dayjs from '@/shared/lib/dayjs';
import type { CallToAction } from '../model/types';
import styles from './CallToActionCard.module.css';

const typeIcons: Record<ActivityType, React.ReactNode> = {
  raid: <Sword size={20} />,
  game: <Gamepad2 size={20} />,
  meeting: <Users size={20} />,
  other: <Calendar size={20} />,
  dungeon: <Skull size={20} />,
  party: <PartyPopper size={20} />,
  sport: <Dumbbell size={20} />,
  dnd: <Dices size={20} />,
  boardgame: <Puzzle size={20} />,
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
  const launched = cta.eventId !== null;
  const eventTime = dayjs(cta.eventDate);

  return (
    <div className={`${styles.card} ${styles[`type_${cta.type}`]}`}>
      <div className={styles.iconWrapper}>{typeIcons[cta.type]}</div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{cta.title}</h3>
          <div className={styles.meta}>
            <span className={styles.timeWrapper}>
              <Clock size={14} />
              {eventTime.format('DD MMM, HH:mm')}
            </span>
            <span className={styles.progress}>
              <Users size={14} />
              {t('progress', { count: cta.interestedCount, target: cta.targetCount })}
            </span>
          </div>
        </div>

        {cta.description ? (
          <p className={styles.description}>{cta.description}</p>
        ) : (
          <div className={styles.descriptionPlaceholder} aria-hidden="true" />
        )}

        <div className={styles.footer}>
          {launched ? (
            <>
              <span className={styles.launchedBadge}>
                <CalendarCheck size={14} />
                {t('launchedBadge')}
              </span>
              {cta.eventId && (
                <Link href={`/events/${cta.eventId}`} className={styles.eventLink}>
                  {t('openEvent')}
                </Link>
              )}
            </>
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
        </div>
      </div>

      {onDelete && cta.canManage && (
        <Button
          variant="ghost"
          size="icon_sm"
          onClick={() => onDelete(cta.id)}
          className={styles.deleteBtn}
          aria-label={t('deleteLabel')}
        >
          <Trash2 size={16} />
        </Button>
      )}
    </div>
  );
};
