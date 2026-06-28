'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Faithful to the reference art:
//   (\ /)
//   ( . .)
//   c(")(")
const EARS = String.raw`(\ /)`;
const FACE_OPEN = `( . .)`;
const FACE_BLINK = `( - -)`;
const FEET = String.raw`c(")(")`;

/**
 * The TYPE mascot — an ASCII bunny that gently floats, breathes a soft lime
 * aura, and blinks now and then. Looks great on the white canvas.
 */
export function BunnyAscii({
  className,
  sizeClass = 'text-3xl sm:text-5xl',
  color = 'text-fg',
  aura = true,
  animated = true,
  onClick,
}: {
  className?: string;
  sizeClass?: string;
  color?: string;
  aura?: boolean;
  animated?: boolean;
  onClick?: () => void;
}) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          setBlink(true);
          setTimeout(() => setBlink(false), 150);
          schedule();
        },
        2400 + Math.random() * 2800,
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  const interactive = !!onClick;

  return (
    <div
      className={cn(
        'group relative inline-flex items-center justify-center',
        interactive && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.() : undefined}
      aria-label={interactive ? 'Play the bunny mini-game' : undefined}
      title={interactive ? 'Tap to play' : undefined}
    >
      {aura && (
        <span className="pointer-events-none absolute inset-[-40%] aura animate-aura-pulse" aria-hidden />
      )}
      <pre
        className={cn(
          'relative m-0 select-none font-mono font-bold leading-[1.15] tracking-tight transition-transform',
          animated && 'animate-bunny-float',
          interactive && 'group-hover:scale-110 group-active:scale-95',
          color,
          sizeClass,
        )}
        role="img"
        aria-label="TYPE bunny mascot"
      >
        {EARS}
        {'\n'}
        {blink ? FACE_BLINK : FACE_OPEN}
        {'\n'}
        {FEET}
      </pre>
    </div>
  );
}

/** Compact vector bunny for the header logo and favicon (scales crisply). */
export function BunnyMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      role="img"
      aria-label="TYPE"
      className={cn('select-none', className)}
    >
      <path d="M11.6 13.2C9.6 9.2 9.9 4.4 11.4 3.8c1.6.6 1.9 5.4 1.5 9.6Z" />
      <path d="M20.4 13.2c2-4 1.7-8.8.2-9.4-1.6.6-1.9 5.4-1.5 9.6Z" />
      <circle cx="16" cy="20" r="8.2" />
      <circle cx="13" cy="19" r="1.15" fill="#FAFAF7" />
      <circle cx="19" cy="19" r="1.15" fill="#FAFAF7" />
      <path d="M16 21.4v1.5" stroke="#FAFAF7" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
