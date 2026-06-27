import { cn } from '@/lib/utils';

type MascotProps = {
  size?: number;
  className?: string;
  /** Eye direction adds a little life. */
  look?: 'up' | 'center';
  /** Accent color for the parenthesis "cheeks". */
  accent?: string;
};

/**
 * TYPE's mascot — the friendly ( •ᴗ• ) face from the brand reference,
 * redrawn as vector art so it stays sharp at any size.
 */
export function Mascot({
  size = 96,
  className,
  look = 'up',
  accent = '#F5F5F7',
}: MascotProps) {
  const pupilDX = look === 'up' ? -2 : 0;
  const pupilDY = look === 'up' ? -3 : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label="TYPE mascot"
      className={cn('select-none', className)}
    >
      {/* Parenthesis cheeks */}
      <path
        d="M30 26 C12 44 12 76 30 94"
        stroke={accent}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M90 26 C108 44 108 76 90 94"
        stroke={accent}
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Eyes */}
      <circle cx="47" cy="52" r="13" fill={accent} />
      <circle cx="73" cy="52" r="13" fill={accent} />
      {/* Pupils */}
      <circle cx={47 + pupilDX} cy={52 + pupilDY} r="5.5" fill="#0B0B0E" />
      <circle cx={73 + pupilDX} cy={52 + pupilDY} r="5.5" fill="#0B0B0E" />
      {/* Catchlights */}
      <circle cx={47 + pupilDX + 2} cy={52 + pupilDY - 2} r="1.6" fill={accent} />
      <circle cx={73 + pupilDX + 2} cy={52 + pupilDY - 2} r="1.6" fill={accent} />

      {/* Smile */}
      <path
        d="M48 74 C54 82 66 82 72 74"
        stroke={accent}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
