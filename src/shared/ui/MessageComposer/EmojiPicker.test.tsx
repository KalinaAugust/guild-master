import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EmojiPicker } from './EmojiPicker';
import { EMOJI_CATEGORIES } from './emojiData';

describe('EmojiPicker Component', () => {
  it('renders trigger button', () => {
    render(<EmojiPicker onSelectEmoji={vi.fn()} />);
    const trigger = screen.getByLabelText('Choose an emoji');
    expect(trigger).toBeInTheDocument();
  });

  it('opens emoji picker popover and shows tabs', async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onSelectEmoji={vi.fn()} />);

    const trigger = screen.getByLabelText('Choose an emoji');
    await user.click(trigger);

    // Categories should be visible in the popover tabs
    EMOJI_CATEGORIES.forEach((category) => {
      expect(screen.getByTitle(category.name)).toBeInTheDocument();
    });
  });

  it('changes active category when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onSelectEmoji={vi.fn()} />);

    const trigger = screen.getByLabelText('Choose an emoji');
    await user.click(trigger);

    // Initially, Smileys category emojis should be displayed (queried from document.body due to React Portal)
    const emojiButtons = document.body.querySelectorAll('button[class*="emojiButton"]');
    const firstSmile = EMOJI_CATEGORIES[0].emojis[0];
    expect(emojiButtons[0].textContent).toBe(firstSmile);

    // Click on the Gaming & Activities tab (index 3)
    const gamingTab = screen.getByTitle('Gaming & Activities');
    await user.click(gamingTab);

    // Smileys should not be rendered anymore, gaming emojis should appear instead
    const newEmojiButtons = document.body.querySelectorAll('button[class*="emojiButton"]');
    const firstGameEmoji = EMOJI_CATEGORIES[3].emojis[0];
    expect(newEmojiButtons[0].textContent).toBe(firstGameEmoji);
  });

  it('calls onSelectEmoji when an emoji is clicked', async () => {
    const user = userEvent.setup();
    const handleSelectEmoji = vi.fn();
    render(<EmojiPicker onSelectEmoji={handleSelectEmoji} />);

    const trigger = screen.getByLabelText('Choose an emoji');
    await user.click(trigger);

    // Click on the first emoji in the active Smiley category
    const emojiButtons = document.body.querySelectorAll('button[class*="emojiButton"]');
    const smileyEmoji = EMOJI_CATEGORIES[0].emojis[0];
    await user.click(emojiButtons[0]);

    expect(handleSelectEmoji).toHaveBeenCalledWith(smileyEmoji);
  });
});
