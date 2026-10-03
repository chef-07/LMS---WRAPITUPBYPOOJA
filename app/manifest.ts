import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Wrap It Up University',
    short_name: 'WrapItUp Uni',
    description: 'Training for the WrapItUpByPooja team: wrapping, hampers, sales, content and dispatch.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fff6ec',
    theme_color: '#ff7a1a',
    lang: 'en-IN',
    categories: ['education', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Continue learning', url: '/', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'SOP library', url: '/sops', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
