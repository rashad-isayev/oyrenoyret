'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSystemTimeZone, normalizeTimeZone } from '@/src/lib/settings-preferences';

interface TimeZoneSyncProps {
  timeZone: string;
}

export function TimeZoneSync({ timeZone }: TimeZoneSyncProps) {
  const router = useRouter();
  const synchronizedTimeZone = useRef<string | null>(null);

  useEffect(() => {
    let detectedTimeZone: string;
    try {
      detectedTimeZone = getSystemTimeZone();
    } catch {
      return;
    }

    const currentTimeZone = normalizeTimeZone(timeZone);

    if (
      detectedTimeZone === currentTimeZone ||
      synchronizedTimeZone.current === detectedTimeZone
    ) {
      return;
    }

    synchronizedTimeZone.current = detectedTimeZone;
    const controller = new AbortController();

    void fetch('/api/settings/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ timeZone: detectedTimeZone }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          synchronizedTimeZone.current = null;
          return;
        }
        router.refresh();
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          synchronizedTimeZone.current = null;
        }
      });

    return () => {
      controller.abort();
      if (synchronizedTimeZone.current === detectedTimeZone) {
        synchronizedTimeZone.current = null;
      }
    };
  }, [router, timeZone]);

  return null;
}
