'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';

/**
 * Two-pane shell. On desktop both panes are visible. On mobile we show the
 * conversation list at /app and the active pane (chat / contacts / settings)
 * on any deeper route — a single-column navigation model.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const atRoot = pathname === '/app';

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <aside
        className={cn(
          'h-full w-full shrink-0 flex-col border-r border-line bg-surface lg:flex lg:w-[348px]',
          atRoot ? 'flex' : 'hidden lg:flex',
        )}
      >
        <Sidebar />
      </aside>
      <main className={cn('h-full min-w-0 flex-1 flex-col', atRoot ? 'hidden lg:flex' : 'flex')}>
        {children}
      </main>
    </div>
  );
}
