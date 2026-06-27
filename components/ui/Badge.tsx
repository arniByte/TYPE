import { cn } from '@/lib/utils';

export function Badge({
  children,
  className,
  tone = 'lime',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'lime' | 'muted';
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-5',
        tone === 'lime' ? 'bg-lime text-lime-ink' : 'bg-elevated text-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}
