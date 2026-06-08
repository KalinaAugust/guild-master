import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DetailLayout } from './DetailLayout';

const base = {
  backHref: '/guilds',
  backLabel: 'Back to guilds',
  title: 'My Guild',
  left: <p>left content</p>,
  right: <p>right content</p>,
};

describe('DetailLayout', () => {
  it('renders the title', () => {
    render(<DetailLayout {...base} />);
    expect(screen.getByRole('heading', { name: 'My Guild' })).toBeInTheDocument();
  });

  it('renders the back link with the given href and label', () => {
    render(<DetailLayout {...base} />);
    expect(screen.getByRole('link', { name: /Back to guilds/ })).toHaveAttribute('href', '/guilds');
  });

  it('renders the left and right slot content', () => {
    render(<DetailLayout {...base} />);
    expect(screen.getByText('left content')).toBeInTheDocument();
    expect(screen.getByText('right content')).toBeInTheDocument();
  });

  it('does not render a footer when the footer prop is omitted', () => {
    const { container } = render(<DetailLayout {...base} />);
    expect(container.querySelector('[class*="footer"]')).toBeNull();
  });

  it('renders the footer when provided', () => {
    render(<DetailLayout {...base} footer={<button>Edit</button>} />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
