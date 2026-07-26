'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/src/lib/utils';
import {
  useAnchoredOverlayStyle,
  type AnchoredOverlayAlign,
} from '@/src/lib/anchored-overlay';

interface HoverCardContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openSoon: () => void;
  closeSoon: () => void;
  cancelTimers: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

function useHoverCard() {
  const context = React.useContext(HoverCardContext);
  if (!context) throw new Error('HoverCard components must be used within <HoverCard>.');
  return context;
}

interface HoverCardProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  children: React.ReactNode;
}

/** Dependency-free hover card with delayed pointer and keyboard interactions. */
function HoverCard({
  open,
  defaultOpen = false,
  onOpenChange,
  openDelay = 180,
  closeDelay = 120,
  children,
}: HoverCardProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const triggerRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isControlled = open !== undefined;
  const isOpen = open ?? internalOpen;

  const cancelTimers = React.useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      cancelTimers();
      if (!isControlled) setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [cancelTimers, isControlled, onOpenChange],
  );

  const openSoon = React.useCallback(() => {
    cancelTimers();
    openTimer.current = setTimeout(() => setOpen(true), openDelay);
  }, [cancelTimers, openDelay, setOpen]);

  const closeSoon = React.useCallback(() => {
    cancelTimers();
    closeTimer.current = setTimeout(() => setOpen(false), closeDelay);
  }, [cancelTimers, closeDelay, setOpen]);

  React.useEffect(() => cancelTimers, [cancelTimers]);
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  const contextValue = React.useMemo(
    () => ({
      open: isOpen,
      setOpen,
      openSoon,
      closeSoon,
      cancelTimers,
      triggerRef,
      contentRef,
    }),
    [cancelTimers, closeSoon, isOpen, openSoon, setOpen],
  );

  return <HoverCardContext.Provider value={contextValue}>{children}</HoverCardContext.Provider>;
}

type HoverCardTriggerProps = React.HTMLAttributes<HTMLSpanElement>;

const HoverCardTrigger = React.forwardRef<HTMLSpanElement, HoverCardTriggerProps>(
  ({ children, onMouseEnter, onMouseLeave, onFocus, onBlur, ...props }, forwardedRef) => {
    const { openSoon, closeSoon, cancelTimers, triggerRef, contentRef } = useHoverCard();

    const setRefs = (node: HTMLSpanElement | null) => {
      triggerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    const interactionProps = {
      ...props,
      ref: setRefs,
      onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
        onMouseEnter?.(event);
        openSoon();
      },
      onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
        onMouseLeave?.(event);
        closeSoon();
      },
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        onFocus?.(event);
        cancelTimers();
        openSoon();
      },
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        onBlur?.(event);
        if (!contentRef.current?.contains(event.relatedTarget as Node)) closeSoon();
      },
      'aria-haspopup': 'dialog' as const,
    };

    return <span {...interactionProps}>{children}</span>;
  },
);
HoverCardTrigger.displayName = 'HoverCardTrigger';

interface HoverCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: AnchoredOverlayAlign;
  sideOffset?: number;
}

const HoverCardContent = React.forwardRef<HTMLDivElement, HoverCardContentProps>(
  ({ className, align = 'center', sideOffset = 4, onMouseEnter, onMouseLeave, onBlur, ...props }, forwardedRef) => {
    const { open, closeSoon, cancelTimers, triggerRef, contentRef } = useHoverCard();
    const [mounted, setMounted] = React.useState(false);
    const style = useAnchoredOverlayStyle({
      open,
      triggerRef,
      overlayRef: contentRef,
      align,
      sideOffset,
      collisionPadding: 12,
      zIndex: 1000,
    });

    React.useEffect(() => setMounted(true), []);

    const setRefs = (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    if (!mounted || !open) return null;

    return createPortal(
      <div
        ref={setRefs}
        role="dialog"
        style={{ ...style, visibility: style ? 'visible' : 'hidden' }}
        className={cn(
          'w-72 overflow-y-auto rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-float',
          'animate-fade-up focus-visible:outline-none',
          className,
        )}
        onMouseEnter={(event) => {
          onMouseEnter?.(event);
          cancelTimers();
        }}
        onMouseLeave={(event) => {
          onMouseLeave?.(event);
          closeSoon();
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (!triggerRef.current?.contains(event.relatedTarget as Node)) closeSoon();
        }}
        {...props}
      />,
      document.body,
    );
  },
);
HoverCardContent.displayName = 'HoverCardContent';

export { HoverCard, HoverCardTrigger, HoverCardContent };
