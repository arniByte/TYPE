'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight click-to-open popover anchored to a trigger. Closes on outside
 * click or Escape. Not a full menu system — enough for our compact menus.
 */
export function Popover({
  trigger,
  children,
  align = 'end',
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-2 min-w-[200px] animate-scale-in rounded-2xl border border-line bg-elevated p-1.5 shadow-pop',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  icon,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors',
        danger ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-hover',
      )}
    >
      {icon && <span className="text-muted">{icon}</span>}
      {children}
    </button>
  );
}
