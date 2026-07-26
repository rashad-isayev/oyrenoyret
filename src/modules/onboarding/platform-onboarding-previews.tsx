'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  PiBookOpen as BookOpen,
  PiChatCircle as Chat,
  PiCheckBold as Check,
  PiGear as Settings,
  PiHouse as Home,
  PiMagnifyingGlass as Search,
  PiPlay as Play,
  PiSparkle as Sparkle,
  PiSun as Sun,
} from 'react-icons/pi';
import { cn } from '@/src/lib/utils';

type PreviewPage = 'feed' | 'tracks' | 'settings' | 'home';

const navigation = [
  { id: 'home' as const, icon: Home },
  { id: 'feed' as const, icon: Chat },
  { id: 'tracks' as const, icon: BookOpen },
  { id: 'settings' as const, icon: Settings },
];

/**
 * Shared product wireframe used by every tour step.
 *
 * A 16:10 canvas reflects a typical laptop screen. Radius math stays
 * complementary: the 24px shell has a 5px inset and a 19px inner window;
 * page cards and controls then step down to 12px and 8px.
 */
function ProductScreen({
  activePage,
  titleWidth,
  action,
  children,
}: {
  activePage: PreviewPage;
  titleWidth: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full rounded-[24px] border border-border/60 bg-secondary/40 p-[5px]">
      <div className="aspect-[16/10] min-h-[230px] overflow-hidden rounded-[19px] border border-border/70 bg-background">
        <div className="grid h-full grid-cols-[72px_minmax(0,1fr)] sm:grid-cols-[104px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r border-border/60 bg-secondary/40 p-2 sm:p-2.5">
            <div className="flex h-8 items-center gap-1.5 px-1.5">
              <span className="h-4 w-4 shrink-0 rounded-[5px] bg-primary" />
              <span className="hidden h-1.5 w-10 rounded-full bg-foreground/15 sm:block" />
            </div>

            <nav className="mt-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = item.id === activePage;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex h-8 items-center gap-2 rounded-lg px-2 text-muted-foreground',
                      active &&
                        'border border-border/60 bg-background text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        active && 'text-primary',
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        'hidden h-1.5 rounded-full bg-foreground/10 sm:block',
                        active ? 'w-10 bg-foreground/20' : 'w-8',
                      )}
                    />
                  </div>
                );
              })}
            </nav>

            <div className="mt-auto flex items-center gap-2 border-t border-border/60 px-1.5 pt-2.5">
              <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15" />
              <span className="hidden h-1.5 w-9 rounded-full bg-foreground/10 sm:block" />
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col">
            <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-3 sm:h-14 sm:px-4">
              <span
                className={cn(
                  'h-2 rounded-full bg-foreground/20',
                  titleWidth,
                )}
              />
              {action ?? (
                <span className="h-7 w-7 rounded-full bg-secondary" />
              )}
            </header>
            <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
              {children}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SearchControl() {
  return (
    <div className="flex h-8 min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-secondary/45 px-2.5 text-muted-foreground">
      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="h-1.5 w-20 rounded-full bg-foreground/10 sm:w-28" />
    </div>
  );
}

export function FeedPreview() {
  return (
    <ProductScreen
      activePage="feed"
      titleWidth="w-20 sm:w-28"
      action={<SearchControl />}
    >
      <div className="grid h-full min-h-0 gap-3 sm:grid-cols-[minmax(0,1fr)_30%]">
        <div className="min-h-0 space-y-2">
          {[0, 1].map((item) => (
            <motion.article
              key={item}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + item * 0.08 }}
              className={cn(
                'rounded-xl border p-2.5 sm:p-3',
                item === 0
                  ? 'border-primary/20 bg-primary/[0.035]'
                  : 'border-border/60 bg-card',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/15 sm:h-7 sm:w-7" />
                <div className="space-y-1">
                  <span className="block h-1.5 w-16 rounded-full bg-foreground/20 sm:w-20" />
                  <span className="block h-1 w-10 rounded-full bg-foreground/10 sm:w-12" />
                </div>
              </div>
              <span className="mt-2.5 block h-1.5 w-4/5 rounded-full bg-foreground/20" />
              <span className="mt-1.5 block h-1 w-full rounded-full bg-foreground/10" />
              <span className="mt-1.5 block h-1 w-3/5 rounded-full bg-foreground/10" />
            </motion.article>
          ))}
        </div>

        <aside className="hidden min-h-0 rounded-xl border border-border/60 bg-secondary/25 p-3 sm:block">
          <span className="block h-1.5 w-16 rounded-full bg-foreground/20" />
          <div className="mt-3 space-y-2.5">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-background" />
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="block h-1.5 w-4/5 rounded-full bg-foreground/10" />
                  <span className="block h-1 w-1/2 rounded-full bg-foreground/[0.07]" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </ProductScreen>
  );
}

