'use client';

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/**
 * Positions a small overlay (menus/popovers) relative to a trigger element and
 * clamps it into the viewport on mobile to avoid off-screen dropdowns.
 */
export type AnchoredOverlayAlign = 'start' | 'center' | 'end';
export type AnchoredOverlaySide = 'bottom' | 'top';
export type AnchoredOverlayStrategy = 'fixed' | 'absolute';

export interface AnchoredOverlayOptions {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  overlayRef: RefObject<HTMLElement | null>;
  align?: AnchoredOverlayAlign;
  preferSide?: AnchoredOverlaySide;
  sideOffset?: number;
  collisionPadding?: number;
  zIndex?: number;
  matchTriggerWidth?: boolean;
  strategy?: AnchoredOverlayStrategy;
  containerRef?: RefObject<HTMLElement | null>;
  collisionBoundaryRef?: RefObject<HTMLElement | null>;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function useAnchoredOverlayStyle({
  open,
  triggerRef,
  overlayRef,
  align = 'start',
  preferSide = 'bottom',
  sideOffset = 6,
  collisionPadding = 8,
  zIndex = 1000,
  matchTriggerWidth = false,
  strategy = 'fixed',
  containerRef,
  collisionBoundaryRef,
}: AnchoredOverlayOptions): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties>();

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    let frameId: number | undefined;
    let cleanupPositioning: (() => void) | undefined;

    const startPositioning = () => {
      const trigger = triggerRef.current;
      const overlay = overlayRef.current;
      if (!trigger || !overlay) return;

      const update = () => {
        const triggerRect = trigger.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();

        const visualViewport = window.visualViewport;
        const viewportLeft = visualViewport?.offsetLeft ?? 0;
        const viewportTop = visualViewport?.offsetTop ?? 0;
        const viewportWidth = visualViewport?.width ?? window.innerWidth;
        const viewportHeight =
          visualViewport?.height ?? window.innerHeight;
        const viewportRight = viewportLeft + viewportWidth;
        const viewportBottom = viewportTop + viewportHeight;
        const collisionBoundary =
          collisionBoundaryRef?.current?.getBoundingClientRect();
        const collisionLeft = Math.max(
          viewportLeft,
          collisionBoundary?.left ?? viewportLeft,
        );
        const collisionTop = Math.max(
          viewportTop,
          collisionBoundary?.top ?? viewportTop,
        );
        const collisionRight = Math.min(
          viewportRight,
          collisionBoundary?.right ?? viewportRight,
        );
        const collisionBottom = Math.min(
          viewportBottom,
          collisionBoundary?.bottom ?? viewportBottom,
        );

        const availableBelow =
          collisionBottom -
          collisionPadding -
          (triggerRect.bottom + sideOffset);
        const availableAbove =
          triggerRect.top -
          collisionTop -
          collisionPadding -
          sideOffset;

        const overlayHeight = overlayRect.height;
        const canFitBelow = overlayHeight <= availableBelow;
        const canFitAbove = overlayHeight <= availableAbove;

        let side: AnchoredOverlaySide = preferSide;
        if (preferSide === 'bottom' && !canFitBelow && canFitAbove) {
          side = 'top';
        }
        if (preferSide === 'top' && !canFitAbove && canFitBelow) {
          side = 'bottom';
        }
        if (!canFitBelow && !canFitAbove) {
          side = availableBelow >= availableAbove ? 'bottom' : 'top';
        }

        const maxHeight =
          side === 'bottom'
            ? Math.max(
                0,
                collisionBottom -
                  collisionPadding -
                  (triggerRect.bottom + sideOffset),
              )
            : Math.max(
                0,
                triggerRect.top -
                  sideOffset -
                  (collisionTop + collisionPadding),
              );
        const effectiveHeight = Math.min(overlayRect.height, maxHeight);

        let top =
          side === 'bottom'
            ? triggerRect.bottom + sideOffset
            : triggerRect.top - sideOffset - effectiveHeight;
        top = clamp(
          top,
          collisionTop + collisionPadding,
          collisionBottom - collisionPadding - effectiveHeight,
        );

        const effectiveWidth = matchTriggerWidth
          ? Math.min(
              triggerRect.width,
              Math.max(0, collisionRight - collisionLeft - collisionPadding * 2),
            )
          : Math.min(
              overlayRect.width,
              Math.max(0, collisionRight - collisionLeft - collisionPadding * 2),
            );
        let left = triggerRect.left;
        if (align === 'center') {
          left =
            triggerRect.left +
            triggerRect.width / 2 -
            effectiveWidth / 2;
        }
        if (align === 'end') {
          left = triggerRect.right - effectiveWidth;
        }
        left = clamp(
          left,
          collisionLeft + collisionPadding,
          collisionRight - collisionPadding - effectiveWidth,
        );

        const containerRect =
          strategy === 'absolute'
            ? containerRef?.current?.getBoundingClientRect()
            : null;

        setStyle({
          position: strategy,
          top: Math.round(top - (containerRect?.top ?? 0)),
          left: Math.round(left - (containerRect?.left ?? 0)),
          width: matchTriggerWidth
            ? Math.floor(effectiveWidth)
            : undefined,
          maxWidth: Math.floor(
            Math.max(0, collisionRight - collisionLeft - collisionPadding * 2),
          ),
          maxHeight: Math.floor(maxHeight),
          zIndex,
        });
      };

      update();

      const supportsResizeObserver = typeof ResizeObserver !== 'undefined';
      const ro = supportsResizeObserver ? new ResizeObserver(update) : null;
      ro?.observe(trigger);
      ro?.observe(overlay);

      window.addEventListener('resize', update, { passive: true });
      window.addEventListener('scroll', update, true);
      window.visualViewport?.addEventListener('resize', update, {
        passive: true,
      });
      window.visualViewport?.addEventListener('scroll', update, {
        passive: true,
      });

      cleanupPositioning = () => {
        ro?.disconnect();
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
        window.visualViewport?.removeEventListener('resize', update);
        window.visualViewport?.removeEventListener('scroll', update);
      };
    };

    startPositioning();
    if (!triggerRef.current || !overlayRef.current) {
      // Portal content can attach its ref after the parent layout effect. Wait
      // one frame for that commit instead of leaving the overlay unpositioned.
      frameId = window.requestAnimationFrame(startPositioning);
    }

    return () => {
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }
      cleanupPositioning?.();
    };
  }, [
    open,
    triggerRef,
    overlayRef,
    align,
    preferSide,
    sideOffset,
    collisionPadding,
    zIndex,
    matchTriggerWidth,
    strategy,
    containerRef,
    collisionBoundaryRef,
  ]);

  return style;
}
