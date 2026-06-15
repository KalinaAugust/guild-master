import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RichTextEditor } from './RichTextEditor';

describe('RichTextEditor', () => {
  it('renders the formatting toolbar', async () => {
    render(<RichTextEditor value="" onChange={vi.fn()} placeholder="Write…" />);

    for (const label of ['Bold', 'Italic', 'Heading 2', 'Heading 3', 'Bullet list', 'Ordered list', 'Link']) {
      expect(await screen.findByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('opens an inline link popover instead of a native prompt', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt');
    render(<RichTextEditor value="" onChange={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Link' }));

    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });
});
