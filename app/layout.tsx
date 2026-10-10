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
    'Get one public ecommerce product page rewritten and reviewed for £79, with focused seller tools and storefront help when you need them.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Storefront HQ | Make your best product easier to buy',
    description:
      'One public product page, rewritten and reviewed for a fixed £79.',
  },
  twitter: {
    card: 'summary',
    title: 'Storefront HQ | Product Page Rescue for £79',
    description: 'One public product page, rewritten and reviewed.',
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
