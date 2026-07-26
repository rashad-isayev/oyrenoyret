/**
 * Small HTML helpers that work in both server and client environments.
 */

const namedEntities: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntity(entity: string): string {
  const named = namedEntities[entity];
  if (named !== undefined) return named;

  if (entity.startsWith('#x') || entity.startsWith('#X')) {
    const code = Number.parseInt(entity.slice(2), 16);
    if (Number.isFinite(code)) return String.fromCodePoint(code);
    return `&${entity};`;
  }

  if (entity.startsWith('#')) {
    const code = Number.parseInt(entity.slice(1), 10);
    if (Number.isFinite(code)) return String.fromCodePoint(code);
    return `&${entity};`;
  }

  return `&${entity};`;
}

function isAsciiLetter(value: string | undefined): boolean {
  if (!value) return false;
  const code = value.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function tagStartLength(input: string, offset: number): number {
  if (input[offset] !== '<') return 0;
  let cursor = offset + 1;
  if (input[cursor] === '/') cursor += 1;
  return isAsciiLetter(input[cursor]) ? cursor - offset + 1 : 0;
}

function containsHtmlTag(input: string): boolean {
  let candidateStart = -1;
  for (let index = 0; index < input.length; index += 1) {
    if (candidateStart === -1) {
      if (tagStartLength(input, index) > 0) candidateStart = index;
      continue;
    }
    if (input[index] === '>') return true;
  }
  return false;
}

function plainTextFromHtml(input: string, preserveBlockBreaks: boolean): string {
  let output = '';
  let tagStart = -1;

  for (let index = 0; index < input.length; index += 1) {
    if (tagStart === -1) {
      if (tagStartLength(input, index) > 0) {
        tagStart = index;
      } else {
        output += input[index];
      }
      continue;
    }

    if (input[index] !== '>') continue;

    if (preserveBlockBreaks) {
      const tag = input.slice(tagStart + 1, index).trim().toLowerCase();
      const tagName = tag.replace(/^\/\s*/, '').split(/[\s/]/, 1)[0];
      const isClosing = tag.startsWith('/');
      if (
        tagName === 'br' ||
        (isClosing &&
          ['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre'].includes(
            tagName,
          ))
      ) {
        output += '\n';
      }
    }

    tagStart = -1;
  }

  if (tagStart !== -1) output += input.slice(tagStart);
  return output;
}

export function decodeHtmlEntitiesOnce(input: string): string {
  return String(input ?? '').replace(/&([a-zA-Z]+|#x[0-9a-fA-F]+|#[0-9]+);/g, (_m, entity) =>
    decodeEntity(String(entity)),
  );
}

/**
 * Decodes HTML entities only when the input looks like HTML that was escaped
 * (e.g. `&lt;p&gt;Hello&lt;/p&gt;`). Avoids altering normal rich text that already
 * contains real tags, or plain text that happens to include `&amp;` etc.
 */
export function maybeDecodeEscapedHtml(input: string): string {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return '';

  // Already has real tags → keep as-is.
  if (containsHtmlTag(trimmed)) return trimmed;

  // Decode only when one or two entity-decoding passes reveal a real tag.
  // This preserves ordinary plain text containing entities such as "&amp;".
  let candidate = trimmed;
  for (let i = 0; i < 2; i += 1) {
    const next = decodeHtmlEntitiesOnce(candidate);
    if (next === candidate) break;
    candidate = next;
    if (containsHtmlTag(candidate)) return candidate;
  }
  return trimmed;
}

export function stripHtmlTags(input: string): string {
  return plainTextFromHtml(String(input ?? ''), false);
}

export function htmlToPlainTextWithNewlines(input: string): string {
  const html = maybeDecodeEscapedHtml(input);
  if (!html) return '';

  return plainTextFromHtml(html, true)
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