export function TracksPreview() {
  return (
    <ProductScreen
      activePage="tracks"
      titleWidth="w-24 sm:w-32"
      action={
        <span className="h-7 w-16 rounded-lg border border-primary/20 bg-primary/[0.07]" />
      }
    >
      <div className="grid h-full min-h-0 gap-3 sm:grid-cols-[32%_minmax(0,1fr)]">
        <div className="hidden rounded-xl border border-border/60 bg-secondary/25 p-3 sm:block">
          <span className="block h-1.5 w-14 rounded-full bg-foreground/20" />
          <span className="mt-2 block h-1 w-full rounded-full bg-foreground/10" />
          <span className="mt-1.5 block h-1 w-3/4 rounded-full bg-foreground/10" />
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.05] p-2.5">
            <span className="block h-1.5 w-16 rounded-full bg-primary/35" />
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-primary/10">
              <span className="block h-full w-2/3 rounded-full bg-primary/55" />
            </div>
          </div>
        </div>

        <div className="relative min-h-0 rounded-xl border border-border/60 bg-card p-2">
          <div className="absolute bottom-6 left-[1.48rem] top-6 w-px bg-border sm:left-[1.72rem]" />
          {[
            { state: 'complete', width: 'w-24 sm:w-32' },
            { state: 'current', width: 'w-32 sm:w-44' },
            { state: 'upcoming', width: 'w-20 sm:w-28' },
          ].map((item, index) => (
            <motion.div
              key={item.state}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className={cn(
                'relative mb-1 flex items-center gap-2.5 rounded-lg border p-1.5 last:mb-0 sm:gap-3 sm:p-2',
                item.state === 'current'
                  ? 'border-primary/20 bg-primary/[0.04]'
                  : 'border-transparent',
              )}
            >
              <span
                className={cn(
                  'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border sm:h-9 sm:w-9',
                  item.state === 'complete'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : item.state === 'current'
                      ? 'border-primary/35 bg-background text-primary'
                      : 'border-border bg-background text-muted-foreground',
                )}
              >
                {item.state === 'complete' ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : item.state === 'current' ? (
                  <Play className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block h-1.5 max-w-full rounded-full bg-foreground/20',
                    item.width,
                  )}
                />
                <span className="mt-1.5 block h-1 w-1/2 rounded-full bg-foreground/10" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </ProductScreen>
  );
}

export function PreferencesPreview() {
  return (
    <ProductScreen
      activePage="settings"
      titleWidth="w-20 sm:w-28"
      action={<span className="h-7 w-14 rounded-lg bg-primary" />}
    >
      <div className="grid h-full min-h-0 gap-3 sm:grid-cols-[28%_minmax(0,1fr)]">
        <div className="hidden space-y-1 sm:block">
          {[true, false, false, false].map((active, index) => (
            <div
              key={index}
              className={cn(
                'flex h-8 items-center rounded-lg px-2.5',
                active && 'border border-border/60 bg-secondary/50',
              )}
            >
              <span
                className={cn(
                  'h-1.5 rounded-full',
                  active
                    ? 'w-16 bg-foreground/20'
                    : 'w-12 bg-foreground/10',
                )}
              />
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 border-b border-border/60 p-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                <Sun className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <span className="block h-1.5 w-16 rounded-full bg-foreground/20" />
                <span className="mt-1.5 block h-1 w-24 rounded-full bg-foreground/10" />
              </div>
            </div>
            <div className="flex rounded-lg border border-border/70 bg-secondary/45 p-0.5">
              <span className="h-6 w-8 rounded-[6px] border border-border/60 bg-background" />
              <span className="h-6 w-8 rounded-[6px]" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="flex items-center justify-between gap-3 p-3"
          >
            <div>
              <span className="block h-1.5 w-20 rounded-full bg-foreground/20" />
              <span className="mt-1.5 block h-1 w-28 rounded-full bg-foreground/10" />
            </div>
            <span className="h-7 w-14 rounded-lg border border-border/70 bg-background" />
          </motion.div>
        </div>
      </div>
    </ProductScreen>
  );
}

export function CompletePreview() {
  return (
    <ProductScreen
      activePage="home"
      titleWidth="w-16 sm:w-24"
      action={
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-primary">
          <Sparkle className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      }
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/[0.045] p-3"
        >
          <div>
            <span className="block h-2 w-24 rounded-full bg-foreground/20 sm:w-32" />
            <span className="mt-1.5 block h-1 w-36 max-w-full rounded-full bg-foreground/10 sm:w-48" />
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkle className="h-4 w-4" aria-hidden="true" />
          </span>
        </motion.div>

        <div className="grid min-h-0 grid-cols-2 gap-2.5 sm:grid-cols-3">
          {[BookOpen, Play, Chat].map((Icon, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.06 }}
              className={cn(
                'rounded-xl border border-border/60 bg-card p-2.5',
                index === 2 && 'hidden sm:block',
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-primary">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="mt-3 block h-1.5 w-14 rounded-full bg-foreground/20" />
              <span className="mt-1.5 block h-1 w-full rounded-full bg-foreground/10" />
              <span className="mt-1.5 block h-1 w-2/3 rounded-full bg-foreground/10" />
            </motion.div>
          ))}
        </div>
      </div>
    </ProductScreen>
  );
}
