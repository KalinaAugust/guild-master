'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Smile } from 'lucide-react';
import { EMOJI_CATEGORIES } from './emojiData';
import styles from './EmojiPicker.module.css';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  disabled?: boolean;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, disabled = false }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={styles.trigger}
          disabled={disabled}
          aria-label="Choose an emoji"
        >
          <Smile size={24} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className={styles.content}
          side="top"
          align="start"
          sideOffset={8}
          alignOffset={-4}
          onFocusOutside={(e) => e.preventDefault()}
        >
          {/* Category Tabs */}
          <div className={styles.tabs}>
            {EMOJI_CATEGORIES.map((category, idx) => (
              <button
                key={category.name}
                type="button"
                className={`${styles.tabButton} ${activeTab === idx ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(idx)}
                title={category.name}
              >
                <span className={styles.tabIcon}>{category.icon}</span>
              </button>
            ))}
          </div>

          {/* Emoji Grid */}
          <div className={styles.gridContainer}>
            <div className={styles.grid}>
              {EMOJI_CATEGORIES[activeTab].emojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  type="button"
                  className={styles.emojiButton}
                  onClick={() => onSelectEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <Popover.Arrow className={styles.arrow} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
