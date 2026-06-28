import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-lime text-lime-ink font-semibold hover:bg-lime-bright active:brightness-95 shadow-glow-sm',
  secondary:
    'bg-elevated text-fg hover:bg-hover border border-line',
  outline:
    'bg-transparent text-fg border border-line-strong hover:bg-elevated',
  ghost: 'bg-transparent text-muted hover:bg-elevated hover:text-fg',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
  icon: 'h-10 w-10 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'focus-ring relative inline-flex select-none items-center justify-center whitespace-nowrap transition-all duration-150',
          'disabled:pointer-events-none disabled:opacity-50',
          'active:scale-[0.98]',
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 grid place-items-center">
            <Spinner className="h-4 w-4" />
          </span>
        )}
        <span className={cn('inline-flex items-center', SIZES[size].includes('gap') ? 'gap-2' : '', loading && 'opacity-0')}>
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = 'Button';
