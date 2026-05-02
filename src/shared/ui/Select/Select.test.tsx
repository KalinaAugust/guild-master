import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';
import { describe, it, expect, vi } from 'vitest';

describe('Select Component', () => {
  const options = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
  ];

  it('renders with placeholder', () => {
    render(<Select value="" onValueChange={() => {}} options={options} placeholder="Select an option" />);
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('calls onValueChange when an option is selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Select value="" onValueChange={handleChange} options={options} placeholder="Select an option" />);
    
    // Open select
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    // Select option (Radix UI portal)
    // Radix UI Select items are usually in a portal, screen.findByText should find it
    const option = await screen.findByText('Option 1');
    await user.click(option);
    
    expect(handleChange).toHaveBeenCalledWith('1');
  });
});
