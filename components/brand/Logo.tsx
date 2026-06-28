import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BunnyMark } from './Bunny';

type LogoProps = {
  /** "full" = bunny + wordmark, "word" = wordmark only, "mark" = bunny only */
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

const MARK_SIZES = { sm: 22, md: 28, lg: 40 } as const;

export function Logo({ variant = 'full', size = 'md', href = '/', className }: LogoProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {variant !== 'word' && <BunnyMark size={MARK_SIZES[size]} className="text-fg" />}
      {variant !== 'mark' && (
        <span className={cn('font-extrabold tracking-tight leading-none text-fg', WORD_SIZES[size])}>
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
