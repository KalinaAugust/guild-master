import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { TimePicker } from './TimePicker';

const labels = { open: 'open', hours: 'Hours', minutes: 'Minutes' };

/** Controlled wrapper so selections persist across clicks. */
function Controlled({ onChange, initial = '' }: { onChange: (v: string) => void; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <TimePicker
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      placeholder="pick time"
      labels={labels}
    />
  );
}

describe('TimePicker', () => {
  it('shows the placeholder when empty', () => {
    render(<TimePicker value="" onChange={vi.fn()} placeholder="pick time" />);
    expect(screen.getByText('pick time')).toBeInTheDocument();
  });

  it('shows the selected value', () => {
    render(<TimePicker value="19:30" onChange={vi.fn()} />);
    expect(screen.getByText('19:30')).toBeInTheDocument();
  });

  it('fires onChange with HH:mm when hour then minute are picked', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    const hoursCol = screen.getByRole('list', { name: 'Hours' });
    const minutesCol = screen.getByRole('list', { name: 'Minutes' });

    fireEvent.click(within(hoursCol).getByRole('button', { name: '07' }));
    expect(onChange).toHaveBeenLastCalledWith('07:00');

    fireEvent.click(within(minutesCol).getByRole('button', { name: '15' }));
    expect(onChange).toHaveBeenLastCalledWith('07:15');
  });

  it('respects the minuteStep prop', () => {
    render(<TimePicker value="" onChange={vi.fn()} minuteStep={15} labels={labels} />);
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    const minutesCol = screen.getByRole('list', { name: 'Minutes' });
    expect(within(minutesCol).getByRole('button', { name: '45' })).toBeInTheDocument();
    expect(within(minutesCol).queryByRole('button', { name: '05' })).not.toBeInTheDocument();
  });
});
