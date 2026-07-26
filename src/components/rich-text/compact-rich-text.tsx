'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import {
  AllSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import SubscriptExtension from '@tiptap/extension-subscript';
import SuperscriptExtension from '@tiptap/extension-superscript';
import ImageExtension from '@tiptap/extension-image';
import { Fragment, Slice, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { Button } from '@/components/ui/button';
import { cn } from '@/src/lib/utils';
import {
  fieldControlFrameStyles,
  fieldTextStyles,
} from '@/components/ui/control-styles';
import {
  PiTextB as Bold,
  PiTextItalic as Italic,
  PiTextUnderline as UnderlineIcon,
  PiTextSubscript as SubscriptIcon,
  PiTextSuperscript as SuperscriptIcon,
  PiCode as Code,
  PiEraser as Eraser,
  PiFunction as Sigma,
  PiImage as ImageIcon,
  PiCircleNotch as Spinner,
  PiListBullets as ListBullets,
  PiPlus as Plus,
  PiX as X,
} from 'react-icons/pi';
import { useI18n } from '@/src/i18n/i18n-provider';
import { toast } from 'sonner';
import { MAX_IMAGE_UPLOAD_BYTES } from '@/src/config/uploads';
import { useAnchoredOverlayStyle } from '@/src/lib/anchored-overlay';
import { MediaImage } from '@/src/components/ui/media-image';
import { truncateUtf16Safely } from '@/src/lib/text-limits';

const SCIENCE_SYMBOLS = [
  { value: '±', key: 'plusMinus' },
  { value: '×', key: 'multiplication' },
  { value: '÷', key: 'division' },
  { value: '≈', key: 'approximately' },
  { value: '≤', key: 'lessEqual' },
  { value: '≥', key: 'greaterEqual' },
  { value: '°', key: 'degrees' },
  { value: 'µ', key: 'micro' },
  { value: 'Ω', key: 'omega' },
  { value: 'Δ', key: 'delta' },
  { value: 'π', key: 'pi' },
  { value: '∞', key: 'infinity' },
  { value: '√', key: 'sqrt' },
  { value: '²', key: 'squared' },
  { value: '³', key: 'cubed' },
] as const;

const ExclusiveSubscript = SubscriptExtension.extend({
  excludes: 'superscript',
});

const ExclusiveSuperscript = SuperscriptExtension.extend({
  excludes: 'subscript',
});

const compactRichTextLimitKey = new PluginKey('compactRichTextLimit');

function getCompactRichTextDocumentText(doc: ProseMirrorNode) {
  return doc.textBetween(0, doc.content.size, '\n');
}

function insertPlainClipboardText(
  view: EditorView,
  text: string,
  moveSelectionToEnd: boolean,
) {
  const { doc, schema, storedMarks } = view.state;
  const transaction = view.state.tr;

  if (moveSelectionToEnd) {
    transaction.setSelection(TextSelection.atEnd(doc));
  }

  if (!text.includes('\n')) {
    transaction.insertText(text).scrollIntoView();
    view.dispatch(transaction);
    return;
  }

  const paragraph = schema.nodes.paragraph;
  if (!paragraph) {
    transaction.insertText(text).scrollIntoView();
    view.dispatch(transaction);
    return;
  }

  const marks = storedMarks ?? transaction.selection.$from.marks();
  const paragraphs = text.split('\n').map((line) =>
    paragraph.create(
      null,
      line ? schema.text(line, marks) : undefined,
    ),
  );
  transaction
    .replaceSelection(new Slice(Fragment.fromArray(paragraphs), 1, 1))
    .scrollIntoView();
  view.dispatch(transaction);
}

const CompactRichTextLimit = Extension.create<{
  limit: number;
  onLimitReached?: () => void;
}>({
  name: 'compactRichTextLimit',
  addOptions() {
    return {
      limit: Number.MAX_SAFE_INTEGER,
      onLimitReached: undefined,
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: compactRichTextLimitKey,
        filterTransaction: (transaction, state) => {
          if (!transaction.docChanged) return true;

          const currentLength = getCompactRichTextDocumentText(state.doc).length;
          const nextLength = getCompactRichTextDocumentText(transaction.doc).length;

          if (
            nextLength <= this.options.limit ||
            nextLength < currentLength
          ) {
            return true;
          }

          this.options.onLimitReached?.();
          return false;
        },
      }),
    ];
  },
});

