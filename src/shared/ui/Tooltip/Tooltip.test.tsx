import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Tooltip } from './Tooltip';

const renderWithProvider = (ui: React.ReactElement) =>
  render(<TooltipPrimitive.Provider>{ui}</TooltipPrimitive.Provider>);

describe('Tooltip', () => {
  it('renders trigger', () => {
    renderWithProvider(
      <Tooltip content="Hint">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
  });

  it('shows content on hover', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <Tooltip content="Hint" delayDuration={0}>
        <button>Hover me</button>
      </Tooltip>
    );
    await user.hover(screen.getByRole('button', { name: 'Hover me' }));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });
});
