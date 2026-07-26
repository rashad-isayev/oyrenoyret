'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Provides short-lived UI feedback without leaving a field in a persistent
 * error state after a recoverable interaction such as reaching a text limit.
 */
export function useTransientFlag(durationMs = 1500) {
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActive(false);
  }, []);

  const trigger = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActive(true);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setActive(false);
    }, durationMs);
  }, [durationMs]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return { active, trigger, clear };
}