export type CompactRichTextStats = { words: number; characters: number };
export type CompactRichTextImage = { src: string; alt: string };

function extractAndStripImgTags(html: string): { html: string; images: CompactRichTextImage[] } {
  const input = String(html ?? '');
  const images: CompactRichTextImage[] = [];
  const stripped = input.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const altMatch = tag.match(/\salt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const src = (srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? '').trim();
    if (!src) return '';
    const altRaw = (altMatch?.[1] ?? altMatch?.[2] ?? altMatch?.[3] ?? '').trim();
    images.push({ src, alt: altRaw });
    return '';
  });

  return { html: stripped, images };
}

interface CompactRichTextProps {
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  ariaLabel: string;
  minHeightClass?: string;
  toolbarVisibility?: 'always' | 'focus' | 'none';
  toolbarPreset?: 'full' | 'discussion';
  countsVisibility?: 'always' | 'focus' | 'none';
  onStatsChange?: (stats: CompactRichTextStats) => void;
  disabled?: boolean;
  imageUploadEndpoint?: string;
  imageMode?: 'inline' | 'attachments';
  imageMaxBytes?: number;
  imageMaxImages?: number;
  attachments?: CompactRichTextImage[];
  onAttachmentsChange?: (images: CompactRichTextImage[]) => void;
  maxCharacters?: number;
  invalid?: boolean;
  onLimitReached?: () => void;
  rootClassName?: string;
  frameClassName?: string;
  maxHeightClass?: string;
}

