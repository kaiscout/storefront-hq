import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Storefront HQ | Find the next fix for a broken storefront',
  description:
    'Get one reported public-storefront issue reproduced, diagnosed and made repair-ready for £99, with an initial diagnosis within 24 hours.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Storefront HQ | Something broke. Find the next fix fast.',
    description:
      'One public storefront problem, evidence-backed diagnosis and one retest for a fixed £99.',
  },
  twitter: {
    card: 'summary',
    title: 'Storefront HQ | Store Emergency Check for £99',
    description:
      'One public storefront problem, evidence-backed diagnosis and one retest.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
