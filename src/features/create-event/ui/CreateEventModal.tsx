'use client';

import React, { useState } from 'react';
import styles from './CreateEventModal.module.css';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { closeEventModal } from '@/entities/calendar';
import { addEvent } from '@/entities/event';
import { ActivityType } from '@/shared/types';

export const CreateEventModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isEventModalOpen);
  const selectedDate = useAppSelector((state) => state.ui.selectedDate);

  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [type, setType] = useState<ActivityType>('game');
  const [description, setDescription] = useState('');

  if (selectedDate !== prevSelectedDate) {
    setPrevSelectedDate(selectedDate);
    if (selectedDate) {
      const dateObj = new Date(selectedDate);
      setDate(dateObj.toISOString().split('T')[0]);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !date || !time) return;

    dispatch(addEvent({
      id: crypto.randomUUID(),
      title,
      date,
      time,
      type,
      description,
    }));

    handleClose();
  };

  const handleClose = () => {
    dispatch(closeEventModal());
    setTitle('');
    setDescription('');
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>Новое событие</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Название</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="date">Дата</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="time">Время</label>
            <input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="type">Тип</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType)}
            >
              <option value="game">Игра</option>
              <option value="raid">Рейд</option>
              <option value="meeting">Встреча</option>
              <option value="other">Другое</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>
              Отмена
            </button>
            <button type="submit" className={styles.submitBtn}>
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
