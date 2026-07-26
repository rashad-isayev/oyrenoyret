'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { fieldControlFrameStyles } from '@/components/ui/control-styles';
import { toast } from 'sonner';
import {
  PiCaretUp as CaretUp,
  PiCheck as Check,
  PiTag as Tag,
} from 'react-icons/pi';
import { useI18n } from '@/src/i18n/i18n-provider';
import { extractErrorMessage, formatErrorToast } from '@/src/lib/error-toast';
import { CompactRichText, type CompactRichTextImage, type CompactRichTextStats } from '@/src/components/rich-text/compact-rich-text';
import { discussionRichTextHasContent } from '@/src/lib/discussion-rich-text';
import { appendDiscussionAttachmentsToHtml } from '@/src/lib/discussion-attachments';
import { CONTENT_LIMITS } from '@/src/config/constants';
import { MAX_DISCUSSION_IMAGES } from '@/src/config/uploads';
import { cn } from '@/src/lib/utils';
import { useAnchoredOverlayStyle } from '@/src/lib/anchored-overlay';
import { useTransientFlag } from '@/src/lib/use-transient-flag';
import { truncateUtf16Safely } from '@/src/lib/text-limits';
import {
  getDiscussionContextTagOptions,
  MAX_DISCUSSION_CONTEXT_TAGS,
  type DiscussionContextTagId,
} from '@/src/modules/discussions/discussion-context-tags';

interface CreateDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

type DiscussionContextOption = ReturnType<
  typeof getDiscussionContextTagOptions
>[number];

const subscribeToClient = () => () => {};

