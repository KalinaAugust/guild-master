'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGuild } from '@/entities/guild';

export const CreateGuildForm = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createGuild(name, description);
    } catch (error) {
      // Игнорируем ошибку NEXT_REDIRECT, так как это штатное поведение
      if ((error as any)?.message === 'NEXT_REDIRECT') return;
      
      console.error('Failed to create guild:', error);
      alert('Ошибка при создании гильдии');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
      <div>
        <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Название гильдии</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ 
            width: '100%', 
            padding: '8px', 
            borderRadius: '4px', 
            border: '1px solid rgba(255,255,255,0.2)', 
            background: 'rgba(255,255,255,0.05)', 
            color: 'inherit' 
          }}
        />
      </div>
      <div>
        <label htmlFor="description" style={{ display: 'block', marginBottom: '5px' }}>Описание (необязательно)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '8px', 
            borderRadius: '4px', 
            border: '1px solid rgba(255,255,255,0.2)', 
            background: 'rgba(255,255,255,0.05)', 
            color: 'inherit',
            minHeight: '100px'
          }}
        />
      </div>
      <button 
        type="submit" 
        disabled={loading || !name}
        style={{ 
          padding: '10px', 
          borderRadius: '4px', 
          border: 'none', 
          backgroundColor: '#3b82f6', 
          color: 'white', 
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Создание...' : 'Создать гильдию'}
      </button>
    </form>
  );
};
