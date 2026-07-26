'use client';

import { createContext, useContext } from 'react';
import {
  getSystemTimeZone,
  type SettingsLanguage,
  type TimeFormat,
  type TimeZone,
} from '@/src/lib/settings-preferences';
import { DEFAULT_LOCALE } from '@/src/i18n';
import { TimeZoneSync } from '@/src/components/settings/time-zone-sync';

interface SettingsContextValue {
  language: SettingsLanguage;
  timeFormat: TimeFormat;
  timeZone: TimeZone;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps extends SettingsContextValue {
  children: React.ReactNode;
}

export function SettingsProvider({
  children,
  language,
  timeFormat,
  timeZone,
}: SettingsProviderProps) {
  return (
    <SettingsContext.Provider value={{ language, timeFormat, timeZone }}>
      <TimeZoneSync timeZone={timeZone} />
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      language: DEFAULT_LOCALE,
      timeFormat: 'auto' as TimeFormat,
      timeZone: getSystemTimeZone(),
    };
  }
  return context;
}