function DiscussionContextMenu({
  values,
  options,
  label,
  placeholder,
  hint,
  limitMessage,
  onChange,
}: {
  values: DiscussionContextTagId[];
  options: DiscussionContextOption[];
  label: string;
  placeholder: string;
  hint: string;
  limitMessage: string;
  onChange: (values: DiscussionContextTagId[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const isClient = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
  const portalRoot = isClient ? document.body : null;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const reduceMotion = useReducedMotion();
  const selectedOptions = options.filter((option) =>
    values.includes(option.id),
  );
  const menuStyle = useAnchoredOverlayStyle({
    open,
    triggerRef,
    overlayRef: menuRef,
    align: 'start',
    preferSide: 'top',
    sideOffset: 8,
    collisionPadding: 16,
    zIndex: 1000,
    matchTriggerWidth: true,
    strategy: 'fixed',
  });

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = Math.max(
      0,
      options.findIndex((option) => values.includes(option.id)),
    );
    const frame = requestAnimationFrame(() => {
      optionRefs.current[selectedIndex]?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, options, values]);

  const focusOption = (index: number) => {
    const nextIndex = (index + options.length) % options.length;
    optionRefs.current[nextIndex]?.focus({ preventScroll: true });
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const menu =
    portalRoot
      ? createPortal(
          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                ref={menuRef}
                id={menuId}
                role="listbox"
                aria-multiselectable="true"
                aria-label={label}
                style={menuStyle}
                initial={{
                  opacity: 0,
                  y: reduceMotion ? 0 : 8,
                  scale: reduceMotion ? 1 : 0.98,
                }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: reduceMotion ? 0 : 6,
                  scale: reduceMotion ? 1 : 0.985,
                }}
                transition={{
                  duration: reduceMotion ? 0 : 0.18,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="min-w-0 overflow-x-hidden overflow-y-auto rounded-xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-float"
              >
                {options.map((option, index) => {
                  const optionSelected = values.includes(option.id);
                  const previousOptionSelected =
                    index > 0 && values.includes(options[index - 1].id);
                  const nextOptionSelected =
                    index < options.length - 1 &&
                    values.includes(options[index + 1].id);
                  const selectionBlocked =
                    !optionSelected &&
                    values.length >= MAX_DISCUSSION_CONTEXT_TAGS;
                  return (
                    <button
                      key={option.id}
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      type="button"
                      role="option"
                      aria-selected={optionSelected}
                      aria-disabled={selectionBlocked}
                      onClick={() => {
                        if (selectionBlocked) {
                          toast.error(limitMessage);
                          return;
                        }
                        onChange(
                          optionSelected
                            ? values.filter((value) => value !== option.id)
                            : [...values, option.id],
                        );
                      }}
                      onKeyDown={(event) => handleOptionKeyDown(event, index)}
                      className={cn(
                        'relative flex min-h-12 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-lg px-3 py-2 text-left transition-[color,background-color,border-radius] duration-200',
                        'hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/75',
                        optionSelected &&
                          'z-[1] bg-primary/10 hover:bg-primary/15',
                        optionSelected &&
                          previousOptionSelected &&
                          'rounded-t-none',
                        optionSelected &&
                          nextOptionSelected &&
                          'rounded-b-none',
                        selectionBlocked &&
                          'cursor-not-allowed opacity-45 hover:bg-transparent',
                      )}
                    >
                      <Tag
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          #{option.tag} · {option.description}
                        </span>
                      </span>
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0 text-primary transition-opacity',
                          optionSelected ? 'opacity-100' : 'opacity-0',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>,
          portalRoot,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        id="discussion-context"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-state={open ? 'open' : 'closed'}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (
            event.key === 'ArrowDown' ||
            event.key === 'ArrowUp' ||
            event.key === 'Enter' ||
            event.key === ' '
          ) {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
        className={cn(
          fieldControlFrameStyles,
          'group flex min-h-14 items-center gap-2 overflow-hidden px-2.5 py-1.5 text-left',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Tag className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-xs font-medium',
              selectedOptions.length > 0
                ? 'text-foreground'
                : 'text-muted-foreground',
            )}
          >
            {selectedOptions.length > 0
              ? selectedOptions.map((option) => option.label).join(', ')
              : placeholder}
          </span>
          <span className="block truncate text-[10px] text-muted-foreground">
            {selectedOptions.length > 0
              ? `${selectedOptions.length}/${MAX_DISCUSSION_CONTEXT_TAGS} · ${selectedOptions
                  .map((option) => `#${option.tag}`)
                  .join(' · ')}`
              : hint}
          </span>
        </span>
        <CaretUp
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
            !open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      {menu}
    </>
  );
}

export function CreateDiscussionDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateDiscussionDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentStats, setContentStats] = useState<CompactRichTextStats>({ words: 0, characters: 0 });
  const [attachments, setAttachments] = useState<CompactRichTextImage[]>([]);
  const [selectedContexts, setSelectedContexts] = useState<
    DiscussionContextTagId[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const titleLimitFeedback = useTransientFlag();
  const contentLimitFeedback = useTransientFlag();
  const { t, messages } = useI18n();
  const copy = messages.discussions.createDialog;
  const contextTags = getDiscussionContextTagOptions(messages.discussions.contextTags);
  const titleLimitHit = titleLimitFeedback.active;
  const contentLimitHit = contentLimitFeedback.active;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const composed = appendDiscussionAttachmentsToHtml(content, attachments);
    if (!title.trim() || !discussionRichTextHasContent(composed)) {
      toast.error(copy.titleRequired);
      return;
    }
    if (selectedContexts.length === 0) {
      toast.error(copy.contextRequired);
      return;
    }
    if (contentStats.characters > CONTENT_LIMITS.DISCUSSION_CONTENT_MAX) {
      toast.error(
        t('discussions.createDialog.contentTooLong', { count: CONTENT_LIMITS.DISCUSSION_CONTENT_MAX })
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: composed,
          tags: selectedContexts,
        }),
      });
      const created = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(formatErrorToast(copy.createFailed, extractErrorMessage(created)));
        return;
      }
      toast.success(copy.created);
      onOpenChange(false);
      setTitle('');
      setContent('');
      setContentStats({ words: 0, characters: 0 });
      titleLimitFeedback.clear();
      contentLimitFeedback.clear();
      setAttachments([]);
      setSelectedContexts([]);
      router.refresh();
      onCreated?.();
      router.push(`/discussions/${created.id}`);
    } catch (error) {
      toast.error(
        formatErrorToast(copy.createFailed, error instanceof Error ? error.message : null),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="relative min-w-0 max-w-[760px] overflow-hidden p-0 sm:p-0"
      >
        <AlertDialogHeader className="mb-0 min-w-0 overflow-hidden border-b border-border/60 px-5 py-4 sm:px-6">
          <AlertDialogTitle className="truncate">{copy.dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription className="line-clamp-2 break-words">
            {copy.dialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form className="min-w-0 overflow-hidden" onSubmit={handleSubmit}>
          <div className="max-h-[calc(100dvh-12rem)] min-w-0 space-y-5 overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-6">
            <Field invalid={titleLimitHit}>
              <FieldLabel htmlFor="discussion-title">{copy.titleLabel}</FieldLabel>
              <Input
                id="discussion-title"
                value={title}
                onBeforeInput={(event) => {
                  const nativeEvent = event.nativeEvent as InputEvent;
                  const inputType =
                    typeof nativeEvent.inputType === 'string'
                      ? nativeEvent.inputType
                      : '';
                  const insertedText =
                    typeof nativeEvent.data === 'string'
                      ? nativeEvent.data
                      : '';
                  if (
                    inputType.startsWith('delete') ||
                    !insertedText
                  ) {
                    return;
                  }
                  const input = event.currentTarget;
                  const selectedLength =
                    (input.selectionEnd ?? input.value.length) -
                    (input.selectionStart ?? input.value.length);
                  if (
                    input.value.length -
                      selectedLength +
                      insertedText.length >
                    CONTENT_LIMITS.DISCUSSION_TITLE_MAX
                  ) {
                    titleLimitFeedback.trigger();
                  }
                }}
                onPaste={(event) => {
                  const pastedText =
                    event.clipboardData.getData('text/plain');
                  const input = event.currentTarget;
                  const selectionStart =
                    input.selectionStart ?? input.value.length;
                  const selectionEnd =
                    input.selectionEnd ?? input.value.length;
                  const retainedLength =
                    input.value.length -
                    (selectionEnd - selectionStart);
                  const availableCharacters = Math.max(
                    0,
                    CONTENT_LIMITS.DISCUSSION_TITLE_MAX -
                      retainedLength,
                  );
                  if (pastedText.length <= availableCharacters) return;

                  event.preventDefault();
                  const acceptedText = truncateUtf16Safely(
                    pastedText,
                    availableCharacters,
                  );
                  const nextTitle =
                    input.value.slice(0, selectionStart) +
                    acceptedText +
                    input.value.slice(selectionEnd);
                  setTitle(nextTitle);
                  titleLimitFeedback.trigger();
                  requestAnimationFrame(() => {
                    const caret =
                      selectionStart + acceptedText.length;
                    input.setSelectionRange(caret, caret);
                  });
                }}
                onKeyDown={(event) => {
                  if (
                    event.key.length !== 1 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.altKey
                  ) {
                    return;
                  }
                  const input = event.currentTarget;
                  const selectedLength =
                    (input.selectionEnd ?? input.value.length) -
                    (input.selectionStart ?? input.value.length);
                  if (
                    input.value.length - selectedLength >=
                    CONTENT_LIMITS.DISCUSSION_TITLE_MAX
                  ) {
                    titleLimitFeedback.trigger();
                  }
                }}
                onChange={(event) => {
                  if (
                    event.target.value.length >
                    CONTENT_LIMITS.DISCUSSION_TITLE_MAX
                  ) {
                    titleLimitFeedback.trigger();
                  }
                  setTitle(
                    event.target.value.slice(
                      0,
                      CONTENT_LIMITS.DISCUSSION_TITLE_MAX,
                    ),
                  );
                }}
                placeholder={copy.titlePlaceholder}
                maxLength={CONTENT_LIMITS.DISCUSSION_TITLE_MAX}
                aria-invalid={titleLimitHit}
                autoFocus
              />
              <FieldDescription
                className={cn(
                  'text-right tabular-nums',
                  titleLimitHit && 'text-destructive',
                )}
                aria-live="polite"
              >
                {copy.charactersLeft.replace(
                  '{{count}}',
                  String(
                    CONTENT_LIMITS.DISCUSSION_TITLE_MAX - title.length,
                  ),
                )}
              </FieldDescription>
            </Field>

            <Field invalid={contentLimitHit}>
              <FieldLabel>{copy.detailsLabel}</FieldLabel>
              <CompactRichText
                value={content}
                onChange={setContent}
                onStatsChange={(stats) => {
                  setContentStats(stats);
                }}
                placeholder={copy.detailsPlaceholder}
                ariaLabel={copy.detailsLabel}
                minHeightClass="min-h-[260px]"
                toolbarVisibility="always"
                toolbarPreset="discussion"
                countsVisibility="none"
                imageUploadEndpoint="/api/uploads/discussions/sign"
                imageMode="attachments"
                imageMaxImages={MAX_DISCUSSION_IMAGES}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                maxCharacters={CONTENT_LIMITS.DISCUSSION_CONTENT_MAX}
                invalid={contentLimitHit}
                onLimitReached={contentLimitFeedback.trigger}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="discussion-context">{copy.contextLabel}</FieldLabel>
              <DiscussionContextMenu
                values={selectedContexts}
                options={contextTags}
                label={copy.contextLabel}
                placeholder={copy.contextPlaceholder}
                hint={copy.contextHint}
                limitMessage={copy.contextLimit}
                onChange={setSelectedContexts}
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border/60 bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span
              className={cn(
                'text-xs tabular-nums transition-colors duration-200',
                contentLimitHit
                  ? 'font-medium text-destructive'
                  : 'text-muted-foreground',
              )}
              aria-live="polite"
            >
              {contentStats.characters}/{CONTENT_LIMITS.DISCUSSION_CONTENT_MAX}
            </span>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {copy.cancel}
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? copy.creating : copy.create}
              </Button>
            </div>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
