/**
 * Rich text helpers that work in both server and client environments.
 */

import { decodeHTML } from 'entities';

const RICH_TEXT_BLOCK_END =
  /<\/(?:p|div|li|h1|h2|h3|h4|h5|h6|blockquote|pre|ul|ol)>/gi;

export function richTextHtmlToPlainText(html: string): string {
  const input = String(html ?? '');
  const text = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(RICH_TEXT_BLOCK_END, '\n')
    // Formatting tags are not visible characters and must never add spaces.
    .replace(/<\/?[a-z][^>]*>/gi, '');

  return decodeHTML(text)
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}
