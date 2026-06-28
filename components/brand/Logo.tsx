import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Mascot } from './Mascot';

type LogoProps = {
  /** "full" = mascot + wordmark, "word" = wordmark only, "mark" = mascot only */
  variant?: 'full' | 'word' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  className?: string;
};

const WORD_SIZES = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
} as const;

const MARK_SIZES = { sm: 22, md: 30, lg: 44 } as const;

export function Logo({ variant = 'full', size = 'md', href = '/', className }: LogoProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {variant !== 'word' && <Mascot size={MARK_SIZES[size]} look="up" />}
      {variant !== 'mark' && (
        <span
          className={cn(
            'font-extrabold tracking-tight leading-none text-fg',
            WORD_SIZES[size],
          )}
        >
          TYPE
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="focus-ring rounded-md" aria-label="TYPE — home">
        {content}
      </Link>
    );
  }
  return content;
}
