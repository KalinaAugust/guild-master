import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DatePicker } from './DatePicker';

describe('DatePicker', () => {
  it('shows the placeholder when empty', () => {
    render(<DatePicker value="" onChange={vi.fn()} placeholder="pick date" />);
    expect(screen.getByText('pick date')).toBeInTheDocument();
  });

  it('shows the formatted value', () => {
    render(<DatePicker value="2026-06-15" onChange={vi.fn()} locale="en" />);
    expect(screen.getByText('15 Jun 2026')).toBeInTheDocument();
  });

  it('fires onChange with YYYY-MM-DD when a day is picked', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-06-15" onChange={onChange} locale="en" labels={{ open: 'open' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    const dialog = screen.getByRole('dialog');
    // Pick the 20th of the shown month (June 2026).
    fireEvent.click(within(dialog).getByRole('button', { name: /20.*June 2026|June.*20.*2026|^20$/ }));

    expect(onChange).toHaveBeenCalledWith('2026-06-20');
  });
});
