import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/brand/Logo';
import { BunnyAscii } from '@/components/brand/Bunny';
import { Button } from '@/components/ui/Button';

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-70" />

      {/* Nav */}
      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Logo size="md" href="/" />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/app">
              <Button size="md">
                Open TYPE <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="md">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="md">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-5 pb-24 text-center">
        <BunnyAscii sizeClass="text-3xl sm:text-5xl" className="mb-8 sm:mb-10" />

        <h1 className="font-display text-fg text-[3.5rem] leading-[1.1] pb-2 sm:text-[8rem]">TYPE</h1>

        <p className="mt-6 text-xl font-medium sm:text-2xl">
          where <span className="mark">words</span> matter
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link href={user ? '/app' : '/signup'}>
            <Button size="lg" className="px-8">
              {user ? 'Open TYPE' : 'Start typing — it’s free'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          {!user && (
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-8">
                I already have an account
              </Button>
            </Link>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 text-sm text-faint">
          <Logo size="sm" href="/" />
          <p>© {new Date().getFullYear()} TYPE</p>
        </div>
      </footer>
    </div>
  );
}
