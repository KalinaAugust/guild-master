import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Spinner } from './Spinner';
import styles from './Spinner.module.css';

describe('Spinner Component', () => {
  it('renders successfully with default props', () => {
    render(<Spinner data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('role', 'status');
  });

  it('applies custom className and centered prop styles', () => {
    render(<Spinner data-testid="spinner" className="custom-class" centered />);
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveClass('custom-class');
    // Check if the spinner has the centered layout class
    expect(spinner).toHaveClass(styles.centered);
  });

  it('applies inline styles for size and color', () => {
    render(<Spinner data-testid="spinner" size="lg" color="rgb(255, 0, 0)" />);
    const spinner = screen.getByTestId('spinner');
    
    // Default size 'lg' is mapped to 40px in Spinner.tsx
    expect(spinner.style.width).toBe('40px');
    expect(spinner.style.height).toBe('40px');
    expect(spinner.style.color).toBe('rgb(255, 0, 0)');
  });

  it('supports custom numeric size', () => {
    render(<Spinner data-testid="spinner" size={60} />);
    const spinner = screen.getByTestId('spinner');
    
    expect(spinner.style.width).toBe('60px');
    expect(spinner.style.height).toBe('60px');
  });
});