export function CompactRichText({
  value,
  onChange,
  placeholder,
  ariaLabel,
  minHeightClass = 'min-h-[96px]',
  toolbarVisibility = 'always',
  toolbarPreset = 'full',
  countsVisibility = 'focus',
  onStatsChange,
  disabled = false,
  imageUploadEndpoint,
  imageMode = 'inline',
  imageMaxBytes = MAX_IMAGE_UPLOAD_BYTES,
  imageMaxImages = 4,
  attachments,
  onAttachmentsChange,
  maxCharacters,
  invalid = false,
  onLimitReached,
  rootClassName,
  frameClassName,
  maxHeightClass = 'max-h-[420px]',
}: CompactRichTextProps) {
  const onStatsChangeRef = useRef(onStatsChange);
  onStatsChangeRef.current = onStatsChange;
  const { messages } = useI18n();
  const { toolbar, status: statusCopy, toast: toastCopy, symbols: symbolsCopy } =
    messages.discussions.composer;

  const [showSymbols, setShowSymbols] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [, setToolbarTick] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const symbolsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const symbolsMenuRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  const onLimitReachedRef = useRef(onLimitReached);
  const [localAttachments, setLocalAttachments] = useState<CompactRichTextImage[]>([]);
  const symbolsMenuStyle = useAnchoredOverlayStyle({
    open: showSymbols,
    triggerRef: symbolsTriggerRef,
    overlayRef: symbolsMenuRef,
    align: 'start',
    sideOffset: 6,
    collisionPadding: 8,
    zIndex: 1000,
  });

  const imagesEnabled = Boolean(imageUploadEndpoint) && !disabled;
  const showAttachmentTray = Boolean(imageUploadEndpoint) && imageMode === 'attachments';
  const effectiveAttachments = attachments ?? localAttachments;
  const showAttachmentTrayUi = showAttachmentTray && (effectiveAttachments.length > 0 || uploadingImages);
  const isDiscussionToolbar = toolbarPreset === 'discussion';

  useEffect(() => {
    onLimitReachedRef.current = onLimitReached;
  }, [onLimitReached]);

  const compressImageForUpload = useCallback(async (file: File): Promise<File> => {
    if (typeof window === 'undefined') return file;
    if (!('createImageBitmap' in window)) return file;
    if (!file.type || !/^image\/(png|jpeg|webp)$/i.test(file.type)) return file;

    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      // Avoid re-encoding tiny images.
      if (scale === 1 && file.type === 'image/webp' && file.size < 500_000) {
        return file;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.85),
      );
      if (!blob) return file;

      // Keep original if conversion isn't beneficial.
      if (blob.size >= file.size) return file;

      const base = file.name.replace(/\.[a-z0-9]+$/i, '') || 'image';
      return new File([blob], `${base}.webp`, { type: 'image/webp' });
    } catch {
      return file;
    }
  }, []);

  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      if (!imageUploadEndpoint) {
        throw new Error('Image uploads are not configured');
      }

      const isSignedEndpoint = imageUploadEndpoint.endsWith('/sign');

      // Signed direct upload (R2).
      if (isSignedEndpoint) {
        const signRes = await fetch(imageUploadEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ size: file.size, type: file.type }),
        });
        const signData = await signRes.json().catch(() => ({}));

        if (
          signRes.ok &&
          signData?.provider === 'r2' &&
          String(signData?.method ?? '').toUpperCase() === 'PUT' &&
          typeof signData?.uploadUrl === 'string' &&
          (typeof signData?.publicUrl === 'string' || typeof signData?.proxyUrl === 'string')
        ) {
          const signedHeaders: Record<string, string> = {};
          if (signData?.headers && typeof signData.headers === 'object') {
            for (const [k, v] of Object.entries(signData.headers as Record<string, unknown>)) {
              if (typeof v === 'string' && v) signedHeaders[k] = v;
            }
          }
          const uploadRes = await fetch(signData.uploadUrl as string, {
            method: 'PUT',
            headers: {
              ...signedHeaders,
              'Content-Type': String(signedHeaders['Content-Type'] ?? file.type),
            },
            body: file,
          });
          if (!uploadRes.ok) {
            throw new Error('Upload failed');
          }
          // Prefer proxyUrl (same-origin, works in localhost and when buckets are private),
          // but fall back to publicUrl (custom CDN) when proxyUrl isn't provided.
          if (typeof signData?.proxyUrl === 'string' && signData.proxyUrl) return signData.proxyUrl as string;
          return signData.publicUrl as string;
        }
        const message = typeof signData?.error === 'string' ? signData.error : null;
        throw new Error(message || 'Upload failed');
      }

      throw new Error('Image uploads are not configured');
    },
    [imageUploadEndpoint],
  );

  const setNextAttachments = useCallback(
    (next: CompactRichTextImage[]) => {
      onAttachmentsChange?.(next);
      if (!onAttachmentsChange) setLocalAttachments(next);
    },
    [onAttachmentsChange],
  );

  const insertUploadedImages = useCallback(
    async (files: File[]) => {
      const editor = editorRef.current;
      if (!imageUploadEndpoint) return;

      const currentImages =
        imageMode === 'attachments'
          ? effectiveAttachments.length
          : editor
            ? (editor.getHTML().match(/<img\b/gi) ?? []).length
            : 0;
      const remaining = Math.max(0, imageMaxImages - currentImages);
      const toUpload = files.slice(0, remaining);

      if (toUpload.length === 0) {
        toast.error(
          toastCopy?.tooManyImages?.replace('{{count}}', String(imageMaxImages)) ??
            `You can add up to ${imageMaxImages} images.`,
        );
        return;
      }

      setUploadingImages(true);
      try {
        let nextAttachments = imageMode === 'attachments' ? [...effectiveAttachments] : null;

        for (const raw of toUpload) {
          if (!/^image\/(png|jpeg|webp)$/i.test(raw.type)) {
            toast.error(toastCopy?.imageUploadFailed ?? 'Image upload failed');
            continue;
          }
          if (raw.size > imageMaxBytes) {
            toast.error(
              toastCopy?.imageTooLarge?.replace('{{count}}', String(Math.floor(imageMaxBytes / 1024 / 1024))) ??
                'Image is too large.',
            );
            continue;
          }

          const file = await compressImageForUpload(raw);
          if (file.size > imageMaxBytes) {
            toast.error(
              toastCopy?.imageTooLarge?.replace('{{count}}', String(Math.floor(imageMaxBytes / 1024 / 1024))) ??
                'Image is too large.',
            );
            continue;
          }

          const url = await uploadImage(file);
          const alt = (raw.name || 'image').replace(/\.[a-z0-9]+$/i, '');
          if (imageMode === 'attachments') {
            nextAttachments = nextAttachments ?? [];
            nextAttachments.push({ src: url, alt });
            setNextAttachments(nextAttachments);
          } else if (editor) {
            editor.chain().focus().setImage({ src: url, alt }).run();
          }
        }
      } catch (error) {
        toast.error(
          toastCopy?.imageUploadFailed ?? (error instanceof Error ? error.message : 'Image upload failed'),
        );
      } finally {
        setUploadingImages(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [
      compressImageForUpload,
      effectiveAttachments,
      imageMaxBytes,
      imageMaxImages,
      imageMode,
      imageUploadEndpoint,
      setNextAttachments,
      toastCopy,
      uploadImage,
    ],
  );

  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  }, []);
  const modifierKey = isMac ? 'Cmd' : 'Ctrl';
  const withShortcut = useCallback(
    (label: string, shortcut: string) => `${label} (${shortcut})`,
    []
  );

  useEffect(() => {
    if (!showSymbols) return;
    const close = () => setShowSymbols(false);
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', close);
    };
  }, [showSymbols]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        bulletList: isDiscussionToolbar ? {} : false,
        orderedList: false,
        listItem: isDiscussionToolbar ? {} : false,
        horizontalRule: false,
        underline: false,
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      ExclusiveSubscript,
      ExclusiveSuperscript,
      CompactRichTextLimit.configure({
        limit: maxCharacters ?? Number.MAX_SAFE_INTEGER,
        onLimitReached: () => onLimitReachedRef.current?.(),
      }),
      ...(imageUploadEndpoint && imageMode === 'inline'
        ? [
          ImageExtension.configure({
            inline: false,
            allowBase64: false,
          }),
        ]
        : []),
    ],
    content: value || '<p></p>',
    editorProps: {
      handlePaste: (view, event) => {
        if (disabled) return false;
        const dt = (event as ClipboardEvent)?.clipboardData;
        const files = Array.from(dt?.files ?? []).filter((f) => /^image\//i.test(f.type));
        if (files.length > 0 && imageUploadEndpoint) {
          void insertUploadedImages(files);
          return true;
        }

        const clipboardText = dt?.getData('text/plain') ?? '';
        if (!clipboardText) return false;

        const { doc, selection } = view.state;
        const normalizedClipboardText = clipboardText.replace(/\r\n?/g, '\n');
        const documentText = getCompactRichTextDocumentText(doc);
        const documentStart = TextSelection.atStart(doc).from;
        const documentEnd = TextSelection.atEnd(doc).to;
        const selectsEntireDocument =
          selection instanceof AllSelection ||
          (selection.from <= documentStart && selection.to >= documentEnd);
        const isSingleLinePaste = !normalizedClipboardText.includes('\n');
        const isCaretAtDocumentEnd =
          selection.empty && selection.to === documentEnd;
        const appendAtDocumentEnd =
          (selectsEntireDocument &&
            normalizedClipboardText === documentText &&
            isSingleLinePaste) ||
          isCaretAtDocumentEnd;
        const selectedTextLength = selection.empty
          ? 0
          : doc.textBetween(selection.from, selection.to, '\n').length;
        const retainedLength =
          documentText.length -
          (appendAtDocumentEnd ? 0 : selectedTextLength);
        const characterLimit =
          maxCharacters ?? Number.MAX_SAFE_INTEGER;
        const availableCharacters = Math.max(
          0,
          characterLimit - retainedLength,
        );

        if (normalizedClipboardText.length > availableCharacters) {
          event.preventDefault();
          const acceptedText = truncateUtf16Safely(
            normalizedClipboardText,
            availableCharacters,
          );
          if (acceptedText) {
            insertPlainClipboardText(
              view,
              acceptedText,
              appendAtDocumentEnd && selectsEntireDocument,
            );
          }
          onLimitReachedRef.current?.();
          return true;
        }

        // Copying the complete compact input and pasting it immediately should
        // duplicate the text inline at the end. Keep subsequent single-line
        // pastes inline too once the caret is at that end position.
        if (
          isSingleLinePaste &&
          ((selectsEntireDocument &&
            normalizedClipboardText === documentText) ||
            isCaretAtDocumentEnd)
        ) {
          event.preventDefault();
          insertPlainClipboardText(
            view,
            normalizedClipboardText,
            selectsEntireDocument,
          );
          return true;
        }

        return false;
      },
      handleDrop: (_view, event) => {
        if (!imageUploadEndpoint || disabled) return false;
        const dt = (event as DragEvent)?.dataTransfer;
        const files = Array.from(dt?.files ?? []).filter((f) => /^image\//i.test(f.type));
        if (!files.length) return false;
        void insertUploadedImages(files);
        return true;
      },
      clipboardTextSerializer: (slice) => {
        const text = slice.content.textBetween(0, slice.content.size, '\n');
        return text.replace(/\n+$/g, '');
      },
      attributes: {
        class: cn(
          'document-editor-content focus:outline-none',
          fieldTextStyles,
          minHeightClass
        ),
        'aria-label': ariaLabel,
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
    if (disabled) setShowSymbols(false);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    if (!showAttachmentTray) return;

    const extracted: CompactRichTextImage[] = [];
    const positions: Array<{ from: number; to: number }> = [];

    editor.state.doc.descendants((node, pos) => {
      if (node.type?.name !== 'image') return;
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src.trim() : '';
      if (!src) return;
      const alt = typeof node.attrs?.alt === 'string' ? String(node.attrs.alt) : '';
      extracted.push({ src, alt });
      positions.push({ from: pos, to: pos + node.nodeSize });
    });

    if (!extracted.length) return;

    const next = [...effectiveAttachments];
    const seen = new Set(next.map((img) => img.src));
    for (const img of extracted) {
      if (seen.has(img.src)) continue;
      seen.add(img.src);
      next.push(img);
    }
    setNextAttachments(next);

    const ordered = positions.sort((a, b) => b.from - a.from);
    editor.commands.command(({ tr }) => {
      for (const { from, to } of ordered) tr.delete(from, to);
      return true;
    });
  }, [editor, effectiveAttachments, setNextAttachments, showAttachmentTray]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      if (imageMode === 'attachments') {
        const extracted = extractAndStripImgTags(value);
        if (extracted.images.length) {
          const next = [...effectiveAttachments];
          const seen = new Set(next.map((img) => img.src));
          for (const img of extracted.images) {
            if (seen.has(img.src)) continue;
            seen.add(img.src);
            next.push(img);
          }
          setNextAttachments(next);
        }
        editor.commands.setContent(extracted.html || '<p></p>');
        return;
      }

      editor.commands.setContent(value || '<p></p>');
    }
  }, [value, editor, effectiveAttachments, imageMode, setNextAttachments]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const raw = editor.getHTML();
      if (imageMode === 'attachments') {
        onChange(extractAndStripImgTags(raw).html);
        return;
      }
      onChange(raw);
    };
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
    };
  }, [editor, imageMode, onChange]);

  const updateCounts = useCallback(() => {
    const text = editor
      ? getCompactRichTextDocumentText(editor.state.doc)
      : '';
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    setWordCount(words);
    setCharCount(chars);
    onStatsChangeRef.current?.({ words, characters: chars });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    updateCounts();
    editor.on('update', updateCounts);
    return () => {
      editor.off('update', updateCounts);
    };
  }, [editor, updateCounts]);

  useEffect(() => {
    if (!editor) return;
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    editor.on('focus', onFocus);
    editor.on('blur', onBlur);
    return () => {
      editor.off('focus', onFocus);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setToolbarTick((x) => x + 1);
    editor.on('selectionUpdate', bump);
    editor.on('transaction', bump);
    return () => {
      editor.off('selectionUpdate', bump);
      editor.off('transaction', bump);
    };
  }, [editor]);

  const showToolbar =
    toolbarVisibility === 'always' || (toolbarVisibility === 'focus' && isFocused);

  const clearFormatting = useCallback(() => {
    editor?.chain().focus().clearNodes().unsetAllMarks().run();
  }, [editor]);

  const toggleSubscript = useCallback(() => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (editor.isActive('superscript')) chain.unsetSuperscript();
    chain.toggleSubscript().run();
  }, [editor]);

  const toggleSuperscript = useCallback(() => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (editor.isActive('subscript')) chain.unsetSubscript();
    chain.toggleSuperscript().run();
  }, [editor]);

  const insertSymbol = useCallback(
    (symbol: string) => {
      editor?.chain().focus().insertContent(symbol).run();
      setShowSymbols(false);
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div
      className={cn(
        'space-y-1.5',
        showAttachmentTray && 'compact-rich-text-attachments',
        rootClassName,
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (!files.length) return;
          void insertUploadedImages(files);
        }}
      />
      {toolbarVisibility !== 'none' && showToolbar ? (
        <div
          className="flex flex-wrap items-center gap-1 rounded-md bg-muted/30 px-2 py-1"
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse') e.preventDefault();
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled}
            data-active={editor.isActive('bold')}
            aria-label={toolbar.bold}
            aria-pressed={editor.isActive('bold')}
            title={withShortcut(toolbar.bold, `${modifierKey}B`)}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled}
            data-active={editor.isActive('italic')}
            aria-label={toolbar.italic}
            aria-pressed={editor.isActive('italic')}
            title={withShortcut(toolbar.italic, `${modifierKey}I`)}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          {isDiscussionToolbar ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                disabled={disabled}
                data-active={editor.isActive('underline')}
                aria-label={toolbar.underline}
                aria-pressed={editor.isActive('underline')}
                title={withShortcut(toolbar.underline, `${modifierKey}U`)}
              >
                <UnderlineIcon className="h-3.5 w-3.5" />
              </Button>
              <span className="mx-1 h-4 w-px bg-border" />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                disabled={disabled}
                data-active={editor.isActive('bulletList')}
                aria-label={toolbar.bulletList}
                aria-pressed={editor.isActive('bulletList')}
                title={toolbar.bulletList}
              >
                <ListBullets className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => editor.chain().focus().toggleCode().run()}
                disabled={disabled}
                data-active={editor.isActive('code')}
                aria-label={toolbar.inlineCode}
                aria-pressed={editor.isActive('code')}
                title={withShortcut(toolbar.inlineCode, `${modifierKey}E`)}
              >
                <Code className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={toggleSubscript}
                disabled={disabled}
                data-active={editor.isActive('subscript')}
                aria-label={toolbar.subscript}
                aria-pressed={editor.isActive('subscript')}
                title={withShortcut(toolbar.subscript, `${modifierKey},`)}
              >
                <SubscriptIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={toggleSuperscript}
                disabled={disabled}
                data-active={editor.isActive('superscript')}
                aria-label={toolbar.superscript}
                aria-pressed={editor.isActive('superscript')}
                title={withShortcut(toolbar.superscript, `${modifierKey}.`)}
              >
                <SuperscriptIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={clearFormatting}
                disabled={disabled}
                aria-label={toolbar.clearFormatting}
                title={toolbar.clearFormatting}
              >
                <Eraser className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                disabled={disabled}
                data-active={editor.isActive('underline')}
                aria-label={toolbar.underline}
                aria-pressed={editor.isActive('underline')}
                title={withShortcut(toolbar.underline, `${modifierKey}U`)}
              >
                <UnderlineIcon className="h-3.5 w-3.5" />
              </Button>
              <span className="mx-1 h-4 w-px bg-border" />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={toggleSubscript}
                disabled={disabled}
                data-active={editor.isActive('subscript')}
                aria-label={toolbar.subscript}
                aria-pressed={editor.isActive('subscript')}
                title={toolbar.subscript}
              >
                <SubscriptIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={toggleSuperscript}
                disabled={disabled}
                data-active={editor.isActive('superscript')}
                aria-label={toolbar.superscript}
                aria-pressed={editor.isActive('superscript')}
                title={toolbar.superscript}
              >
                <SuperscriptIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => editor.chain().focus().toggleCode().run()}
                disabled={disabled}
                data-active={editor.isActive('code')}
                aria-label={toolbar.inlineCode}
                aria-pressed={editor.isActive('code')}
                title={toolbar.inlineCode}
              >
                <Code className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={clearFormatting}
                disabled={disabled}
                aria-label={toolbar.clearFormatting}
                title={toolbar.clearFormatting}
              >
                <Eraser className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {imagesEnabled ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploadingImages}
              aria-label={toolbar.insertImage}
              title={toolbar.insertImage}
            >
              {uploadingImages ? (
                <Spinner className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : null}
          {!isDiscussionToolbar ? (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Button
                ref={symbolsTriggerRef}
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSymbols((s) => !s);
                }}
                disabled={disabled}
                aria-label={toolbar.insertSymbol}
                aria-haspopup="menu"
                aria-expanded={showSymbols}
                title={toolbar.insertSymbol}
              >
                <Sigma className="h-3.5 w-3.5" />
              </Button>
              {showSymbols ? (
                <div
                  ref={symbolsMenuRef}
                  style={symbolsMenuStyle}
                  className="grid min-w-[220px] grid-cols-5 gap-2 overflow-auto rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-float"
                >
                  {SCIENCE_SYMBOLS.map((symbol) => (
                    <button
                      key={symbol.value}
                      type="button"
                      className="flex h-8 w-8 touch-manipulation items-center justify-center rounded-sm border border-border text-base leading-none transition-colors hover:bg-muted"
                      onClick={() => insertSymbol(symbol.value)}
                      aria-label={symbolsCopy[symbol.key]}
                      title={symbolsCopy[symbol.key]}
                      disabled={disabled}
                    >
                      {symbol.value}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showAttachmentTrayUi ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {imagesEnabled ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploadingImages}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/30 disabled:opacity-60"
              aria-label={toolbar.insertImage}
              title={toolbar.insertImage}
            >
              <Plus className="h-5 w-5" />
            </button>
          ) : null}
          {effectiveAttachments.map((img) => (
            <div
              key={img.src}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted/30"
            >
              <MediaImage
                src={img.src}
                alt={img.alt || 'image'}
                width={64}
                height={64}
                sizes="64px"
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => setNextAttachments(effectiveAttachments.filter((item) => item.src !== img.src))}
                className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 focus:outline-none focus:ring-1 focus:ring-destructive/50 focus:ring-offset-0"
                aria-label="Remove image"
                disabled={disabled || uploadingImages}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {uploadingImages ? (
            <div className="flex h-16 shrink-0 items-center gap-2 rounded-md border border-border bg-muted/30 px-3 text-xs text-muted-foreground">
              <Spinner className="h-4 w-4 animate-spin" />
              Uploading...
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        data-ui-control="rich-text"
        data-disabled={disabled || undefined}
        data-invalid={invalid || undefined}
        className={cn(
          fieldControlFrameStyles,
          maxHeightClass,
          'min-w-0 max-w-full overflow-x-hidden overflow-y-auto',
          frameClassName,
        )}
      >
        <EditorContent editor={editor} />
      </div>

      {countsVisibility === 'none' ? null : countsVisibility === 'always' || isFocused ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 px-1 text-[11px] text-muted-foreground">
          <span>
            {statusCopy.words}: {wordCount}
          </span>
          <span>
            {statusCopy.characters}: {charCount}
          </span>
        </div>
      ) : null}
    </div>
  );
}
