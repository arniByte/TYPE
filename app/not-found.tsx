import Link from 'next/link';
import { BunnyAscii } from '@/components/brand/Bunny';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <BunnyAscii sizeClass="text-2xl sm:text-4xl" className="mx-auto mb-6" />
        <h1 className="text-3xl font-extrabold tracking-tight">Nothing to read here</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          This page slipped out of the conversation. Let’s get you back.
        </p>
        <Link href="/app" className="mt-6 inline-block">
          <Button size="lg">Back to TYPE</Button>
        </Link>
      </div>
    </div>
  );
}
