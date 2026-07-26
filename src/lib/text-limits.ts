/**
 * Truncates by JavaScript's UTF-16 length contract without leaving a broken
 * surrogate pair at the boundary.
 */
export function truncateUtf16Safely(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  let truncated = text.slice(0, Math.max(0, maxLength));
  const lastCodeUnit = truncated.charCodeAt(truncated.length - 1);
  if (lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff) {
    truncated = truncated.slice(0, -1);
  }
  return truncated;
}
