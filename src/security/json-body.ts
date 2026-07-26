export const JSON_BODY_LIMITS = {
  SMALL: 32 * 1024,
  RICH_TEXT: 1024 * 1024,
} as const;

type JsonBodyResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      status: 400 | 413;
      error: 'Invalid JSON body' | 'Request body too large';
    };

export async function readJsonBody<T = unknown>(
  request: Request,
  maxBytes: number,
  options: { allowEmpty?: boolean } = {},
): Promise<JsonBodyResult<T>> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error('JSON body limit must be a positive safe integer.');
  }

  const contentLengthRaw = request.headers.get('content-length');
  if (contentLengthRaw !== null) {
    if (!/^\d+$/.test(contentLengthRaw)) {
      return { ok: false, status: 400, error: 'Invalid JSON body' };
    }
    const contentLength = Number(contentLengthRaw);
    if (!Number.isSafeInteger(contentLength)) {
      return { ok: false, status: 400, error: 'Invalid JSON body' };
    }
    if (contentLength > maxBytes) {
      return { ok: false, status: 413, error: 'Request body too large' };
    }
  }

  if (!request.body) {
    if (options.allowEmpty) {
      return { ok: true, value: {} as T };
    }
    return { ok: false, status: 400, error: 'Invalid JSON body' };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, error: 'Request body too large' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON body' };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    if (bytes.byteLength === 0 && options.allowEmpty) {
      return { ok: true, value: {} as T };
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON body' };
  }
}
