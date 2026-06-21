import React from 'react';
import { Button, Input, Checkbox, Textarea, Select, Card, Modal } from '@/shared/design-system';

// Client component wrapper for Modal to handle state
import { DesignSystemDemo } from './DesignSystemDemo';

export default function DesignSystemPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--ds-font-body)' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid var(--ds-color-border)', paddingBottom: '1rem' }}>
        <h1 style={{ fontFamily: 'var(--ds-font-display)', marginBottom: '0.5rem' }}>Дизайн система</h1>
        <p style={{ color: 'var(--ds-color-text-muted)' }}>
          ⚠️ Эта страница предназначена исключительно для тестирования компонентов дизайна.
          Реальный бекенд не используется, все данные моковые.
        </p>
      </header>

      <DesignSystemDemo />
    </div>
  );
}
