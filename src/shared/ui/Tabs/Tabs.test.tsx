import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Tabs } from './Tabs';

const tabs = [
  { id: 'a', label: 'First' },
  { id: 'b', label: 'Second' },
];

describe('Tabs', () => {
  it('renders all tabs', () => {
    render(<Tabs tabs={tabs} activeId="a" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Second' })).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    render(<Tabs tabs={tabs} activeId="b" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the tab id when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} activeId="a" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'Second' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('renders a badge when count > 0 and caps it at 9+', () => {
    render(
      <Tabs
        tabs={[{ id: 'a', label: 'First', badge: 3 }, { id: 'b', label: 'Second', badge: 42 }]}
        activeId="a"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('does not render a badge when count is 0 or undefined', () => {
    render(<Tabs tabs={[{ id: 'a', label: 'First', badge: 0 }, { id: 'b', label: 'Second' }]} activeId="a" onChange={vi.fn()} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
