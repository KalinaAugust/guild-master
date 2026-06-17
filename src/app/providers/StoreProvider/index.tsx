'use client';

import { Provider } from 'react-redux';
import { store } from './config/store';
import { ReactNode } from 'react';
import { TooltipProvider } from '@/shared/ui/Tooltip';

import { useGetUserNotesQuery } from '@/entities/user';
import { GlobalUserNoteTooltip } from '@/widgets/GlobalUserNoteTooltip';

function NotesInitializer() {
  useGetUserNotesQuery();
  return null;
}

export default function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <TooltipProvider>
        <NotesInitializer />
        <GlobalUserNoteTooltip />
        {children}
      </TooltipProvider>
    </Provider>
  );
}
