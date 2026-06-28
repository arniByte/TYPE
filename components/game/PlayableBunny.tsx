'use client';

import { useState } from 'react';
import { BunnyAscii } from '@/components/brand/Bunny';
import { BunnyGame } from './BunnyGame';

/** The mascot, but tapping it opens the mini-game. */
export function PlayableBunny({ sizeClass, className }: { sizeClass?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <BunnyAscii sizeClass={sizeClass} className={className} onClick={() => setOpen(true)} />
      <BunnyGame open={open} onClose={() => setOpen(false)} />
    </>
  );
}
