import type { Metadata, Viewport } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorker } from '@/components/shell/ServiceWorker';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', weight: ['500', '700'] });

export const metadata: Metadata = {
  title: { default: 'Wrap It Up University', template: '%s · Wrap It Up University' },
  description: 'Training for the WrapItUpByPooja team: wrapping, hampers, sales, content and dispatch.',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'WrapItUp Uni', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#ff7a1a', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
