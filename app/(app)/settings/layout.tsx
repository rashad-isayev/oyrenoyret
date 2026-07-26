import type { ReactNode } from 'react';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';

/** Settings use the same product column and page rhythm as the rest of the app. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell width="standard">{children}</DashboardShell>;
}
