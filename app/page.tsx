import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/brand/Logo';
import { BunnyAscii } from '@/components/brand/Bunny';
import { Button } from '@/components/ui/Button';
import { QuickAuth } from '@/components/auth/QuickAuth';

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
      <main className="relative flex flex-1 flex-col items-center justify-center px-5 pb-12 pt-2 text-center">
        <BunnyAscii sizeClass="text-2xl sm:text-5xl" className="mb-4 sm:mb-8" />

        <h1 className="font-display text-fg text-[3rem] leading-[1.1] pb-1 sm:text-[7rem]">TYPE</h1>

        <p className="mb-6 mt-2 text-base font-medium text-muted sm:mb-8 sm:text-xl">
          where <span className="mark">words</span> matter
        </p>

        {user ? (
          <Link href="/app">
            <Button size="lg" className="px-8">
              Open TYPE <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <QuickAuth />
        )}
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
