'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  AUTHENTICATED_MEDIA_RETRY_DELAYS_MS,
  getAuthenticatedMediaRetrySrc,
  isAuthenticatedMediaSrc,
} from '@/src/lib/media';

/**
 * Uses Next's optimizer for public/static images and automatically bypasses it
 * for protected same-origin uploads, which need the browser's session cookie.
 */
function RetryingMediaImage({
  src,
  alt,
  unoptimized,
  onError,
  ...props
}: ImageProps) {
  const protectedUpload = typeof src === 'string' && isAuthenticatedMediaSrc(src);
  const [attempt, setAttempt] = useState(0);
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  const resolvedSrc =
    protectedUpload && typeof src === 'string'
      ? getAuthenticatedMediaRetrySrc(src, attempt)
      : src;

  return (
    <Image
      {...props}
      key={protectedUpload ? `${String(src)}:${attempt}` : undefined}
      src={resolvedSrc}
      alt={alt}
      unoptimized={protectedUpload || unoptimized}
      onError={(event) => {
        if (
          protectedUpload &&
          attempt < AUTHENTICATED_MEDIA_RETRY_DELAYS_MS.length
        ) {
          const delay = AUTHENTICATED_MEDIA_RETRY_DELAYS_MS[attempt];
          retryTimerRef.current = window.setTimeout(() => {
            setAttempt((current) => current + 1);
            retryTimerRef.current = null;
          }, delay);
          return;
        }
        onError?.(event);
      }}
    />
  );
}

export function MediaImage(props: ImageProps) {
  const sourceKey =
    typeof props.src === 'string' ? props.src : JSON.stringify(props.src);
  return <RetryingMediaImage key={sourceKey} {...props} />;
}
