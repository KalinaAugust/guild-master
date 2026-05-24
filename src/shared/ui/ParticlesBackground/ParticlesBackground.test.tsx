import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@tsparticles/react', () => ({
  default: ({ id }: { id: string }) => <div data-testid="particles" data-id={id} />,
  Particles: ({ id }: { id: string }) => <div data-testid="particles" data-id={id} />,
  ParticlesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@tsparticles/slim', () => ({
  loadSlim: vi.fn(),
}));

import React from 'react';
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
