'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  PiArrowLeft as ArrowLeft,
  PiBookOpen as BookOpen,
  PiCaretRight as CaretRight,
  PiCaretUp as CaretUp,
  PiChatCircle as MessageSquare,
  PiGear as Settings,
  PiNewspaper as Newspaper,
  PiPalette as Palette,
  PiShieldCheck as ShieldCheck,
  PiSignOut as LogOut,
  PiTranslate as Translate,
  PiUserCircle as UserCircle,
  PiWarningCircle as WarningCircle,
  PiX as X,
} from 'react-icons/pi';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/src/components/layout/profile-avatar';
import { Logo } from '@/src/components/ui/logo';
import { USER_ROLES } from '@/src/config/constants';
import { useI18n } from '@/src/i18n/i18n-provider';
import { cn } from '@/src/lib/utils';

interface AppSidebarProps {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarVariant?: string | null;
    email: string;
    role?: string;
  };
  className?: string;
  onClose?: () => void;
}

export function AppSidebar({ user, className, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [logoutPending, setLogoutPending] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : '';
  const isAdmin = normalizedRole === USER_ROLES.ADMIN;
  const isSettingsRoute = pathname === '/settings' || pathname.startsWith('/settings/');

  const settingsNavSections = [
    {
      id: 'user-settings',
      title: t('settings.nav.userSettings'),
      items: [
        {
          href: '/settings/my-account',
          label: t('settings.nav.myAccount'),
          icon: UserCircle,
        },
      ],
    },
    {
      id: 'app-settings',
      title: t('settings.nav.appSettings'),
      items: [
        {
          href: '/settings/appearance',
          label: t('settings.nav.appearance'),
          icon: Palette,
        },
        {
          href: '/settings/language-time',
          label: t('settings.nav.languageTime'),
          icon: Translate,
        },
      ],
    },
  ];

  const navSections = [
    {
      id: 'workspace',
      label: t('sidebar.workspace'),
      items: [{ href: '/dashboard', label: t('sidebar.dashboard'), icon: Newspaper }],
    },
    {
      id: 'learning',
      label: t('sidebar.learning'),
      items: [{ href: '/tracks', label: t('sidebar.tracks'), icon: BookOpen }],
    },
    {
      id: 'community',
      label: t('sidebar.community'),
      items: [{ href: '/discussions', label: t('sidebar.discussions'), icon: MessageSquare }],
    },
  ];

  const staffNavItems = [
    { href: '/admin', label: t('sidebar.adminHome'), icon: ShieldCheck },
    { href: '/admin/messages', label: t('sidebar.contactMessages'), icon: MessageSquare },
    { href: '/admin/reports', label: t('sidebar.reports'), icon: WarningCircle },
  ];

  const isNavItemActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin') return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (!accountMenuOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [pathname]);

  const navRowClass = onClose
    ? 'flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors'
    : 'flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13px] transition-colors';
  const sectionToggleClass = onClose
    ? 'group flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition-colors'
    : 'group flex h-7 w-full items-center gap-1.5 rounded-lg px-2.5 text-left text-[11px] font-medium text-muted-foreground transition-colors';

  const handleLogout = useCallback(async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    setAccountMenuOpen(false);
    onClose?.();
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.warn('[LOGOUT] Request failed; redirecting anyway.', error);
    } finally {
      router.replace('/');
      router.refresh();
    }
  }, [logoutPending, onClose, router]);

  return (
    <aside
      className={cn(
        'app-rail sticky top-0 z-40 flex h-[100dvh] w-full flex-col border-r border-border/70',
        className,
      )}
    >
      <div className="flex h-[60px] shrink-0 items-center px-3">
        {isSettingsRoute ? (
          <div className="relative flex w-full items-center justify-start">
            <Button size="sm" variant="ghost" asChild>
              <Link
                href="/dashboard"
                onClick={() => onClose?.()}
                className="inline-flex items-center gap-1.5"
                aria-label={t('settings.nav.backHome')}
              >
                <ArrowLeft className="h-3.5 w-3.5" data-directional-arrow="backward" />
                <span className="whitespace-nowrap">{t('settings.nav.backHome')}</span>
              </Link>
            </Button>
            {onClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                data-modal-initial-focus
                onClick={onClose}
                aria-label={t('header.closeNavigation')}
                className="absolute right-0"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <Logo size="sm" showText priority />
            {onClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                data-modal-initial-focus
                onClick={onClose}
                aria-label={t('header.closeNavigation')}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </>
        )}
      </div>

      <nav
        className={cn(
          'flex-1 overflow-y-auto px-2 py-1.5',
          isSettingsRoute ? 'space-y-4' : 'space-y-3.5',
        )}
      >
        {isSettingsRoute ? (
          <div className="space-y-4">
            {settingsNavSections.map((section) => (
              <div key={section.id} className="space-y-0.5">
                <p className="eyebrow px-2 py-1">{section.title}</p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isNavItemActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onClose?.()}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          navRowClass,
                          isActive
                            ? 'bg-accent/80 font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {navSections.map((section) => (
              <section key={section.id} className="space-y-0.5">
                <button
                  type="button"
                  className={cn(sectionToggleClass, 'hover:bg-secondary hover:text-foreground')}
                  aria-expanded={!collapsedSections.has(section.id)}
                  onClick={() => {
                    setCollapsedSections((current) => {
                      const next = new Set(current);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    });
                  }}
                >
                  <CaretRight
                    className={cn(
                      'h-3 w-3 transition-transform duration-150 motion-reduce:transition-none',
                      !collapsedSections.has(section.id) && 'rotate-90',
                    )}
                  />
                  <span className="truncate">{section.label}</span>
                </button>
                {!collapsedSections.has(section.id)
                  ? section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isNavItemActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => onClose?.()}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            navRowClass,
                            'group',
                            isActive
                              ? 'bg-accent/80 font-medium text-foreground'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </Link>
                      );
                    })
                  : null}
              </section>
            ))}

            {isAdmin ? (
              <section className="space-y-0.5">
                <p className="eyebrow px-2 py-1">{t('sidebar.administration')}</p>
                {staffNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavItemActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onClose?.()}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        navRowClass,
                        isActive
                          ? 'bg-accent/80 font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </section>
            ) : null}
          </>
        )}
      </nav>

      <div
        ref={accountMenuRef}
        className="relative shrink-0 border-t border-border/60 px-2 pb-2 pt-1.5"
      >
        <AnimatePresence initial={false}>
          {accountMenuOpen ? (
            <motion.div
              key="account-menu"
              role="menu"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8, scale: reduceMotion ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : 6, scale: reduceMotion ? 1 : 0.985 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-float"
            >
              <Link
                href="/settings/my-account"
                role="menuitem"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onClose?.();
                }}
                className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/75"
              >
                <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {t('settings.nav.settings')}
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                disabled={logoutPending}
                className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {logoutPending ? t('settings.nav.loggingOut') : t('settings.nav.logOut')}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setAccountMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
          className={cn(
            'group flex min-h-11 w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/75',
            accountMenuOpen && 'bg-secondary',
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ProfileAvatar
              userId={user.id}
              firstName={user.firstName}
              lastName={user.lastName}
              avatarVariant={user.avatarVariant}
              size="sm"
              static
              showHoverCard={false}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {user.firstName || user.email.split('@')[0]}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <CaretUp
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
              !accountMenuOpen && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    </aside>
  );
}
