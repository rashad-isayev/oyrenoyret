import Link from 'next/link';
import { PiHouse as Home, PiSquaresFour as LayoutDashboard, PiSignIn as LogIn } from 'react-icons/pi';
import { Button } from '@/components/ui/button';
import { getI18n } from '@/src/i18n/server';

export default async function NotFound() {
  const { messages } = await getI18n();
  const copy = messages.notFound;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <div className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-medium uppercase text-muted-foreground">
          {copy.badge}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          {copy.description}
        </p>

        <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <Button asChild size="lg" variant="primary">
            <Link href="/">
              <Home className="h-4 w-4" />
              {copy.home}
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary-primary">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              {copy.dashboard}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              {copy.signIn}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
