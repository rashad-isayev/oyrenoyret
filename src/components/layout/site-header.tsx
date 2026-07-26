'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PiArrowRight as ArrowRight, PiCaretDown as ChevronDown, PiList as Menu, PiX as X } from 'react-icons/pi';

import { Button } from '@/components/ui/button';
import { Logo } from '@/src/components/ui/logo';
import { ProfileAvatar } from '@/src/components/layout/profile-avatar';
import { useI18n } from '@/src/i18n/i18n-provider';
import { cn } from '@/src/lib/utils';
import { useAnchoredOverlayStyle } from '@/src/lib/anchored-overlay';
import { useModalSurface } from '@/src/lib/use-modal-surface';

interface CurrentUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarVariant?: string | null;
}

interface HoverDropdownProps {
  label: string;
  items: Array<{ label: string; href: string; description?: string }>;
}

function HoverDropdown({ label, items }: HoverDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuStyle = useAnchoredOverlayStyle({
    open,
    triggerRef,
    overlayRef: menuRef,
    align: 'center',
    sideOffset: 10,
    collisionPadding: 12,
    zIndex: 100,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'flex h-9 touch-manipulation items-center gap-1 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:text-foreground',
          open ? 'bg-accent text-foreground' : 'hover:bg-accent',
        )}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5', open && 'rotate-180')} />
      </button>
      <div
        ref={menuRef}
        style={menuStyle}
        className={cn(
          'pointer-events-none invisible fixed z-[100] w-64 origin-top scale-[0.98] opacity-0 transition-all duration-150 ease-out',
          open && 'visible pointer-events-auto scale-100 opacity-100',
        )}
      >
        <div className="pt-3" aria-hidden />
        <div className="rounded-xl border border-border/60 bg-popover p-1.5 shadow-float">
          <div className="flex flex-col gap-0.5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col gap-1 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
                onClick={() => setOpen(false)}
              >
                <div className="font-medium">{item.label}</div>
                {item.description && (
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SiteHeaderProps {
  showSpacer?: boolean;
  showSeparator?: boolean;
}

export function SiteHeader({ showSpacer = true, showSeparator = false }: SiteHeaderProps) {
  const { t } = useI18n();
  const [hasScrolled, setHasScrolled] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLElement | null>(null);

  useModalSurface({
    open: menuOpen,
    onClose: () => setMenuOpen(false),
    containerRef: mobileMenuRef,
  });

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 4);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMenuOpen(false);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <>
      {showSpacer ? <div className="h-16" aria-hidden="true" /> : null}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 w-full border-b bg-background/90 backdrop-blur-xl transition-colors duration-150',
          showSeparator || hasScrolled
            ? 'border-border'
            : 'border-transparent',
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="landing-sidebar"
            aria-label={t('header.toggleMenu')}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Logo size="sm" showText textSize="lg" />
          {user ? (
            <ProfileAvatar
              userId={user.id}
              firstName={user.firstName}
              lastName={user.lastName}
              avatarVariant={user.avatarVariant}
              size="sm"
            />
          ) : (
            <Button asChild size="sm" variant="primary">
              <Link href="/login">{t('header.logIn')}</Link>
            </Button>
          )}
        </div>
        <div className="mx-auto hidden h-16 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 md:grid lg:px-8">
          {/* 1. Logo Section */}
          <div className="flex min-w-0 items-center justify-self-start">
            <Logo size="sm" showText textSize="lg" priority />
          </div>

          {/* 2. Directives Section - Core Navigation (centered) */}
          <nav className="hidden items-center justify-center gap-1 md:flex">
            <HoverDropdown
              label={t('header.resources')}
              items={[
                {
                  label: t('header.documentation'),
                  href: '/resources/docs',
                  description: t('header.documentationDesc'),
                },
                {
                  label: t('header.helpCenter'),
                  href: '/resources/help',
                  description: t('header.helpCenterDesc'),
                },
                {
                  label: t('header.changelog'),
                  href: '/resources/changelog',
                  description: t('header.changelogDesc'),
                },
                {
                  label: t('header.blog'),
                  href: '/resources/blog',
                  description: t('header.blogDesc'),
                },
              ]}
            />
            <HoverDropdown
              label={t('header.legals')}
              items={[
                {
                  label: t('header.privacy'),
                  href: '/legals/privacy-policy',
                  description: t('header.privacyDesc'),
                },
                {
                  label: t('header.terms'),
                  href: '/legals/terms-of-service',
                  description: t('header.termsDesc'),
                },
                {
                  label: t('header.cookies'),
                  href: '/legals/cookie-policy',
                  description: t('header.cookiesDesc'),
                },
                {
                  label: t('header.gdpr'),
                  href: '/legals/gdpr',
                  description: t('header.gdprDesc'),
                },
              ]}
            />
            <Link
              href="/contact"
              className="flex h-9 items-center rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {t('header.contact')}
            </Link>
          </nav>

          {/* 3. Interactive Buttons Section */}
          <div className="flex items-center justify-end gap-3">
            <div className="flex items-center gap-3">
              {user ? (
                <ProfileAvatar
                  userId={user.id}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  avatarVariant={user.avatarVariant}
                  size="sm"
                />
              ) : (
                <>
                  <Button asChild size="sm" variant="primary">
                    <Link href="/login">{t('header.logIn')}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href="/welcome"
                      className="group/btn inline-flex items-center gap-1"
                    >
                      {t('header.getStarted')}
                      <ArrowRight className="h-4 w-4" data-directional-arrow="forward" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        {showSeparator ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border"
            aria-hidden="true"
          />
        ) : null}
      </header>
      {menuOpen ? (
      <div
        className="fixed inset-0 z-50 md:hidden"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/45"
          onClick={() => setMenuOpen(false)}
          aria-label={t('header.closeNavigation')}
        />
        <aside
          ref={mobileMenuRef}
          id="landing-sidebar"
          tabIndex={-1}
          className="app-rail absolute inset-y-0 left-0 flex w-[min(296px,88vw)] flex-col border-r border-border/70 shadow-float"
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-4">
            <Logo size="sm" showText />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              data-modal-initial-focus
              onClick={() => setMenuOpen(false)}
              aria-label={t('header.closeNavigation')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="app-drawer-nav flex-1 space-y-7 overflow-y-auto px-4 py-5">
            <div className="flex flex-col gap-2">
              <span className="eyebrow px-3">
                {t('header.resources')}
              </span>
              <Link
                href="/resources/docs"
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {t('header.documentation')}
              </Link>
              <Link
                href="/resources/help"
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {t('header.helpCenter')}
              </Link>
              <Link
                href="/resources/changelog"
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {t('header.changelog')}
              </Link>
              <Link
                href="/resources/blog"
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {t('header.blog')}
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow px-3">
                {t('header.legals')}
              </span>
              <Link
                href="/legals/privacy-policy"
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {t('header.privacy')}
              </Link>
              <Link
                href="/legals/terms-of-service"
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {t('header.terms')}
              </Link>
              <Link
                href="/legals/cookie-policy"
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {t('header.cookies')}
              </Link>
              <Link
                href="/legals/gdpr"
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {t('header.gdpr')}
              </Link>
            </div>
            <Link
              href="/contact"
              className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {t('header.contact')}
            </Link>
          </nav>
          <div className="border-t border-border/70 px-4 py-4">
            {user ? (
              <div className="flex items-center gap-3">
                <ProfileAvatar
                  userId={user.id}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  avatarVariant={user.avatarVariant}
                  size="sm"
                />
                <span className="text-xs text-muted-foreground">
                  {t('header.signedIn')}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('header.logIn')}
                </Link>
                <Button asChild size="sm" variant="primary">
                  <Link
                    href="/welcome"
                    className="group/btn inline-flex items-center gap-1"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('header.getStarted')}
                    <ArrowRight className="h-4 w-4" data-directional-arrow="forward" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>
      ) : null}
    </>
  );
}
