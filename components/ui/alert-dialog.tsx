'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { Button } from '@/components/ui/button';
import { useModalSurface } from '@/src/lib/use-modal-surface';

interface AlertDialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

const useAlertDialog = () => {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) throw new Error('AlertDialog components must be used within AlertDialog');
  return ctx;
};

interface AlertDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const AlertDialog = ({ open, defaultOpen, onOpenChange, children }: AlertDialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const baseId = React.useId();
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = React.useCallback(
    (v: boolean) => {
      if (!isControlled) setInternalOpen(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange]
  );

  const value = React.useMemo(
    () => ({
      open: isOpen,
      onOpenChange: setIsOpen,
      titleId: `${baseId}-title`,
      descriptionId: `${baseId}-description`,
    }),
    [baseId, isOpen, setIsOpen]
  );

  return (
    <AlertDialogContext.Provider value={value}>
      {children}
    </AlertDialogContext.Provider>
  );
};

const AlertDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { onOpenChange } = useAlertDialog();
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onOpenChange(true);
      }}
      {...props}
    />
  );
});
AlertDialogTrigger.displayName = 'AlertDialogTrigger';

const AlertDialogPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
};

const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open, onOpenChange } = useAlertDialog();
  if (!open) return null;
  return (
    <AlertDialogPortal>
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 bg-black/45',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          className
        )}
        onClick={() => onOpenChange(false)}
        {...props}
      />
    </AlertDialogPortal>
  );
});
AlertDialogOverlay.displayName = 'AlertDialogOverlay';

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, onOpenChange, titleId, descriptionId } = useAlertDialog();
  const reduceMotion = useReducedMotion();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);
  useModalSurface({
    open,
    onClose: () => onOpenChange(false),
    containerRef: contentRef,
  });
  return (
    <AlertDialogPortal>
      <AnimatePresence initial={false}>
        {open ? (
          <React.Fragment key="alert-dialog">
            <motion.div
              key="alert-dialog-overlay"
              className="fixed inset-0 z-50 cursor-pointer bg-black/45"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              key="alert-dialog-content"
              initial={{
                opacity: 0,
                scale: reduceMotion ? 1 : 0.985,
                x: '-50%',
                y: reduceMotion ? '-50%' : 'calc(-50% + 8px)',
              }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{
                opacity: 0,
                scale: reduceMotion ? 1 : 0.99,
                x: '-50%',
                y: reduceMotion ? '-50%' : 'calc(-50% + 4px)',
              }}
              transition={{
                duration: reduceMotion ? 0 : 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="pointer-events-none fixed left-1/2 top-1/2 z-[51] w-[calc(100%-2rem)]"
            >
              <div
                ref={contentRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className={cn(
                  'pointer-events-auto mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-border/60 bg-background p-4 shadow-float sm:p-5',
                  className
                )}
                {...props}
              >
                {children}
              </div>
            </motion.div>
          </React.Fragment>
        ) : null}
      </AnimatePresence>
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = 'AlertDialogContent';

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4 flex flex-col gap-1.5 text-left', className)} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end',
      className
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, id, ...props }, ref) => {
  const { titleId } = useAlertDialog();
  return (
    <h2
      ref={ref}
      id={id ?? titleId}
      className={cn('text-lg font-semibold tracking-[-0.02em]', className)}
      {...props}
    />
  );
});
AlertDialogTitle.displayName = 'AlertDialogTitle';

const AlertDialogDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, id, ...props }, ref) => {
  const { descriptionId } = useAlertDialog();
  return (
    <div
      ref={ref}
      id={id ?? descriptionId}
      className={cn('max-w-2xl text-sm leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  );
});
AlertDialogDescription.displayName = 'AlertDialogDescription';

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button ref={ref} className={className} {...props} />
));
AlertDialogAction.displayName = 'AlertDialogAction';

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = useAlertDialog();
  return (
    <Button
      ref={ref}
      {...props}
      variant="outline"
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onOpenChange(false);
      }}
    />
  );
});
AlertDialogCancel.displayName = 'AlertDialogCancel';

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
