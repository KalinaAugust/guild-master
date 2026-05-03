'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './CalendarGrid.module.css';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { openEventModal, setSelectedDate, nextMonth, prevMonth, setViewDate } from '@/entities/calendar';
import { Select } from '@/shared/ui/Select';

const DAYS_OF_WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const CalendarGrid: React.FC = () => {
  const dispatch = useAppDispatch();
  const viewDateStr = useAppSelector((state) => state.ui.viewDate);
  const events = useAppSelector((state) => state.events.items);
  
  const now = new Date(viewDateStr);
  
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const handlePrevMonth = () => dispatch(prevMonth());
  const handleNextMonth = () => dispatch(nextMonth());

  const months = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2000, i, 1).toLocaleString('ru-RU', { month: 'long' }),
    value: i.toString(),
  }));

  const years = Array.from({ length: 21 }, (_, i) => {
    const year = new Date().getFullYear() - 10 + i;
    return { label: year.toString(), value: year.toString() };
  });

  const handleMonthChange = (month: string) => {
    const newDate = new Date(now);
    newDate.setMonth(parseInt(month));
    dispatch(setViewDate(newDate.toISOString()));
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(now);
    newDate.setFullYear(parseInt(year));
    dispatch(setViewDate(newDate.toISOString()));
  };

  // Первый день месяца
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  // День недели первого дня (0 - воскресенье, корректируем под Пн-Вс)
  let firstDayOfWeek = firstDayOfMonth.getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Количество дней в текущем месяце
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Количество дней в предыдущем месяце для заполнения начала сетки
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

  const days = [];

  // Заполняем дни из предыдущего месяца
  for (let i = firstDayOfWeek; i > 0; i--) {
    const dayDate = prevMonthLastDay - i + 1;
    const date = new Date(currentYear, currentMonth - 1, dayDate);
    days.push({
      date: dayDate,
      fullDate: date.toISOString().split('T')[0],
      isCurrentMonth: false,
    });
  }

  // Заполняем текущий месяц
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentYear, currentMonth, i);
    days.push({
      date: i,
      fullDate: date.toISOString().split('T')[0],
      isCurrentMonth: true,
      isToday: i === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear(),
    });
  }

  // Заполняем остаток сетки до 42 ячеек (6 недель)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(currentYear, currentMonth + 1, i);
    days.push({
      date: i,
      fullDate: date.toISOString().split('T')[0],
      isCurrentMonth: false,
    });
  }

  const handleDayClick = (dateStr: string) => {
    dispatch(setSelectedDate(dateStr));
    dispatch(openEventModal());
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.controlsLeft}>
          <Select 
            value={now.getMonth().toString()} 
            onValueChange={handleMonthChange} 
            options={months} 
          />
          <Select 
            value={now.getFullYear().toString()} 
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
          <div key={day} className={styles.dayHeader}>
            {day}
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
