'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import {
  normalizeLocale,
  type Locale,
  type Messages,
  type MessageKey,
  type TranslateVars,
} from '@/src/i18n';
import { toIntlMessages } from '@/src/i18n/message-format';

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  t: (key: MessageKey, vars?: TranslateVars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  locale: Locale | string;
  messages: Messages;
  timeZone: string;
  children: ReactNode;
}

function I18nContextBridge({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const intlTranslate = useTranslations();
  const t = useCallback(
    (key: MessageKey, vars?: TranslateVars) => intlTranslate(key as never, vars as never),
    [intlTranslate],
  );
  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      messages,
      t,
    };
  }, [locale, messages, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function I18nProvider({ locale, messages, timeZone, children }: I18nProviderProps) {
  const resolvedLocale = normalizeLocale(locale);
  const intlMessages = useMemo(() => toIntlMessages(messages), [messages]);

  return (
    <NextIntlClientProvider
      locale={resolvedLocale}
      messages={intlMessages}
      timeZone={timeZone}
    >
      <I18nContextBridge locale={resolvedLocale} messages={messages}>
        {children}
      </I18nContextBridge>
    </NextIntlClientProvider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider.');
  }
  return context;
}
