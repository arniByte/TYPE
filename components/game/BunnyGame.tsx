'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy, Timer, Zap, RotateCcw, Play } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { BunnyAscii } from '@/components/brand/Bunny';
import { cn } from '@/lib/utils';

const WORDS_EASY = [
  'type', 'bunny', 'lime', 'hop', 'chat', 'keys', 'word', 'fast', 'jump', 'carrot',
  'rabbit', 'focus', 'spark', 'pixel', 'vivid', 'glide', 'swift', 'rapid', 'clover', 'breeze',
];
const WORDS_HARD = [
  'keyboard', 'message', 'velocity', 'keystroke', 'springy', 'marshmallow', 'whisker', 'meadow',
  'nibble', 'bouncy', 'quokka', 'zephyr', 'momentum', 'staccato', 'crescendo', 'flutter',
  'luminous', 'cascade', 'parsley', 'twilight',
];

const GAME_MS = 30000;
const BONUS_MS = 600;
const BEST_KEY = 'type-bunny-best';

function pickWord(score: number, prev: string): string {
  const pool =
    score >= 120 ? [...WORDS_EASY, ...WORDS_HARD, ...WORDS_HARD] : score >= 50 ? [...WORDS_EASY, ...WORDS_HARD] : WORDS_EASY;
  let w = prev;
  for (let i = 0; i < 8 && w === prev; i++) w = pool[Math.floor(Math.random() * pool.length)];
  return w;
}

export function BunnyGame({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [word, setWord] = useState('');
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [solved, setSolved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_MS);
  const [best, setBest] = useState(0);
  const [pop, setPop] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const b = Number(localStorage.getItem(BEST_KEY) || 0);
    if (!Number.isNaN(b)) setBest(b);
  }, []);

  useEffect(() => {
    if (open) {
      setPhase('ready');
      setScore(0);
      setCombo(0);
      setSolved(0);
      setTyped('');
      setTimeLeft(GAME_MS);
    }
  }, [open]);

  const start = useCallback(() => {
    setScore(0);
    setCombo(0);
    setSolved(0);
    setTimeLeft(GAME_MS);
    setWord(pickWord(0, ''));
    setTyped('');
    setPhase('playing');
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  // Countdown.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 100)), 100);
    return () => clearInterval(id);
  }, [phase]);

  // End on timeout, persist best.
  useEffect(() => {
    if (phase === 'playing' && timeLeft <= 0) {
      setPhase('over');
      setBest((b) => {
        const nb = Math.max(b, score);
        localStorage.setItem(BEST_KEY, String(nb));
        return nb;
      });
    }
  }, [timeLeft, phase, score]);

  function onType(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase !== 'playing') return;
    const v = e.target.value;
    if (v === word) {
      const gain = 10 + combo * 2 + Math.max(0, word.length - 4) * 2;
      const next = score + gain;
      setScore(next);
      setCombo((c) => c + 1);
      setSolved((n) => n + 1);
      setTimeLeft((t) => Math.min(GAME_MS, t + BONUS_MS));
      setPop(true);
      setTimeout(() => setPop(false), 260);
      setWord((w) => pickWord(next, w));
      setTyped('');
    } else {
      setTyped(v.slice(0, word.length + 2));
    }
  }

  const timePct = (timeLeft / GAME_MS) * 100;
  const low = timeLeft <= 6000;

  return (
    <Modal open={open} onClose={onClose} title="Bunny Word Rush" className="max-w-lg">
      {/* Mascot + scoreboard */}
      <div className="flex items-center justify-between">
        <div className={cn('transition-transform duration-200', pop && 'scale-125')}>
          <BunnyAscii sizeClass="text-base" aura={false} className="text-lime-deep" />
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Score</p>
            <p className="text-2xl font-extrabold tabular-nums leading-none">{score}</p>
          </div>
          <div>
            <p className="flex items-center justify-end gap-1 text-[11px] font-medium uppercase tracking-wide text-faint">
              <Zap className="h-3 w-3" /> Combo
            </p>
            <p className="text-2xl font-extrabold tabular-nums leading-none text-lime-deep">×{combo}</p>
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-elevated">
        <div
          className={cn('h-full rounded-full transition-[width] duration-100 ease-linear', low ? 'bg-danger' : 'bg-lime')}
          style={{ width: `${timePct}%` }}
        />
      </div>

      {/* Body */}
      {phase === 'ready' && (
        <div className="py-8 text-center">
          <p className="text-balance text-sm text-muted">
            Type each word before the clock runs out. Every correct word adds time and grows your
            combo. How high can you score in 30 seconds?
          </p>
          <Button size="lg" className="mt-6" onClick={start}>
            <Play className="h-4 w-4" /> Start
          </Button>
          {best > 0 && (
            <p className="mt-3 flex items-center justify-center gap-1 text-xs text-faint">
              <Trophy className="h-3.5 w-3.5" /> Best: {best}
            </p>
          )}
        </div>
      )}

      {phase === 'playing' && (
        <div className="py-7">
          <div
            onClick={() => inputRef.current?.focus()}
            className="flex cursor-text select-none justify-center font-mono text-3xl font-bold tracking-wide sm:text-4xl"
          >
            {word.split('').map((ch, i) => {
              const state =
                i < typed.length
                  ? typed[i] === ch
                    ? 'ok'
                    : 'bad'
                  : i === typed.length
                    ? 'cur'
                    : 'idle';
              return (
                <span
                  key={i}
                  className={cn(
                    'px-[1px]',
                    state === 'ok' && 'text-lime-deep',
                    state === 'bad' && 'text-danger',
                    state === 'cur' && 'rounded-sm bg-lime/30 text-fg',
                    state === 'idle' && 'text-faint',
                  )}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <input
            ref={inputRef}
            value={typed}
            onChange={onType}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            aria-label="Type the word"
            className="mx-auto mt-5 block h-11 w-full max-w-xs rounded-xl border border-line bg-elevated px-4 text-center text-sm focus:border-lime-deep/60 focus:outline-none"
            placeholder="type it…"
          />
          <p className="mt-3 text-center text-xs text-faint">{solved} solved</p>
        </div>
      )}

      {phase === 'over' && (
        <div className="py-8 text-center">
          <div className={cn('transition-transform', pop && 'scale-110')}>
            <BunnyAscii sizeClass="text-2xl" className="mx-auto mb-3" />
          </div>
          <p className="text-sm text-muted">Time! You scored</p>
          <p className="text-5xl font-extrabold tabular-nums text-lime-deep">{score}</p>
          <p className="mt-1 flex items-center justify-center gap-3 text-xs text-faint">
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" /> Best {best}
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" /> {solved} words
            </span>
          </p>
          {score >= best && score > 0 && (
            <p className="mt-2 text-sm font-semibold text-lime-deep">New best! 🥕</p>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={start}>
              <RotateCcw className="h-4 w-4" /> Play again
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
