import Link from 'next/link';
import { Mascot } from '@/components/brand/Mascot';
import { Logo } from '@/components/brand/Logo';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="dot-grid absolute inset-0 opacity-60" />
        <div className="aura absolute inset-0" />
        <div className="relative">
          <Logo size="md" />
        </div>
        <div className="relative">
          <Mascot size={84} className="mb-8" />
          <h1 className="max-w-sm text-5xl font-extrabold leading-[1.05] tracking-tight">
            Where <span className="mark">words</span> matter.
          </h1>
          <p className="mt-5 max-w-sm text-pretty text-muted">
            A calmer messenger. Add people, talk in real time, share photos and video, and start
            groups — all in one clean, fast place.
          </p>
        </div>
        <p className="relative text-xs text-faint">Minimal by design. Yours by default.</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="md" href="/" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mb-7 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
          <p className="mt-10 text-center text-xs text-faint">
            <Link href="/" className="hover:text-muted">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
