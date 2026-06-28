import { cn, initials, tintFor } from '@/lib/utils';
import { Users } from 'lucide-react';

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  group?: boolean;
  online?: boolean;
  className?: string;
};

const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
} as const;

const DOT = {
  xs: 'h-2 w-2',
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
  xl: 'h-4 w-4',
} as const;

export function Avatar({ src, name, size = 'md', group, online, className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'grid place-items-center overflow-hidden rounded-full font-semibold ring-1 ring-line',
          SIZES[size],
          !src && (group ? 'bg-lime/20 text-lime-deep' : tintFor(name ?? '?')),
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name ?? 'avatar'} className="h-full w-full object-cover" />
        ) : group ? (
          <Users className="h-1/2 w-1/2" strokeWidth={2.2} />
        ) : (
          <span className="leading-none">{initials(name)}</span>
        )}
      </span>
      {online != null && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-surface',
            DOT[size],
            online ? 'bg-online' : 'bg-faint',
          )}
          aria-label={online ? 'online' : 'offline'}
        />
      )}
    </span>
  );
}
