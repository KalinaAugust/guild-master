import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeRangePicker } from './TimeRangePicker';

describe('TimeRangePicker', () => {
  it('renders start and end values', () => {
    render(<TimeRangePicker start="19:00" end="21:00" onChange={vi.fn()} />);
    expect(screen.getByText('19:00')).toBeInTheDocument();
    expect(screen.getByText('21:00')).toBeInTheDocument();
  });

  it('shows the next-day hint when end <= start', () => {
    render(
      <TimeRangePicker
        start="23:00"
        end="01:00"
        onChange={vi.fn()}
        labels={{ nextDayHint: 'ends next day' }}
      />,
    );
    expect(screen.getByText('ends next day')).toBeInTheDocument();
  });

  it('hides the hint when there is no end', () => {
    render(
      <TimeRangePicker
        start="19:00"
        end=""
        onChange={vi.fn()}
        labels={{ nextDayHint: 'ends next day' }}
      />,
    );
    expect(screen.queryByText('ends next day')).not.toBeInTheDocument();
  });
});
