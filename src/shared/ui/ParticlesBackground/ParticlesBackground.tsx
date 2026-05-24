'use client';

import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import styles from './ParticlesBackground.module.css';

export function ParticlesBackground() {
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setEngineReady(true));
  }, []);

  if (!engineReady) return null;

  return (
    <Particles
      id="tsparticles"
      className={styles.root}
      options={{
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
      }}
    />
  );
}
