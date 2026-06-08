'use client';

import React from 'react';
import { Select } from '@/shared/ui/Select';

interface GuildOption {
  label: React.ReactNode;
  value: string;
  avatar?: string;
  avatarFallback?: React.ReactNode;
}

interface GuildSelectProps {
  value: string;
  options: GuildOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const GuildSelect: React.FC<GuildSelectProps> = ({ value, options, onValueChange, placeholder, className }) => (
  <Select
    value={value}
    onValueChange={onValueChange}
    options={options}
    placeholder={placeholder}
    className={className}
    truncate
  />
);
