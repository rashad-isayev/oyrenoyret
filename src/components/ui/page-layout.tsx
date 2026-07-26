import type { HTMLAttributes, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/src/lib/utils';

type PageBodyProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  spacing?: 'none' | 'compact' | 'default' | 'relaxed';
};

const spacingClasses = {
  none: '',
  compact: 'space-y-3',
  default: 'space-y-6',
  relaxed: 'space-y-8',
} as const;

/** Page content with the same section rhythm inside the app's main landmark. */
export function PageBody({
  children,
  className,
  spacing = 'default',
  ...props
}: PageBodyProps) {
  return (
    <div
      className={cn('min-w-0', spacingClasses[spacing], className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Header placeholder with the same geometry as PageHeader. */
export function PageHeaderSkeleton({ actions = false }: { actions?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-9 w-52 max-w-[75vw] rounded-xl" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {actions ? <Skeleton className="h-9 w-32" /> : null}
    </div>
  );
}
