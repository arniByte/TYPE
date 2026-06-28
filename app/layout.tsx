import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Great_Vibes } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const display = Great_Vibes({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'TYPE — where words matter',
    template: '%s · TYPE',
  },
  description:
    'TYPE is a minimalist real-time messenger. Add contacts, chat 1:1 or in groups, share photos and video. Fast, private, and beautiful on every device.',
  applicationName: 'TYPE',
  authors: [{ name: 'TYPE' }],
  keywords: ['messenger', 'chat', 'real-time', 'groups', 'TYPE'],
  appleWebApp: {
    capable: true,
    title: 'TYPE',
    statusBarStyle: 'default',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'TYPE — where words matter',
    description:
      'A minimalist real-time messenger. Chat, share, and connect on any device.',
    type: 'website',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#FAFAF7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${display.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-fg">{children}</body>
    </html>
  );
}
