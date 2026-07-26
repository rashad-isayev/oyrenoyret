'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/src/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  /** Shared wordmark scale for sidebar, header, and prominent brand moments. */
  textSize?: 'sm' | 'lg' | 'xl';
  /** Preload logo for above-the-fold usage (header/sidebar). */
  priority?: boolean;
  /** Set to null when the mark is identifying the current flow, not navigation. */
  href?: string | null;
}

const sizeMap = {
  sm: { w: 32, h: 32 },
  md: { w: 40, h: 40 },
  lg: { w: 56, h: 56 },
};

export function Logo({
  className,
  size = 'sm',
  showText = false,
  textSize = 'sm',
  priority = false,
  href = '/',
}: LogoProps) {
  const { w, h } = sizeMap[size];

  const content = showText ? (
    <>
      <Image
        src="/oyrenoyretlogo.svg"
        alt=""
        width={w}
        height={h}
        className="logo-mark h-[1.25em] w-[1.25em] shrink-0"
        priority={priority}
      />
      <span className="brand-font">oyrenoyret</span>
    </>
  ) : (
    <Image
      src="/oyrenoyretlogo.svg"
      alt=""
      width={w}
      height={h}
      className="logo-mark shrink-0"
      priority={priority}
    />
  );

  const classes = cn(
    'inline-flex items-center gap-2',
    showText && textSize === 'sm' && 'text-sm',
    showText && textSize === 'lg' && 'text-lg',
    showText && textSize === 'xl' && 'text-[2rem] leading-none',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="oyrenoyret home">
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} aria-label="oyrenoyret">
      {content}
    </span>
  );
}
