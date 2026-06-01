import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { describe, it, expect, vi } from 'vitest';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is passed', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button', { name: 'Click me' }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies primary variant class', () => {
    const { container } = render(<Button variant="primary">Btn</Button>);
    expect(container.querySelector('button')?.className).toMatch(/primary/);
  });

  it('applies secondary variant class', () => {
    const { container } = render(<Button variant="secondary">Btn</Button>);
    expect(container.querySelector('button')?.className).toMatch(/secondary/);
  });

  it('applies danger variant class', () => {
    const { container } = render(<Button variant="danger">Btn</Button>);
    expect(container.querySelector('button')?.className).toMatch(/danger/);
  });

  it('renders as type="submit" when specified', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
