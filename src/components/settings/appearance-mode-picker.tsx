'use client';

import { useTheme } from 'next-themes';
import { motion, useReducedMotion } from 'framer-motion';
import { PiCheckBold as Check, PiDesktop as Desktop, PiSun as Sun, PiMoon as Moon } from 'react-icons/pi';
import { cn } from '@/src/lib/utils';
import { useI18n } from '@/src/i18n/i18n-provider';

export function AppearanceModePicker() {
  const { theme, setTheme } = useTheme();
  const { messages } = useI18n();
  const reduceMotion = useReducedMotion();
  const copy = messages.settings.appearance;
  const currentTheme = theme ?? 'system';

  return (
    <div className="grid gap-1 rounded-xl bg-secondary p-1 sm:grid-cols-3">
      {([
        { id: 'system', label: copy.systemLabel, icon: Desktop },
        { id: 'light', label: copy.lightLabel, icon: Sun },
        { id: 'dark', label: copy.darkLabel, icon: Moon },
      ] as const).map((option) => {
        const isActive = currentTheme === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            aria-pressed={isActive}
            className={cn(
              'group relative isolate flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/75 focus-visible:ring-offset-0',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:bg-background/65',
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="appearance-active-mode"
                className="absolute inset-0 -z-10 rounded-lg border border-border/60 bg-background shadow-card"
                transition={{
                  duration: reduceMotion ? 0 : 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
                aria-hidden="true"
              />
            ) : null}
            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{option.label}</span>
            <Check className={cn('h-4 w-4 shrink-0 text-primary transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
          </button>
        );
      })}
    </div>
  );
}
