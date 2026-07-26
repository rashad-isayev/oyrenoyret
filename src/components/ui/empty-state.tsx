import type { ReactNode } from 'react';
import { PiTray as Tray } from 'react-icons/pi';
import { cn } from '@/src/lib/utils';

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  size?: 'compact' | 'default' | 'spacious';
  className?: string;
};

const sizeClasses = {
  compact: 'min-h-28 py-4',
  default: 'min-h-44 py-7',
  spacious: 'min-h-52 py-8',
} as const;

/**
 * Global no-content and no-results presentation.
 * It stays flat and borderless so empty screens feel like part of the page,
 * rather than a disabled card competing with the surrounding content.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  size = 'default',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center px-4 text-center',
        sizeClasses[size],
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon ?? <Tray className="h-5 w-5" aria-hidden="true" />}
      </span>
      <h2 className="mt-3 text-base font-semibold leading-6 text-foreground">{title}</h2>
      {description ? (
        <div className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</div>
      ) : null}
      {action ? <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
