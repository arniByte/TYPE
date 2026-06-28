'use client';

import { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/** Compact, on-brand voice-message player (works on white and lime bubbles). */
export function VoicePlayer({
  src,
  duration,
  onError,
}: {
  src: string;
  duration?: number;
  onError?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration && duration > 0 ? duration : 0);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else void a.play().catch(() => {});
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * total;
    setCurrent(a.currentTime);
  }

  const pct = total ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5 py-0.5 pr-1">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d) && d > 0) setTotal(d);
        }}
        onError={onError}
      />
      <button
        onClick={toggle}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime-ink text-lime transition-transform active:scale-95"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
      <div className="min-w-[120px] flex-1">
        <div onClick={seek} className="h-1.5 cursor-pointer rounded-full bg-black/10">
          <div className="h-full rounded-full bg-lime-deep" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-[10px] tabular-nums opacity-70">
          {fmt(current)} / {fmt(total)}
        </div>
      </div>
    </div>
  );
}
