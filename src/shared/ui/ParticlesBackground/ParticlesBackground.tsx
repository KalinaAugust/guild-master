'use client';

import { useCallback } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine } from '@tsparticles/engine';
import styles from './ParticlesBackground.module.css';

const particlesOptions = {
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  particles: {
    color: { value: '#e2e8f0' },
    links: {
      enable: true,
      color: 'rgba(255, 255, 255, 0.3)',
      distance: 130,
      opacity: 0.35,
      width: 1,
    },
    move: { enable: true, speed: 0.3 },
    number: {
      density: { enable: true, area: 800 },
      value: 70,
    },
    opacity: { value: 0.5 },
    shape: { type: 'circle' },
    size: { value: { min: 2, max: 4 } },
  },
  interactivity: {
    events: {
      onHover: { enable: false },
      onClick: { enable: false },
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
