import {
  format,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  isSameDay as dfIsSameDay,
  formatDistanceToNowStrict,
} from 'date-fns';

export function formatTime(iso: string): string {
  return format(new Date(iso), 'HH:mm');
}

/** Compact timestamp for the conversation list. */
export function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, 'EEE');
  if (isThisYear(d)) return format(d, 'd MMM');
  return format(d, 'dd/MM/yy');
}

/** Day separator label inside a thread. */
export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisYear(d)) return format(d, 'EEEE, d MMMM');
  return format(d, 'd MMMM yyyy');
}

export function formatLastSeen(iso: string | null): string {
  if (!iso) return 'offline';
  return `last seen ${formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}`;
}

export function isSameDay(a: string, b: string): boolean {
  return dfIsSameDay(new Date(a), new Date(b));
}

/** Stable ordering key for messages: (created_at, id). */
export function isBefore(
  a: { created_at: string; id: string },
  b: { created_at: string; id: string },
): boolean {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at;
  return a.id < b.id;
}
