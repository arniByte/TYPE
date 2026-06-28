import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, invalid, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'focus-ring h-11 w-full rounded-xl border bg-elevated px-3.5 text-sm text-fg',
            'placeholder:text-faint transition-colors',
            'hover:border-line-strong focus:border-lime-deep/60 focus:ring-2 focus:ring-lime-deep/20',
            icon && 'pl-10',
            invalid ? 'border-danger/60' : 'border-line',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = 'Input';

export const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('mb-1.5 block text-xs font-medium text-muted', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';
