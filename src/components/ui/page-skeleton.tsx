/**
 * Page Skeleton
 *
 * Reusable fallback that matches the signed-in page shell and collection rhythm.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';
import { PageBody, PageHeaderSkeleton } from '@/src/components/ui/page-layout';

export function PageSkeleton() {
  return (
    <DashboardShell>
      <PageHeaderSkeleton actions />
      <PageBody>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="divide-y divide-border border-y border-border">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 py-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </DashboardShell>
  );
}
