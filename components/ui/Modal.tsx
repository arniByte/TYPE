'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
};

export function Modal({ open, onClose, title, description, children, className, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 m-0 w-full max-w-md animate-scale-in border border-line bg-surface shadow-pop',
          'rounded-t-4xl sm:m-4 sm:rounded-4xl',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-0">
          <div>
            {title && <h2 className="text-lg font-bold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="focus-ring -mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-fg"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line p-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
