'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createGuild } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';

export const CreateGuildForm = () => {
  const t = useTranslations('Guild');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createGuild(name, description);
    } catch (error) {
      const err = error as Error;
      // Игнорируем ошибку NEXT_REDIRECT, так как это штатное поведение
      if (err.message === 'NEXT_REDIRECT') return;
      
      console.error('Failed to create guild:', error);
      alert(t('errorCreate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
      <div>
        <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>{t('nameLabel')}</label>
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
        <label htmlFor="description" style={{ display: 'block', marginBottom: '5px' }}>{t('descriptionLabel')}</label>
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
      <Button 
        type="submit" 
        variant="primary"
        disabled={loading || !name}
        fullWidth
      >
        {loading ? t('creating') : t('submit')}
      </Button>
    </form>
  );
};

