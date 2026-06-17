import { Suspense, type ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/layout/toaster';
import { ThemeProvider } from '@/components/providers/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '06-Turborepo',
    template: '%s | 06-Turborepo',
  },
  description: 'Polyglot-ready monorepo foundation',
  applicationName: '06-Turborepo',
  authors: [{ name: '06-Turborepo Team' }],
  generator: 'Next.js',
  keywords: ['turborepo', 'monorepo', 'nextjs', 'nestjs'],
  referrer: 'origin-when-cross-origin',
  creator: '06-Turborepo Team',
  publisher: '06-Turborepo',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            {children}
            <Toaster />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
