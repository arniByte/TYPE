import { cn } from '@/lib/utils';

const LETTERS = ['T', 'Y', 'P', 'E'];

/**
 * The "TYPE" wordmark that types itself out on a gentle loop (with a blinking
 * caret) — a nod to the product. Pure CSS, so it works in server components.
 * Falls back to a static word under prefers-reduced-motion.
 */
export function TypeWordmark({
  className,
  loop = true,
}: {
  className?: string;
  /** loop = keeps re-typing (menu); false = types once and stays (hero). */
  loop?: boolean;
}) {
  const letterClass = loop ? 'tw-letter' : 'tw-letter-once';
  const step = loop ? 0.16 : 0.09;
  return (
    <span
      className={cn('inline-flex items-center font-extrabold tracking-tight text-fg', className)}
      role="img"
      aria-label="TYPE"
    >
      {LETTERS.map((c, i) => (
        <span key={i} className={letterClass} style={{ animationDelay: `${i * step}s` }} aria-hidden>
          {c}
        </span>
      ))}
      <span className="tw-caret text-lime-deep" aria-hidden>
        |
      </span>
    </span>
  );
}
