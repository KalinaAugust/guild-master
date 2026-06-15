import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders bold markdown as <strong>', () => {
    const { container } = render(<Markdown source="**hi**" />);
    expect(container.querySelector('strong')?.textContent).toBe('hi');
  });

  it('strips script tags (sanitization)', () => {
    const { container } = render(<Markdown source={'ok\n\n<script>alert(1)</script>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('ok');
  });

  it('renders links with the href preserved', () => {
    const { container } = render(<Markdown source="[x](https://example.com)" />);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });
});
