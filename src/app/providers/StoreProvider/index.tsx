'use client';

import { Provider } from 'react-redux';
import { store } from './config/store';
import { ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export default function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <TooltipPrimitive.Provider>
        {children}
      </TooltipPrimitive.Provider>
    </Provider>
  );
}
