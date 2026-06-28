import { cn } from '@/lib/utils';

/**
 * The calligraphic "TYPE" wordmark that draws itself in, left to right, as if
 * being written by hand. Pure CSS (clip-path reveal), so it works in server
 * components and is disabled under prefers-reduced-motion.
 *
 * loop = keeps re-writing (menu/sidebar); false = writes once and stays (hero).
 */
export function TypeWordmark({ className, loop = true }: { className?: string; loop?: boolean }) {
  return (
    <span
      className={cn('relative inline-block font-display leading-[1.15] pb-[0.3em] pt-[0.12em] text-fg', className)}
      role="img"
      aria-label="TYPE"
    >
      <span className={cn('inline-block', loop ? 'tw-write-loop' : 'tw-write-once')} aria-hidden>
        TYPE
      </span>
    </span>
  );
}
