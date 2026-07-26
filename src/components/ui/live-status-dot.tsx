import { cn } from '@/src/lib/utils';

interface LiveStatusDotProps {
  className?: string;
}

export function LiveStatusDot({ className }: LiveStatusDotProps) {
  return (
    <span
      className={cn(
        'relative inline-flex h-3 w-3 shrink-0 text-[hsl(var(--success))]',
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute -inset-1 rounded-full bg-current opacity-40 motion-safe:animate-ping" />
      <span className="relative m-auto h-2.5 w-2.5 rounded-full bg-current" />
    </span>
  );
}
