/**
 * Input Validation Utilities
 *
 * Provides validation helpers using Zod for type-safe input validation.
 * All user inputs should be validated before processing.
 *
 * Security Best Practices:
 * - Validate all inputs server-side
 * - Sanitize inputs to prevent XSS
 * - Use strict schemas for all user data
 * - Never trust client-side validation alone
 */

import { z } from 'zod';
import {
  htmlToPlainTextWithNewlines,
  maybeDecodeEscapedHtml,
  stripHtmlTags,
} from '@/src/lib/html';
import { getR2ObjectPrefix } from '@/src/security/object-key';
import { sanitizeRichHtmlOnServer } from '@/src/security/server-rich-html-sanitizer';

/**
 * Validates email format
 */
export const emailSchema = z.string().email('Invalid email format');

/**
 * Validates password strength
 * Requirements: minimum 8 characters, at least one uppercase, one lowercase, one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Validates UUID format
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Validates date of birth (ensures user is a minor if needed)
 */
export const dateOfBirthSchema = z.date().refine(
  (date) => {
    const age = new Date().getFullYear() - date.getFullYear();
    return age >= 0 && age <= 18; // Adjust based on requirements
  },
  { message: 'Invalid date of birth' }
);

/**
 * Sanitizes plain text input to prevent XSS.
 * Strips all HTML tags. Use for titles, names, and other plain-text fields.
 *
 * @param input Raw string input
 * @returns Sanitized string (trimmed, no HTML)
 */
export function sanitizeInput(input: string): string {
  return stripHtmlTags(input.trim()).trim();
}

function escapeHtml(raw: string) {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeToPlainHtmlWithBreaks(input: string) {
  const dirty = maybeDecodeEscapedHtml(String(input ?? '').trim());
  if (!dirty) return '';

  return escapeHtml(htmlToPlainTextWithNewlines(dirty)).replace(/\n/g, '<br>');
}

function filterInlineStyle(style: string) {
  const kept: string[] = [];
  for (const part of style.split(';')) {
    const [propRaw, valueRaw] = part.split(':');
    if (!propRaw || !valueRaw) continue;
    const prop = propRaw.trim().toLowerCase();
    const value = valueRaw.trim();

    const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
    const isRgb =
      /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(
        value,
      );
    const isHsl =
      /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(
        value,
      );
    if (!isHex && !isRgb && !isHsl) continue;

    if (prop === 'color' || prop === 'background-color') {
      kept.push(`${prop}: ${value}`);
    }
  }
  return kept.join('; ');
}

function sanitizeWithDomParser(options: {
  input: string;
  allowedTags: string[];
  allowedAttrs: string[];
  allowImgSrc?: (src: string) => boolean;
  preserveFormattingOnServer?: boolean;
}) {
  const {
    input,
    allowedTags,
    allowedAttrs,
    allowImgSrc,
    preserveFormattingOnServer = false,
  } = options;
  const dirty = maybeDecodeEscapedHtml(String(input ?? '').trim());
  if (!dirty) return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    if (preserveFormattingOnServer) {
      return sanitizeRichHtmlOnServer({
        input: dirty,
        allowedTags,
        allowedAttrs,
        allowImgSrc,
        filterInlineStyle,
      });
    }

    return sanitizeToPlainHtmlWithBreaks(dirty);
  }

  const doc = new DOMParser().parseFromString(`<div>${dirty}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  const allowedTagSet = new Set(allowedTags.map((t) => t.toUpperCase()));
  const allowedAttrSet = new Set(allowedAttrs.map((a) => a.toLowerCase()));
  const dropContentTags = new Set(['SCRIPT', 'STYLE']);

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (!allowedTagSet.has(tag)) {
        if (dropContentTags.has(tag)) {
          el.remove();
          return;
        }
        // Unwrap: keep children, drop the tag itself.
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        return;
      }

      // Strip attributes aggressively.
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (!allowedAttrSet.has(name)) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (name === 'style') {
          const filtered = filterInlineStyle(attr.value);
          if (filtered) el.setAttribute('style', filtered);
          else el.removeAttribute('style');
          continue;
        }
        if (tag === 'IMG' && name === 'src' && typeof allowImgSrc === 'function') {
          const src = attr.value.trim();
          if (!allowImgSrc(src)) {
            el.remove();
            return;
          }
        }
      }
    }

    for (const child of Array.from(node.childNodes)) {
      walk(child);
    }
  };

  walk(root);
  return root.innerHTML;
}

/**
 * Sanitizes discussion rich HTML content while allowing uploaded images.
 */
export function sanitizeDiscussionRichTextHtml(input: string): string {
  const discussionsPrefixBase = getR2ObjectPrefix(
    process.env.R2_DISCUSSIONS_PREFIX,
    'discussions',
  );

  const isAllowedDiscussionImageSrc = (src: string) => {
    if (!src || src.includes('..')) return false;

    if (src.startsWith('/api/uploads/discussions/file?key=')) {
      try {
        const parsed = new URL(src, 'http://local.test');
        if (parsed.origin !== 'http://local.test' || parsed.pathname !== '/api/uploads/discussions/file') {
          return false;
        }
        const key = parsed.searchParams.get('key') ?? '';
        const relativeKey = key.startsWith(`${discussionsPrefixBase}/`)
          ? key.slice(discussionsPrefixBase.length + 1)
          : '';
        return (
          !key.includes('..') &&
          /^20\d{2}\/(?:0[1-9]|1[0-2])\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(relativeKey)
        );
      } catch {
        return false;
      }
    }

    return false;
  };

  return sanitizeWithDomParser({
    input,
    allowedTags: [
      'p',
      'br',
      'div',
      'span',
      'strong',
      'em',
      'u',
      's',
      'code',
      'pre',
      'blockquote',
      'hr',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'sup',
      'sub',
      'mark',
      'img',
    ],
    allowedAttrs: [
      'style',
      'start',
      'src',
      'alt',
      'title',
      'width',
      'height',
      'loading',
      'decoding',
    ],
    allowImgSrc: isAllowedDiscussionImageSrc,
    preserveFormattingOnServer: true,
  });
}
