import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('forwards props to the input', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('applies hasError styling when hasError is true', () => {
    const { container } = render(<Input hasError />);
    const input = container.querySelector('input');
    expect(input?.className).toMatch(/inputError/);
  });

  it('does not apply error class by default', () => {
    const { container } = render(<Input />);
    const input = container.querySelector('input');
    expect(input?.className).not.toMatch(/inputError/);
  });

  it('merges custom className', () => {
    const { container } = render(<Input className="custom" />);
    expect(container.querySelector('input')?.className).toContain('custom');
  });

  it('renders an icon when icon prop is provided', () => {
    render(<Input icon={<span data-testid="icon">icon</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies custom className to the wrapper when icon is provided', () => {
    const { container } = render(<Input icon={<span>icon</span>} className="custom-wrapper" />);
    const wrapper = container.querySelector('.custom-wrapper');
    expect(wrapper?.className).toContain('inputWrapper');
  });
});
