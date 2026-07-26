/**
 * PageHeader
 *
 * Shared header for pages and dashboards.
 * ChatGPT-like hierarchy: direct title, quiet context, compact pill actions.
 */

import type { ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {badge && <div className="eyebrow">{badge}</div>}
        <h1 className="text-[26px] font-semibold leading-8 tracking-[-0.03em] text-foreground sm:text-[28px] sm:leading-9">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end sm:pt-0.5">
          {actions}
        </div>
      )}
    </header>
  );
}
