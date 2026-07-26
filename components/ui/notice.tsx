import * as React from 'react';
import { cn } from '@/src/lib/utils';

export type NoticeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type NoticeSize = 'sm' | 'md';

const toneStyles: Record<NoticeTone, string> = {
  neutral: 'border-border/70 bg-secondary/60',
  info: 'border-info/25 bg-info/10',
  success: 'border-success/25 bg-success/10',
  warning: 'border-warning/25 bg-warning/10',
  danger: 'border-destructive/25 bg-destructive/10',
};

const sizeStyles: Record<NoticeSize, string> = {
  sm: 'rounded-lg px-3 py-2 text-xs',
  md: 'rounded-xl px-4 py-3 text-sm',
};

export interface NoticeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: NoticeTone;
  size?: NoticeSize;
  title?: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Semantic inline feedback for persistent page-level information.
 *
 * Use to explain archived, removed, pending, success, warning, and error
 * states without rebuilding palette and spacing rules inside each feature.
 */
const Notice = React.forwardRef<HTMLDivElement, NoticeProps>(
  (
    {
      className,
      tone = 'neutral',
      size = 'md',
      title,
      icon,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        'border text-foreground',
        toneStyles[tone],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-current">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {title ? <div className="font-medium text-foreground">{title}</div> : null}
          {children ? (
            <div className={cn(title && 'mt-1', 'leading-relaxed text-muted-foreground')}>
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ),
);
Notice.displayName = 'Notice';

export { Notice };
