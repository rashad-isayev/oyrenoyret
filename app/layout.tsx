import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

import { ThemeProvider } from '@/src/components/theme-provider';
import { SettingsProvider } from '@/src/components/settings/settings-provider';
import { I18nProvider } from '@/src/i18n/i18n-provider';
import { getI18n } from '@/src/i18n/server';
import { LOCALE_CONFIG } from '@/src/i18n';
import { getSettingsPreferences } from '@/src/lib/settings-preferences-server';
import { ClientRuntime } from '@/src/components/layout/client-runtime';
import { getCurrentSession } from '@/src/modules/auth/utils/session';

const comfortaa = localFont({
  src: [
    {
      path: '../public/fonts/Comfortaa-VariableFont_wght.ttf',
      style: 'normal',
      weight: '300 700',
    },
  ],
  variable: '--font-comfortaa',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'oyrenoyret.org',
    template: '%s - oyrenoyret.org',
  },
  description: 'A secure educational platform for minors',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-oyrenoyret.ico' },
      { url: '/icon-oyrenoyret.png', type: 'image/png' },
    ],
    shortcut: '/favicon-oyrenoyret.ico',
    apple: '/apple-oyrenoyret.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [preferences, userId] = await Promise.all([
    getSettingsPreferences(),
    getCurrentSession(),
  ]);
  const { language, timeFormat, timeZone } = preferences;
  const { messages } = await getI18n({ locale: language });
  const showVercelInsights = process.env.NODE_ENV === 'production';
  return (
    <html
      lang={LOCALE_CONFIG[language].intlCode}
      dir={LOCALE_CONFIG[language].direction}
      suppressHydrationWarning
    >
      <body className={`${comfortaa.variable} font-sans antialiased`}>
        <ThemeProvider storageKey={userId ? `oy_theme_${userId}` : 'oy_theme_guest'}>
          <I18nProvider locale={language} messages={messages} timeZone={timeZone}>
            <SettingsProvider
              language={language}
              timeFormat={timeFormat}
              timeZone={timeZone}
            >
              {children}
              <ClientRuntime showVercelInsights={showVercelInsights} />
            </SettingsProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
