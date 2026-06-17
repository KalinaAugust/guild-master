import React from 'react';
import { Gamepad2, Users, Calendar, PartyPopper, Dumbbell, Dices, Puzzle } from 'lucide-react';
import { ActivityType } from '@/shared/types';

export const ACTIVITY_TYPES: ActivityType[] = [
  'game',
  'meeting',
  'party',
  'sport',
  'dnd',
  'boardgame',
  'other',
];

export const typeIcons: Record<ActivityType, React.ReactNode> = {
  game: <Gamepad2 size={14} />,
  meeting: <Users size={14} />,
  other: <Calendar size={14} />,
  party: <PartyPopper size={14} />,
  sport: <Dumbbell size={14} />,
  dnd: <Dices size={14} />,
  boardgame: <Puzzle size={14} />,
};
