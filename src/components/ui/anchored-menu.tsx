'use client';

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/src/lib/utils';
import {
  useAnchoredOverlayStyle,
  type AnchoredOverlayAlign,
  type AnchoredOverlaySide,
} from '@/src/lib/anchored-overlay';

interface AnchoredMenuProps {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: AnchoredOverlayAlign;
  preferSide?: AnchoredOverlaySide;
  sideOffset?: number;
  collisionPadding?: number;
  collisionBoundaryRef?: RefObject<HTMLElement | null>;
  onDismiss?: () => void;
  className?: string;
}

/**
 * A portal-based action menu that remains inside the visual viewport and
 * automatically flips above its trigger when there is insufficient room below.
 */
export function AnchoredMenu({
  open,
  triggerRef,
  children,
  align = 'end',
  preferSide = 'bottom',
  sideOffset = 6,
  collisionPadding = 10,
  collisionBoundaryRef,
  onDismiss,
  className,
}: AnchoredMenuProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const style = useAnchoredOverlayStyle({
    open,
    triggerRef,
    overlayRef: contentRef,
    align,
    preferSide,
    sideOffset,
    collisionPadding,
    collisionBoundaryRef,
    zIndex: 1000,
  });

  useEffect(() => {
    if (!open || !onDismiss) return;

    const dismissOnScroll = () => onDismiss();
    window.addEventListener('scroll', dismissOnScroll, {
      capture: true,
      passive: true,
    });
    window.visualViewport?.addEventListener('scroll', dismissOnScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', dismissOnScroll, true);
      window.visualViewport?.removeEventListener('scroll', dismissOnScroll);
    };
  }, [onDismiss, open]);

  if (typeof document === 'undefined' || !open) return null;

  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      style={{
        ...style,
        visibility: style ? 'visible' : 'hidden',
      }}
      className={cn(
        'w-max min-w-40 overflow-y-auto rounded-lg border border-border/70 bg-popover p-1 text-popover-foreground shadow-float',
        'animate-fade-up',
        className,
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
