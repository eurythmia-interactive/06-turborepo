import type { ReactNode } from 'react';

export const metadata = {
  title: '06-Turborepo',
  description: 'Polyglot-ready monorepo foundation',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
