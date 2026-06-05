'use client';

import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { toggleEventType, setAllEventTypesEnabled } from '@/entities/calendar';
import { ACTIVITY_TYPES, typeIcons } from '@/entities/event';
import { Switch } from '@/shared/ui/Switch';
import { Button } from '@/shared/ui/Button';
import { ActivityType } from '@/shared/types';
import styles from './EventFilterDropdown.module.css';

export const EventFilterDropdown: React.FC = () => {
  const dispatch = useAppDispatch();
  const t = useTranslations('Event');
  const tCommon = useTranslations('Common');
  const excludedEventTypes = useAppSelector((state) => state.ui.excludedEventTypes);

  const handleToggle = (type: ActivityType) => {
    dispatch(toggleEventType(type));
  };

  const handleEnableAll = () => {
    dispatch(setAllEventTypesEnabled(true));
  };

  const handleDisableAll = () => {
    dispatch(setAllEventTypesEnabled(false));
  };

  const includedEventTypes = ACTIVITY_TYPES.filter((type) => !excludedEventTypes.includes(type));

  const renderTriggerContent = () => {
    if (includedEventTypes.length === 0) {
      return (
        <span className={styles.triggerText}>
          <Filter size={16} className={styles.filterIcon} />
          {t('filter.none')}
        </span>
      );
    }

    const visibleIncluded = includedEventTypes.slice(0, 3);
    const extraCount = includedEventTypes.length - 3;

    return (
      <div className={styles.triggerIcons}>
        <Filter size={16} className={styles.filterIcon} />
        <div className={styles.iconsRow}>
          {visibleIncluded.map((type) => (
            <span
              key={type}
              className={`${styles.activeIcon} ${styles[`iconType_${type}`] || ''}`}
              title={tCommon(`eventTypes.${type}`)}
            >
              {typeIcons[type]}
            </span>
          ))}
          {extraCount > 0 && <span className={styles.extraCount}>+{extraCount}</span>}
        </div>
      </div>
    );
  };

  return (
    <Popover.Root>
      <Popover.Trigger className={styles.trigger} aria-label={t('filter.ariaLabel')}>
        {renderTriggerContent()}
        <ChevronDown size={16} className={styles.chevron} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className={styles.content} sideOffset={5} align="start">
          <div className={styles.header}>
            <Button variant="ghost" size="xs" onClick={handleEnableAll}>
              {t('filter.enableAll')}
            </Button>
            <Button variant="ghost" size="xs" onClick={handleDisableAll}>
              {t('filter.disableAll')}
            </Button>
          </div>
          <div className={styles.list}>
            {ACTIVITY_TYPES.map((type) => {
              const isChecked = !excludedEventTypes.includes(type);
              return (
                <div key={type} className={styles.item}>
                  <div className={styles.itemLeft}>
                    <span className={`${styles.typeIcon} ${styles[`iconType_${type}`] || ''}`}>
                      {typeIcons[type]}
                    </span>
                    <span className={styles.itemLabel}>
                      {tCommon(`eventTypes.${type}`)}
                    </span>
                  </div>
                  <Switch
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(type)}
                    ariaLabel={tCommon(`eventTypes.${type}`)}
                  />
                </div>
              );
            })}
          </div>
          <Popover.Arrow className={styles.arrow} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
