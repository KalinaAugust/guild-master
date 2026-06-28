import React from 'react';
import { DesignSystemDemo } from './DesignSystemDemo';

export default function DesignSystemPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--ds-font-body)' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid var(--ds-color-border)', paddingBottom: '1rem' }}>
        <h1 style={{ fontFamily: 'var(--ds-font-display)', marginBottom: '0.5rem' }}>Design System</h1>
        <p style={{ color: 'var(--ds-color-text-muted)' }}>
          ⚠️ This page is intended exclusively for testing design components.
        </p>
      </header>

      <DesignSystemDemo />
    </div>
  );
}
