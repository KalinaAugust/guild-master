import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@tsparticles/react', () => ({
  default: ({ id }: { id: string }) => <div data-testid="particles" data-id={id} />,
  initParticlesEngine: vi.fn(() => Promise.resolve()),
}));
vi.mock('@tsparticles/slim', () => ({
  loadSlim: vi.fn(),
}));

import { ParticlesBackground } from './ParticlesBackground';

describe('ParticlesBackground', () => {
  it('renders the particles canvas container after init', async () => {
    render(<ParticlesBackground />);
    expect(await screen.findByTestId('particles')).toBeInTheDocument();
  });

  it('uses tsparticles as the element id', async () => {
    render(<ParticlesBackground />);
    expect(await screen.findByTestId('particles')).toHaveAttribute('data-id', 'tsparticles');
  });
});
