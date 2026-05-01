'use client';

import React from 'react';
import styles from './CalendarGrid.module.css';
import { useAppSelector } from '@/shared/lib/hooks';

const DAYS_OF_WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const CalendarGrid: React.FC = () => {
  const selectedDateStr = useAppSelector((state) => state.ui.selectedDate);
  const now = selectedDateStr ? new Date(selectedDateStr) : new Date();
  
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

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
    days.push({
      date: prevMonthLastDay - i + 1,
      isCurrentMonth: false,
    });
  }

  // Заполняем текущий месяц
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: i,
      isCurrentMonth: true,
      isToday: i === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear(),
    });
  }

  // Заполняем остаток сетки до 42 ячеек (6 недель)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: i,
      isCurrentMonth: false,
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>
          {now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
        </h2>
      </div>
      <div className={styles.grid}>
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}
        {days.map((day, index) => (
          <div
            key={index}
            className={`${styles.day} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${
              day.isToday ? styles.today : ''
            }`}
          >
            <span className={styles.dateNumber}>{day.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
