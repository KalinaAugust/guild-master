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
import { useGetEventsQuery, useGetMyEventIdsQuery } from '@/entities/event';
import { Guild, useGuildPermissions } from '@/entities/guild';
import { ActivityEvent } from '@/shared/types';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';
import { Panel } from '@/shared/ui/Panel';
import { EventsTooltipContent } from './EventsTooltipContent';
import { typeIcons } from '@/entities/event';
import { useCalendarNavigation } from '../model/useCalendarNavigation';
import { useCalendarDays } from '../lib/useCalendarDays';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';

export const CalendarGrid: React.FC<{
  guilds: Guild[];
  userId?: string;
  initialEvents?: ActivityEvent[];
  initialGuildId?: string;
}> = ({ guilds, userId, initialEvents = [], initialGuildId }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const t = useTranslations('Event');

  const { now, months, years, handlePrevMonth, handleNextMonth, handleMonthChange, handleYearChange } = useCalendarNavigation();
  const { days, DAYS_OF_WEEK } = useCalendarDays(now);
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds, initialGuildId, userId);
  const { canManageEvents } = useGuildPermissions(activeGuildId, userId);
  const excludedEventTypes = useAppSelector((state) => state.ui.excludedEventTypes);
  const onlyParticipating = useAppSelector((state) => state.ui.onlyParticipating);

  const { data: fetchedEvents } = useGetEventsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });
  const { data: myIdsData } = useGetMyEventIdsQuery(activeGuildId ?? '', {
    skip: !activeGuildId || !userId,
  });

  const events = fetchedEvents ?? (activeGuildId === initialGuildId ? initialEvents : []);

  const handleDayClick = (dateStr: string) => {
    router.push(`/day/${dateStr}?guildId=${activeGuildId}`);
  };

  const handleAddEventClick = (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation();
    dispatch(setSelectedDate(dateStr));
    dispatch(openEventModal());
  };

  const MAX_TILT = 5;

  const handleDayTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    el.style.setProperty('--tilt-ry', `${x * MAX_TILT}deg`);
    el.style.setProperty('--tilt-rx', `${y * -MAX_TILT}deg`);
  };

  const handleDayTiltReset = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.removeProperty('--tilt-ry');
    el.style.removeProperty('--tilt-rx');
  };

  return (
    <Panel>
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
            <GuildSelect
              value={activeGuildId}
              onValueChange={handleGuildChange}
              options={guildOptions}
              placeholder="Выберите гильдию"
            />
          </div>
          <div className={styles.separator} />
          <div className={styles.filterDropdown}>
            <EventFilterDropdown userId={userId} />
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
            .filter(event => {
              const matchesType = !excludedEventTypes.includes(event.type);
              const matchesParticipation = !onlyParticipating || (myIdsData?.eventIds?.includes(event.id));
              return event.date === day.fullDate && matchesType && matchesParticipation;
            })
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
              onMouseMove={handleDayTilt}
              onMouseLeave={handleDayTiltReset}
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
    </Panel>
  );
};
