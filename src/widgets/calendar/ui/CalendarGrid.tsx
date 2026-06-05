'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import dayjs from '@/shared/lib/dayjs';
import styles from './CalendarGrid.module.css';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { openEventModal, setSelectedDate } from '@/entities/calendar';
import { EventFilterDropdown } from '@/features/filter-events';
import { useGetEventsQuery } from '@/entities/event';
import { Guild, useGuildPermissions } from '@/entities/guild';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';
import { EventsTooltipContent } from './EventsTooltipContent';
import { typeIcons } from '@/entities/event';
import { useCalendarNavigation } from '../model/useCalendarNavigation';
import { useCalendarDays } from '../lib/useCalendarDays';
import { useGuildSelection } from '../model/useGuildSelection';

export const CalendarGrid: React.FC<{ guilds: Guild[]; userId?: string }> = ({ guilds, userId }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const t = useTranslations('Event');

  const { now, months, years, handlePrevMonth, handleNextMonth, handleMonthChange, handleYearChange } = useCalendarNavigation();
  const { days, DAYS_OF_WEEK } = useCalendarDays(now);
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds);
  const { canManageEvents } = useGuildPermissions(activeGuildId, userId);
  const excludedEventTypes = useAppSelector((state) => state.ui.excludedEventTypes);

  const { data: events = [] } = useGetEventsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });

  const handleDayClick = (dateStr: string) => {
    router.push(`/day/${dateStr}`);
  };

  const handleAddEventClick = (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation();
    dispatch(setSelectedDate(dateStr));
    dispatch(openEventModal());
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.controlsLeft}>
          <div className={styles.monthSelect}>
            <Select
              value={now.month().toString()}
              onValueChange={handleMonthChange}
              options={months}
              centered
            />
          </div>
          <div className={styles.yearSelect}>
            <Select
              value={now.year().toString()}
              onValueChange={handleYearChange}
              options={years}
              centered
            />
          </div>
          <div className={styles.separator} />
          <div className={styles.guildSelect}>
            <Select
              value={activeGuildId}
              onValueChange={handleGuildChange}
              options={guildOptions}
              placeholder="Выберите гильдию"
              truncate
            />
          </div>
          <div className={styles.filterDropdown}>
            <EventFilterDropdown />
          </div>
        </div>
        <div className={styles.controlsRight}>
          <Button variant="icon" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </Button>
          <Button variant="icon" size="icon" onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>
      <div className={styles.grid}>
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.key}
            className={`${styles.dayHeader} ${day.key === 'sat' || day.key === 'sun' ? styles.weekendHeader : ''}`}
          >
            {day.label}
          </div>
        ))}
        {days.map((day, index) => {
          const dayEvents = events
            .filter(event => event.date === day.fullDate && !excludedEventTypes.includes(event.type))
            .sort((a, b) => a.time.localeCompare(b.time));

          const displayedEvents = dayEvents.slice(0, 2);
          const remainingCount = dayEvents.length - displayedEvents.length;

          return (
            <div
              key={index}
              className={`${styles.day} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${
                day.isToday ? styles.today : ''
              } ${day.isWeekend ? styles.weekend : ''}`}
              onClick={() => handleDayClick(day.fullDate)}
            >
              <span className={styles.dateNumber}>{day.date}</span>
              {!dayjs(day.fullDate).isBefore(dayjs().startOf('day')) && canManageEvents && (
                <Tooltip content={t('addEvent')} side="top">
                  <Button
                    variant="icon_floating"
                    size="icon_sm"
                    className={styles.addEventBtn}
                    onClick={(e) => handleAddEventClick(e, day.fullDate)}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </Button>
                </Tooltip>
              )}
              <div className={styles.eventsList}>
                {displayedEvents.map(event => (
                  <Tooltip
                    key={event.id}
                    side="top"
                    content={
                      <span className={styles.simpleTooltip}>
                        <span>{event.time} - {event.title}</span>
                        <span className={`${styles.tooltipIcon} ${styles[`iconType_${event.type}`]}`} aria-hidden="true">
                          {typeIcons[event.type]}
                        </span>
                      </span>
                    }
                  >
                    <div
                      className={`${styles.eventItem} ${styles[`event_${event.type}`]}`}
                    >
                      {event.time} {event.title}
                    </div>
                  </Tooltip>
                ))}
                {remainingCount > 0 && (
                  <Tooltip
                    side="right"
                    content={<EventsTooltipContent events={dayEvents.slice(displayedEvents.length)} />}
                  >
                    <div className={styles.moreEvents}>
                      +{remainingCount}
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
