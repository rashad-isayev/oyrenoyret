import { Skeleton } from '@/components/ui/skeleton';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';
import { PageBody, PageHeaderSkeleton } from '@/src/components/ui/page-layout';

export default function DiscussionsLoading() {
  return (
    <DashboardShell className="animate-in fade-in duration-500 motion-reduce:animate-none">
      <PageHeaderSkeleton actions />
      <PageBody spacing="compact">
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="flex gap-1.5 overflow-hidden pb-1">
          <Skeleton className="h-8 w-14 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-16 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
        </div>
        <Skeleton className="ml-1 h-3 w-36 rounded-full" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-32 gap-2.5 rounded-xl border border-border/50 bg-card/20 p-3"
            >
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </DashboardShell>
  );
}
