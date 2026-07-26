/**
 * DashboardShell
 *
 * Shared layout container for signed-in product pages.
 * Width variants keep editorial, settings, and collection pages aligned without
 * introducing page-specific padding or duplicated max-width rules.
 */

import type { ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

export type DashboardShellWidth = 'standard' | 'reading' | 'narrow' | 'full';

interface DashboardShellProps {
  children: ReactNode;
  className?: string;
  width?: DashboardShellWidth;
}

const widthClasses = {
  standard: 'max-w-[960px]',
  reading: 'max-w-[768px]',
  narrow: 'max-w-[680px]',
  full: 'max-w-none',
} as const;

export function DashboardShell({
  children,
  className,
  width = 'standard',
}: DashboardShellProps) {
  return (
    <div
      className={cn(
        'mx-auto flex min-h-full w-full flex-col gap-6 text-foreground',
        widthClasses[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
