'use client';

import { Provider } from 'react-redux';
import { store } from './config/store';
import { ReactNode } from 'react';
import { TooltipProvider } from '@/shared/ui/Tooltip';

export default function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </Provider>
  );
}
