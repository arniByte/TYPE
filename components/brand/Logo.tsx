import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BunnyAscii } from './Bunny';
import { TypeWordmark } from './TypeWordmark';

type LogoProps = {
  /** "full" = bunny + wordmark, "word" = wordmark only, "mark" = bunny only */
  variant?: 'full' | 'word' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  /** Animate the wordmark typing itself out (use in the main nav / sidebar). */
  animated?: boolean;
  className?: string;
};

const WORD_SIZES = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
} as const;

const MARK_SIZES = {
  sm: 'text-[7px] leading-[1.05]',
  md: 'text-[8px] leading-[1.05]',
  lg: 'text-[11px] leading-[1.05]',
} as const;

export function Logo({ variant = 'full', size = 'md', href = '/', animated = false, className }: LogoProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {variant !== 'word' && (
        <BunnyAscii sizeClass={MARK_SIZES[size]} aura={false} animated={false} className="shrink-0" />
      )}
      {variant !== 'mark' &&
        (animated ? (
          <TypeWordmark className={WORD_SIZES[size]} />
        ) : (
          <span className={cn('font-extrabold tracking-tight leading-none text-fg', WORD_SIZES[size])}>
            TYPE
          </span>
        ))}
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
