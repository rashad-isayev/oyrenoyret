import { Skeleton } from '@/components/ui/skeleton';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';

export default function DashboardLoading() {
  return (
    <DashboardShell className="pb-8">
      <header className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </header>

      <div>
        <Skeleton className="h-11 w-full rounded-lg" />
        <div className="flex min-h-10 items-center border-b border-border/70 px-0.5">
          <Skeleton className="h-3 w-14" />
        </div>

        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="border-b border-border/70 py-7 last:border-b-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>

            {index !== 1 ? <Skeleton className="mt-4 aspect-[16/9] w-full rounded-xl" /> : null}
            <Skeleton className="mt-4 h-6 w-28 rounded-md" />
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
