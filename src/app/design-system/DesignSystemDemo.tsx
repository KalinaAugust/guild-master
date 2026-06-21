'use client';

import React, { useState } from 'react';
import { Button, Input, Checkbox, Textarea, Select, Card, Modal } from '@/shared/design-system';

export function DesignSystemDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* 1. Base Components */}
      <section>
        <h2 style={{ fontFamily: 'var(--ds-font-display)', marginBottom: '1rem', color: 'var(--ds-color-primary)' }}>1. Базовые компоненты</h2>
        
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Buttons */}
          <Card>
            <h3 style={{ marginBottom: '1rem' }}>Buttons</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Button variant="primary" size="sm">Primary SM</Button>
                <Button variant="primary" size="md">Primary MD</Button>
                <Button variant="primary" size="lg">Primary LG</Button>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </div>
          </Card>

          {/* Inputs */}
          <Card>
            <h3 style={{ marginBottom: '1rem' }}>Inputs & Textarea</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input placeholder="Обычный инпут..." fullWidth />
              <Input placeholder="Инпут с ошибкой..." error fullWidth />
              <Input placeholder="Disabled..." disabled fullWidth />
              <Textarea placeholder="Textarea..." fullWidth />
            </div>
          </Card>

          {/* Checkbox & Select & Modal */}
          <Card>
            <h3 style={{ marginBottom: '1rem' }}>Controls</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Checkbox label="Согласен с условиями" />
                <Checkbox label="Отмеченный чекбокс" defaultChecked />
                <Checkbox label="Заблокировано" disabled />
              </div>
              <Select fullWidth>
                <option value="1">Опция 1</option>
                <option value="2">Опция 2</option>
                <option value="3">Опция 3</option>
              </Select>
              <Button variant="outline" onClick={() => setIsModalOpen(true)}>Открыть Modal</Button>
            </div>
          </Card>
        </div>
      </section>

      {/* 2. Complex Widgets */}
      <section>
        <h2 style={{ fontFamily: 'var(--ds-font-display)', marginBottom: '1rem', color: 'var(--ds-color-secondary)' }}>2. Сложные виджеты</h2>
        
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
          
          {/* Widget 1: Registration Form */}
          <Card variant="glass">
            <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--ds-font-display)' }}>Создание аккаунта</h3>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--ds-color-text-muted)' }}>Email</label>
                <Input type="email" placeholder="example@mail.com" fullWidth />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--ds-color-text-muted)' }}>Пароль</label>
                <Input type="password" placeholder="••••••••" fullWidth />
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <Checkbox label="Подписаться на рассылку новостей" defaultChecked />
              </div>
              <Button type="button" variant="primary" fullWidth style={{ marginTop: '1rem' }}>Зарегистрироваться</Button>
            </form>
          </Card>

          {/* Widget 2: Settings Panel */}
          <Card>
            <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--ds-font-display)' }}>Настройки профиля</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--ds-color-text-muted)' }}>Роль в гильдии</label>
                <Select fullWidth defaultValue="member">
                  <option value="admin">Администратор</option>
                  <option value="officer">Офицер</option>
                  <option value="member">Участник</option>
                </Select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--ds-color-text-muted)' }}>О себе</label>
                <Textarea placeholder="Расскажите о себе..." fullWidth defaultValue="Люблю играть по вечерам." />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <Button variant="ghost">Отмена</Button>
                <Button variant="secondary">Сохранить</Button>
              </div>
            </div>
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
