'use client';

import { ViewTransition } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Wraps the page content in a keyed <ViewTransition> so that only route
 * changes animate (exit of the old path + enter of the new one). Suspense
 * reveals — the skeleton-to-content swap within the same route — are an
 * "update" of the boundary and stay silent thanks to default="none", which
 * avoids the double-transition jump when navigating into async pages.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition
      key={pathname}
      default="none"
      enter="page-enter"
      exit="page-exit"
    >
      {children}
    </ViewTransition>
  );
}
