import { cn } from '@/lib/utils';
import { Mascot } from '@/components/brand/Mascot';

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  mascot,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  mascot?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      {mascot ? (
        <Mascot size={64} className="mb-4 opacity-90" />
      ) : icon ? (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-elevated text-muted ring-1 ring-line">
          {icon}
        </div>
      ) : null}
      <h3 className="text-balance font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-pretty text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
