'use client';

import { useCallback } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine } from '@tsparticles/engine';
import styles from './ParticlesBackground.module.css';

const particlesOptions = {
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  particles: {
    color: { value: '#9d4edd' },
    links: {
      enable: true,
      color: '#c8b6ff',
      distance: 130,
      opacity: 0.35,
      width: 1,
    },
    move: { enable: true, speed: 1.5 },
    number: {
      density: { enable: true, area: 800 },
      value: 60,
    },
    opacity: { value: 0.5 },
    shape: { type: 'circle' },
    size: { value: { min: 2, max: 4 } },
  },
  interactivity: {
    events: {
      onHover: { enable: true, mode: 'repulse' },
    },
    modes: {
      repulse: { distance: 80, duration: 0.4 },
    },
  },
  detectRetina: true,
} as const;

export function ParticlesBackground() {
  const init = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <ParticlesProvider init={init}>
      <Particles
        id="tsparticles"
        className={styles.root}
        options={particlesOptions}
      />
    </ParticlesProvider>
  );
}
