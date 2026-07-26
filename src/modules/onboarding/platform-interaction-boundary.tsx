import type { ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

/**
 * Disables the product surface for an account that has not completed the
 * activation milestones. Navigation and the recovery banner live outside this
 * boundary, so the account can browse routes and always recover.
 */
export function PlatformInteractionBoundary({
  locked,
  children,
  className,
}: {
  locked: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      inert={locked}
      aria-disabled={locked || undefined}
      data-platform-interaction={locked ? 'locked' : 'enabled'}
      className={cn(locked && 'platform-interaction-locked', className)}
    >
      {children}
    </div>
  );
}
