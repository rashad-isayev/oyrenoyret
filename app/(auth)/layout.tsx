/**
 * Authentication Layout
 *
 * ChatGPT-style authentication shell: one focused, centered task with the
 * product mark always visible and no competing marketing panel.
 * Login page handles redirect when user is already logged in.
 */

import { getI18n } from '@/src/i18n/server';
import { Logo } from '@/src/components/ui/logo';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { messages } = await getI18n();
  const copy = messages.auth.layout;
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center px-5 sm:px-8">
        <Logo size="sm" showText textSize="lg" priority />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-24 pt-10 sm:px-8">
        <div className="w-full max-w-[440px]">
          {children}
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-0 px-5 pb-5 text-center sm:pb-7">
        <p className="mx-auto max-w-lg text-xs leading-5 text-muted-foreground">
          {copy.heroDescription}
        </p>
      </footer>
    </div>
  );
}
