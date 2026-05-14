'use client';

import React, { useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import dayjs from '@/shared/lib/dayjs';
import styles from './CalendarGrid.module.css';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { openEventModal, setSelectedDate, nextMonth, prevMonth, setViewDate } from '@/entities/calendar';
import { fetchEventsThunk } from '@/entities/event';
import { Select } from '@/shared/ui/Select';

export const CalendarGrid: React.FC<{ guildId: string }> = ({ guildId }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const viewDateStr = useAppSelector((state) => state.ui.viewDate);
  const events = useAppSelector((state) => state.events.items);
  const locale = useLocale();

  useEffect(() => {
    dispatch(fetchEventsThunk(guildId));
  }, [dispatch, guildId]);

  // Set dayjs locale based on next-intl locale
  const now = useMemo(() => dayjs(viewDateStr).locale(locale), [viewDateStr, locale]);

  const handlePrevMonth = () => dispatch(prevMonth());
  const handleNextMonth = () => dispatch(nextMonth());

  const months = useMemo(() => {
    const localeData = now.localeData();
    return localeData.months().map((label, i) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: i.toString(),
    }));
  }, [now]);

  const years = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const year = dayjs().year() - 10 + i;
    return { label: year.toString(), value: year.toString() };
  }), []);

  const handleMonthChange = (month: string) => {
    dispatch(setViewDate(now.month(parseInt(month)).toISOString()));
  };

  const handleYearChange = (year: string) => {
    dispatch(setViewDate(now.year(parseInt(year)).toISOString()));
  };

  const DAYS_OF_WEEK = useMemo(() => {
    const localeData = now.localeData();
    const weekdays = localeData.weekdaysMin();
    // weekdays start with Sunday (index 0). We want Monday to Sunday.
    const shifted = [...weekdays.slice(1), weekdays[0]];
    return shifted.map((label, index) => ({
      key: index === 5 || index === 6 ? (index === 5 ? 'sat' : 'sun') : index.toString(),
      label: label.charAt(0).toUpperCase() + label.slice(1),
    }));
  }, [now]);

  const days = useMemo(() => {
    const startOfMonth = now.startOf('month');
    
    // Day of week for 1st day (0 is Sunday, adjust to 0 for Monday)
    const dayValue = startOfMonth.day();
    const firstDayOfWeek = dayValue === 0 ? 6 : dayValue - 1;

    const calendarDays = [];

    // Prev month days
    const prevMonth = now.subtract(1, 'month');
    const daysInPrevMonth = prevMonth.daysInMonth();
    for (let i = firstDayOfWeek; i > 0; i--) {
      const d = prevMonth.date(daysInPrevMonth - i + 1);
      calendarDays.push({
        date: d.date(),
        fullDate: d.format('YYYY-MM-DD'),
        isCurrentMonth: false,
      });
    }

    // Current month days
    const daysInMonth = now.daysInMonth();
    const today = dayjs().format('YYYY-MM-DD');
    for (let i = 1; i <= daysInMonth; i++) {
      const d = now.date(i);
      const fullDate = d.format('YYYY-MM-DD');
      calendarDays.push({
        date: i,
        fullDate,
        isCurrentMonth: true,
        isToday: fullDate === today,
      });
    }

    // Next month days
    const remaining = 42 - calendarDays.length;
    const nextMonth = now.add(1, 'month');
    for (let i = 1; i <= remaining; i++) {
      const d = nextMonth.date(i);
      calendarDays.push({
        date: i,
        fullDate: d.format('YYYY-MM-DD'),
        isCurrentMonth: false,
      });
    }

    return calendarDays;
  }, [now]);

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
          <Select
            value={now.month().toString()}
            onValueChange={handleMonthChange}
            options={months}
          />
          <Select
            value={now.year().toString()}
            onValueChange={handleYearChange}
            options={years}
          />
        </div>
        <div className={styles.controlsRight}>
          <button className={styles.navButton} onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </button>
          <button className={styles.navButton} onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
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
            .filter(event => event.date === day.fullDate)
            .sort((a, b) => a.time.localeCompare(b.time));

          return (
            <div
              key={index}
              className={`${styles.day} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${
                day.isToday ? styles.today : ''
              }`}
              onClick={() => handleDayClick(day.fullDate)}
            >
              <span className={styles.dateNumber}>{day.date}</span>
              <button 
                className={styles.addEventBtn} 
                onClick={(e) => handleAddEventClick(e, day.fullDate)}
                title="Добавить событие"
              >
                <Plus size={16} />
              </button>
              <div className={styles.eventsList}>
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    className={`${styles.eventItem} ${styles[`event_${event.type}`]}`}
                    title={`${event.time} - ${event.title}`}
                  >
                    {event.time} {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
