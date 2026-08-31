import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { offer } from '@/lib/offer';

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
  title: `${offer.brandName} | ${offer.deliveryHours}-Hour Shopify ${offer.productName}`,
  description: `Reproducible storefront findings, fix-ready recommendations, and ${offer.watchDays} days of regression watch—delivered in ${offer.deliveryHours} hours.`,
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: `${offer.brandName} | ${offer.productName}`,
    description: 'Reproducible findings. Fix-ready evidence.',
    images: [
      {
        url: '/og.png',
        width: 1729,
        height: 910,
        alt: `${offer.brandName} ${offer.productName} — reproducible findings and fix-ready evidence`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${offer.brandName} | ${offer.productName}`,
    description: 'Reproducible findings. Fix-ready evidence.',
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
