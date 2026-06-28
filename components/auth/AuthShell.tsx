import Link from 'next/link';
import { BunnyAscii } from '@/components/brand/Bunny';
import { Logo } from '@/components/brand/Logo';
import { TypeWordmark } from '@/components/brand/TypeWordmark';

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
        <div className="dot-grid absolute inset-0 opacity-70" />
        <div className="relative">
          <Logo size="md" />
        </div>
        <div className="relative flex flex-col items-start">
          <BunnyAscii sizeClass="text-2xl sm:text-3xl" className="mb-6" />
          <TypeWordmark loop={false} className="text-7xl" />
          <p className="mt-4 text-lg font-medium text-fg">
            where <span className="mark">words</span> matter
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
