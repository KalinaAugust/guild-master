import React from 'react';
import { Sword, Gamepad2, Users, Calendar, Skull, PartyPopper, Dumbbell, Dices, Puzzle } from 'lucide-react';
import { ActivityType } from '@/shared/types';

export const ACTIVITY_TYPES: ActivityType[] = [
  'raid',
  'game',
  'meeting',
  'dungeon',
  'party',
  'sport',
  'dnd',
  'boardgame',
  'other',
];

export const typeIcons: Record<ActivityType, React.ReactNode> = {
  raid: <Sword size={14} />,
  game: <Gamepad2 size={14} />,
  meeting: <Users size={14} />,
  other: <Calendar size={14} />,
  dungeon: <Skull size={14} />,
  party: <PartyPopper size={14} />,
  sport: <Dumbbell size={14} />,
  dnd: <Dices size={14} />,
  boardgame: <Puzzle size={14} />,
};
