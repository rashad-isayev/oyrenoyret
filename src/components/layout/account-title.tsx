'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/src/i18n/i18n-provider';
import type { MessageKey } from '@/src/i18n';

function getPageLabel(pathname: string, t: (key: MessageKey) => string): string {
  const map: Record<string, MessageKey> = {
    '/dashboard': 'pages.dashboard',
    '/tracks': 'pages.tracks',
    '/admin': 'pages.admin',
    '/admin/messages': 'pages.contactMessages',
    '/admin/reports': 'pages.reports',
    '/discussions': 'pages.discussions',
    '/settings': 'pages.settings',
  };

  if (pathname in map) return t(map[pathname]);
  if (pathname.startsWith('/discussions/')) return t('pages.discussion');
  if (pathname.startsWith('/admin/')) return t('pages.admin');
  if (pathname.startsWith('/settings')) return t('pages.settings');
  return 'oyrenoyret';
}

interface AccountTitleProps {
  displayName: string;
}

/**
 * Sets document.title based on the current route.
 * Format: "{pagename} - oyrenoyret.org"
 */
export function AccountTitle({ displayName: _displayName }: AccountTitleProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  useEffect(() => {
    const pageLabel = getPageLabel(pathname, t);
    document.title = `${pageLabel} - oyrenoyret.org`;
    return () => {
      document.title = 'oyrenoyret.org';
    };
  }, [pathname, _displayName, t]);

  return null;
}
