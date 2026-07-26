import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

type PublicPageShellProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  width?: 'narrow' | 'article' | 'wide';
};

const widthClasses = {
  narrow: 'max-w-3xl pb-12 pt-12',
  article: 'max-w-4xl pb-20 pt-20',
  wide: 'max-w-6xl pb-24 pt-24 lg:pt-32',
} as const;

/** Shared editorial canvas for public resources, policies, and feature pages. */
export function PublicPageShell({
  children,
  className,
  width = 'article',
  ...props
}: PublicPageShellProps) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-1 flex-col px-4 sm:px-6 lg:px-8',
        widthClasses[width],
        className,
      )}
      {...props}
    >
      {children}
    </main>
  );
}
