'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGetUserNotesQuery } from '@/entities/user';
import styles from './GlobalUserNoteTooltip.module.css';

export function GlobalUserNoteTooltip() {
  const { data: notes } = useGetUserNotesQuery();
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-user-public-id]') as HTMLElement;
      if (!target) {
        if (activeElRef.current) {
          triggerHide();
        }
        return;
      }

      // Cards that already render the note inline (event participants, guild
      // members) opt out of the hover tooltip to avoid duplicating it.
      if (target.closest('[data-suppress-note-tooltip]')) {
        if (activeElRef.current) {
          triggerHide();
        }
        return;
      }

      const publicId = target.getAttribute('data-user-public-id');
      if (!publicId || !notes) return;

      const note = notes.find((n) => n.target_public_id === publicId)?.note;
      if (!note) {
        if (activeElRef.current) {
          triggerHide();
        }
        return;
      }

      if (activeElRef.current !== target) {
        clearTimer();
        activeElRef.current = target;
        
        timerRef.current = setTimeout(() => {
          const rect = target.getBoundingClientRect();
          setCoords({
            top: rect.top + window.scrollY - 8,
            left: rect.left + window.scrollX + rect.width / 2,
          });
          setActiveNote(note);
          setVisible(true);
        }, 400);
      }
    };

    const triggerHide = () => {
      clearTimer();
      activeElRef.current = null;
      setVisible(false);
      timerRef.current = setTimeout(() => {
        setActiveNote(null);
      }, 150);
    };

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      clearTimer();
    };
  }, [notes]);

  if (!activeNote || !coords) return null;

  return (
    <div
      className={`${styles.tooltip} ${visible ? styles.tooltipVisible : ''}`}
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 1600,
      }}
    >
      {activeNote}
      <div className={styles.arrow} />
    </div>
  );
}
