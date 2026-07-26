'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ScrollAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  scrollLabel: string;
  scrollHint: string;
  endReachedText: string;
  cancelLabel: string;
  acceptLabel: string;
  acceptingLabel?: string;
  acceptDisabled?: boolean;
  onAccept: () => boolean | void | Promise<boolean | void>;
  initiallyComplete?: boolean;
  children: ReactNode;
}

/**
 * Reusable reading gate for rules, policies, and other acknowledgements.
 * Acceptance becomes available only after the scrollable document has been
 * fully exposed, including when the entire document already fits on screen.
 */
export function ScrollAcceptanceDialog({
  open,
  onOpenChange,
  title,
  description,
  scrollLabel,
  scrollHint,
  endReachedText,
  cancelLabel,
  acceptLabel,
  acceptingLabel,
  acceptDisabled = false,
  onAccept,
  initiallyComplete = false,
  children,
}: ScrollAcceptanceDialogProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(initiallyComplete);
  const [accepting, setAccepting] = useState(false);

  const updateReadingProgress = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const atEnd =
      viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 2;
    if (atEnd) setReachedEnd(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(updateReadingProgress);
    return () => window.cancelAnimationFrame(frame);
  }, [open, updateReadingProgress]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!accepting) onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent className="flex max-h-[min(760px,calc(100dvh-2rem))] max-w-[640px] flex-col overflow-hidden p-0">
        <AlertDialogHeader className="mb-0 shrink-0 border-b border-border/60 px-5 py-4 sm:px-6">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div
          ref={viewportRef}
          onScroll={updateReadingProgress}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
          tabIndex={0}
          aria-label={scrollLabel}
        >
          {children}
          <div
            className="mt-8 rounded-xl bg-secondary p-4 text-sm leading-6"
            aria-live="polite"
          >
            {reachedEnd ? endReachedText : scrollHint}
          </div>
        </div>

        <AlertDialogFooter className="shrink-0 border-t border-border/60 px-5 py-4 sm:px-6">
          <AlertDialogCancel disabled={accepting}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!reachedEnd || acceptDisabled || accepting}
            onClick={async () => {
              setAccepting(true);
              try {
                const accepted = await onAccept();
                if (accepted !== false) onOpenChange(false);
              } finally {
                setAccepting(false);
              }
            }}
          >
            {accepting ? (acceptingLabel ?? acceptLabel) : acceptLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
