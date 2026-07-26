/**
 * Main Loading
 *
 * Shown while landing page is loading.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { PublicPageShell } from '@/src/components/ui/public-page-shell';

export default function MainLoading() {
  return (
    <PublicPageShell width="wide" className="min-h-screen pt-16 lg:pt-16">
      <div className="flex flex-col items-center gap-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-6 w-96 max-w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </PublicPageShell>
  );
}
