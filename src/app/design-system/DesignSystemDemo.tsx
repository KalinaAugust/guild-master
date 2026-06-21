'use client';

import React, { useState } from 'react';
import { Button, Input, Checkbox, Textarea, Select, Card, Modal, Avatar, Badge, Switch, Skeleton, Tabs } from '@/shared/design-system';

const tokens = [
  { name: '--ds-color-bg', value: '#030d1a' },
  { name: '--ds-color-primary', value: '#2d9ed0' },
  { name: '--ds-color-primary-hover', value: '#2589b6' },
  { name: '--ds-color-secondary', value: '#7dd3fc' },
  { name: '--ds-color-text', value: '#ffffff' },
  { name: '--ds-color-text-muted', value: 'rgba(255, 255, 255, 0.6)' },
  { name: '--ds-color-border', value: 'rgba(255, 255, 255, 0.08)' },
  { name: '--ds-color-glass', value: 'rgba(255, 255, 255, 0.05)' },
];

export function DesignSystemDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* 0. Color Palette */}
      <section>
        <h2 style={{ fontFamily: 'var(--ds-font-display)', marginBottom: '1rem', color: 'var(--ds-color-primary)' }}>Color Palette</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {tokens.map((t) => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--ds-radius-md)', backgroundColor: 'var(--ds-color-glass)', border: '1px solid var(--ds-color-border)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: `var(${t.name})`, flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}></div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', color: 'var(--ds-color-text-muted)', marginBottom: '4px' }}>{t.name}</div>
                <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>{t.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 1. Base Components */}
      <section>
        <h2 style={{ fontFamily: 'var(--ds-font-display)', marginBottom: '1rem', color: 'var(--ds-color-primary)' }}>1. Базовые компоненты</h2>
        
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Buttons */}
          <Card>
            <h3 style={{ marginBottom: '1rem' }}>Buttons & Badges</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Button variant="primary" size="sm">Primary SM</Button>
                <Button variant="primary" size="md">Primary MD</Button>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                <Badge variant="default">Default</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
              </div>
            </div>
          </Card>

          {/* Inputs & Form Controls */}
          <Card>
            <h3 style={{ marginBottom: '1rem' }}>Form Controls</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input placeholder="Обычный инпут..." fullWidth />
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Checkbox label="Согласен" />
                <Switch defaultChecked />
                <span style={{ fontSize: '14px', color: 'var(--ds-color-text)' }}>Toggle</span>
              </div>
              <Select fullWidth>
                <option value="1">Опция 1</option>
                <option value="2">Опция 2</option>
              </Select>
            </div>
          </Card>

          {/* Content display */}
          <Card>
            <h3 style={{ marginBottom: '1rem' }}>Data Display</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Avatar fallback="AB" size="sm" />
                <Avatar src="https://i.pravatar.cc/150?u=a042581f4e29026704d" size="md" />
                <Avatar fallback="U" size="lg" />
              </div>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--ds-color-text-muted)', marginBottom: '0.5rem' }}>Skeleton:</h4>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Skeleton variant="circular" style={{ width: '48px', height: '48px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton variant="text" style={{ width: '60%' }} />
                    <Skeleton variant="text" style={{ width: '90%' }} />
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={() => setIsModalOpen(true)}>Открыть Modal</Button>
            </div>
          </Card>
        </div>
      </section>

      {/* 2. Complex Widgets */}
      <section>
        <h2 style={{ fontFamily: 'var(--ds-font-display)', marginBottom: '1rem', color: 'var(--ds-color-secondary)' }}>2. Сложные виджеты</h2>
        
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
          
          {/* Widget 1: Profile Tabs */}
          <Card variant="glass">
            <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--ds-font-display)' }}>Карточка пользователя</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <Avatar src="https://i.pravatar.cc/150?u=123" size="lg" />
              <div>
                <h4 style={{ fontSize: '18px', margin: 0, color: 'var(--ds-color-text)' }}>Алексей Иванов <Badge variant="success">Online</Badge></h4>
                <span style={{ fontSize: '14px', color: 'var(--ds-color-text-muted)' }}>Офицер гильдии</span>
              </div>
            </div>
            
            <Tabs 
              tabs={[
                { id: 'tab1', label: 'Информация', content: <div style={{ paddingTop: '1rem' }}><p style={{ fontSize: '14px', color: 'var(--ds-color-text-muted)' }}>Зарегистрирован: 12 мая 2026. Любимый класс: Маг.</p></div> },
                { id: 'tab2', label: 'Настройки', content: <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--ds-color-text)' }}>Уведомления на email</span>
                    <Switch defaultChecked />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--ds-color-text)' }}>Скрытый профиль</span>
                    <Switch />
                  </div>
                </div> }
              ]} 
            />
          </Card>

        </div>
      </section>

      {/* Modal Instance */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Подтверждение действия"
      >
        <p style={{ marginBottom: '1.5rem', color: 'var(--ds-color-text-muted)' }}>
          Вы уверены, что хотите применить эти изменения? Это действие нельзя отменить.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Отмена</Button>
          <Button variant="primary" onClick={() => setIsModalOpen(false)}>Подтвердить</Button>
        </div>
      </Modal>

    </div>
  );
}
