'use client';

import React from 'react';

export function DesignSystemDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <section>
        <h2 style={{ fontFamily: 'var(--ds-font-display)', marginBottom: '1rem', color: 'var(--ds-color-secondary)' }}>Nested Glassmorphism Solutions</h2>
        <p style={{ color: 'var(--ds-color-text-muted)', marginBottom: '2rem' }}>
          Nested elements with <code>backdrop-filter: blur</code> can cause rendering artifacts and severely impact performance. 
          Below are solutions to this problem without using multiple blurs.
        </p>
        
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          
          {/* Option 1: The Anti-pattern (Nested blurs) */}
          <div style={{ 
            background: 'var(--ds-color-glass)', 
            backdropFilter: 'blur(12px)', 
            padding: '2rem', 
            borderRadius: 'var(--ds-radius-lg)',
            border: '1px solid var(--ds-color-border)'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>1. Double Blur (Anti-pattern)</h3>
            <p style={{ fontSize: '14px', color: 'var(--ds-color-text-muted)', marginBottom: '1rem' }}>
              Blur over blur. Causes bugs in Safari and slows down scrolling.
            </p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)', /* BAD */
              padding: '1.5rem',
              borderRadius: 'var(--ds-radius-md)',
              border: '1px solid var(--ds-color-border)'
            }}>
              Nested content
            </div>
          </div>

          {/* Option 2: Translucent without blur */}
          <div style={{ 
            background: 'var(--ds-color-glass)', 
            backdropFilter: 'blur(12px)', 
            padding: '2rem', 
            borderRadius: 'var(--ds-radius-lg)',
            border: '1px solid var(--ds-color-border)'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>2. Translucency without Blur (Good)</h3>
            <p style={{ fontSize: '14px', color: 'var(--ds-color-text-muted)', marginBottom: '1rem' }}>
              The inner element uses only an rgba background, relying on the parent's blur.
            </p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)', /* Slightly more opaque than parent */
              padding: '1.5rem',
              borderRadius: 'var(--ds-radius-md)',
              border: '1px solid var(--ds-color-border)'
            }}>
              Nested content
            </div>
          </div>

          {/* Option 3: Inner Shadows / Glow */}
          <div style={{ 
            background: 'var(--ds-color-glass)', 
            backdropFilter: 'blur(12px)', 
            padding: '2rem', 
            borderRadius: 'var(--ds-radius-lg)',
            border: '1px solid var(--ds-color-border)'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>3. Inner Shadow / Cutout (Excellent)</h3>
            <p style={{ fontSize: '14px', color: 'var(--ds-color-text-muted)', marginBottom: '1rem' }}>
              Using <code>box-shadow</code> (inset and regular) and a dark background to create a "cutout" effect.
            </p>
            <div style={{
              background: 'rgba(3, 13, 26, 0.4)', /* Darker cutout background */
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1)',
              padding: '1.5rem',
              borderRadius: 'var(--ds-radius-md)',
              border: '1px solid rgba(0,0,0,0.3)'
            }}>
              Nested content
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
