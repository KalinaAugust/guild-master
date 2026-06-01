import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('forwards props to the textarea', () => {
    render(<Textarea placeholder="Write here" />);
    expect(screen.getByPlaceholderText('Write here')).toBeInTheDocument();
  });

  it('applies hasError styling when hasError is true', () => {
    const { container } = render(<Textarea hasError />);
    const ta = container.querySelector('textarea');
    expect(ta?.className).toMatch(/textareaError/);
  });

  it('does not apply error class by default', () => {
    const { container } = render(<Textarea />);
    const ta = container.querySelector('textarea');
    expect(ta?.className).not.toMatch(/textareaError/);
  });

  it('merges custom className', () => {
    const { container } = render(<Textarea className="my-class" />);
    expect(container.querySelector('textarea')?.className).toContain('my-class');
  });
});
