const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
};

export function inferContentTypeFromKey(key: string): string | null {
  const clean = key.split('?')[0]?.split('#')[0] ?? '';
  const last = clean.split('/').filter(Boolean).pop() ?? '';
  const dot = last.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = last.slice(dot + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? null;
}

export function inferFilenameFromKey(key: string): string | null {
  const clean = key.split('?')[0]?.split('#')[0] ?? '';
  const last = clean.split('/').filter(Boolean).pop() ?? '';
  return last ? last : null;
}

export function sanitizeContentDispositionFilename(name: string): string {
  // Keep it simple: avoid path separators, quotes, and control chars.
  return name.replace(/[\r\n]/g, '').replace(/[\\/"]/g, '_');
}

export function detectImageMimeFromMagicBytes(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    bytes.length >= pngSignature.length &&
    pngSignature.every((value, index) => bytes[index] === value)
  ) {
    return 'image/png';
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}
