import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ECHO — Mobile-First AI Survival Companion',
  description: 'HackPerimeter 2026: Tactical AI survival intelligence companion with persistent inventory, reactive avatar, and vision recognition.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-echo-cyan selection:text-echo-bg">
        {children}
      </body>
    </html>
  );
}
