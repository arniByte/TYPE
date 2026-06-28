import { cn } from '@/lib/utils';

export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted animate-blink"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names.length} people are typing`;
  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted">
      <TypingDots />
      <span>{label}…</span>
    </div>
  );
}
