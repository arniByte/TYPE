import { BunnyAscii } from '@/components/brand/Bunny';

export default function AppHome() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <BunnyAscii sizeClass="text-2xl sm:text-4xl" className="mb-6" />
        <h2 className="text-2xl font-bold tracking-tight">Pick up a conversation</h2>
        <p className="mx-auto mt-2 max-w-sm text-pretty text-muted">
          Choose a chat on the left, or start a new one. Everything syncs in real time.
        </p>
      </div>
    </div>
  );
}
