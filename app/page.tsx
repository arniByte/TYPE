import Link from 'next/link';
import {
  Zap,
  Users,
  Images,
  ShieldCheck,
  Smartphone,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/brand/Logo';
import { Mascot } from '@/components/brand/Mascot';
import { Button } from '@/components/ui/Button';

const FEATURES = [
  { icon: Zap, title: 'Real-time', body: 'Messages, typing and presence land instantly.' },
  { icon: Users, title: 'Groups', body: 'Spin up a group, add people, share the moment.' },
  { icon: Images, title: 'Photos & video', body: 'Drop media right into any conversation.' },
  { icon: KeyRound, title: 'Email or Google', body: 'Sign in once. We remember you.' },
  { icon: ShieldCheck, title: 'Private by design', body: 'Row-level security on every message.' },
  { icon: Smartphone, title: 'Every device', body: 'From a 320px phone to a wide desktop.' },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />

      {/* Nav */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
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
      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
        <div className="aura absolute left-1/2 top-10 h-[420px] w-[720px] max-w-full -translate-x-1/2" />
        <div className="relative flex flex-col items-center text-center">
          <Mascot size={108} className="mb-8 animate-scale-in" />
          <h1 className="text-balance text-6xl font-extrabold leading-[0.95] tracking-tight sm:text-8xl">
            TYPE
          </h1>
          <p className="mt-6 text-balance text-2xl font-semibold sm:text-3xl">
            Where <span className="mark text-2xl sm:text-3xl">words</span> matter.
          </p>
          <p className="mt-5 max-w-xl text-pretty text-muted sm:text-lg">
            A minimalist real-time messenger. Add contacts, chat one-to-one or in groups, and share
            photos and video — fast, private, and beautiful on every device.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link href={user ? '/app' : '/signup'}>
              <Button size="lg" className="px-7">
                {user ? 'Open TYPE' : 'Start typing — it’s free'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {!user && (
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-7">
                  I already have an account
                </Button>
              </Link>
            )}
          </div>
          <p className="mt-4 text-xs text-faint">No credit card. No noise. Just conversation.</p>
        </div>

        {/* Features */}
        <div className="relative mt-24 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur transition-colors hover:border-line-strong"
            >
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-elevated text-lime ring-1 ring-line transition-colors group-hover:bg-lime group-hover:text-lime-ink">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-faint sm:flex-row">
          <Logo size="sm" variant="full" href="/" />
          <p>Built minimal. Deployed free. © {new Date().getFullYear()} TYPE.</p>
        </div>
      </footer>
    </div>
  );
}
