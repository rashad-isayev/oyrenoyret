import DOMPurify from 'isomorphic-dompurify';

export function sanitizeRichHtmlOnServer(options: {
  input: string;
  allowedTags: string[];
  allowedAttrs: string[];
  allowImgSrc?: (src: string) => boolean;
  filterInlineStyle?: (style: string) => string;
}) {
  const {
    input,
    allowedTags,
    allowedAttrs,
    allowImgSrc,
    filterInlineStyle,
  } = options;

  let sanitized = String(
    DOMPurify.sanitize(input, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttrs,
      ALLOW_ARIA_ATTR: false,
      ALLOW_DATA_ATTR: false,
    }),
  );

  sanitized = sanitized.replace(
    /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
    (_match, doubleQuoted: string | undefined, singleQuoted: string | undefined) => {
      const filtered = filterInlineStyle?.(
        doubleQuoted ?? singleQuoted ?? '',
      );
      return filtered ? ` style="${filtered}"` : '';
    },
  );

  if (typeof allowImgSrc === 'function') {
    sanitized = sanitized.replace(/<img\b[^>]*>/gi, (tag) => {
      const srcMatch = tag.match(
        /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
      );
      const src = (
        srcMatch?.[1] ??
        srcMatch?.[2] ??
        srcMatch?.[3] ??
        ''
      ).trim();
      return src && allowImgSrc(src) ? tag : '';
    });
  }

  return sanitized;
}
