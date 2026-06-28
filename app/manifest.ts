import type { MetadataRoute } from 'next';

// PWA manifest → installable, full-screen (no browser chrome) on mobile, so
// TYPE launches and feels like a native app rather than a website.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TYPE — where words matter',
    short_name: 'TYPE',
    description: 'A minimalist real-time messenger. Chat 1:1 or in groups, share photos and video.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAFAF7',
    theme_color: '#FAFAF7',
    categories: ['social', 'productivity'],
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/icon-maskable.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'maskable' },
    ],
  };
}
