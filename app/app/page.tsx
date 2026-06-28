import { MessagesSquare } from 'lucide-react';
import { Mascot } from '@/components/brand/Mascot';

export default function AppHome() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="aura absolute inset-0" />
      <div className="relative">
        <Mascot size={88} className="mb-6" />
        <h2 className="text-2xl font-bold tracking-tight">Pick up a conversation</h2>
        <p className="mx-auto mt-2 max-w-sm text-pretty text-muted">
          Choose a chat on the left, or start a new one. Your messages, photos and groups live
          here — synced in real time.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted">
          <MessagesSquare className="h-4 w-4 text-lime" />
          End-to-end of your attention, nothing else.
        </div>
      </div>
    </div>
  );
}
