import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'focus-ring w-full resize-none rounded-xl border border-line bg-elevated px-3.5 py-2.5 text-sm text-fg',
        'placeholder:text-faint transition-colors hover:border-line-strong focus:border-lime/50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
