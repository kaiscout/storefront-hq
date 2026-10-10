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
  title: 'Storefront HQ | Practical products for online sellers',
  description:
    'Launch tools, product-page help, urgent storefront diagnosis and monthly campaign packs for online sellers—from £19.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Storefront HQ | Build a store people can understand and buy from',
    description: 'Practical tools and focused expert help for online sellers.',
    images: [
      {
        url: '/og.png',
        width: 1729,
        height: 910,
        alt: 'Storefront HQ — practical products and focused help for online sellers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Storefront HQ | Practical products for online sellers',
    description: 'Launch tools, focused services and monthly campaign packs.',
    images: ['/og.png'],
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
