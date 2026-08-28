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
  title: '48-Hour Shopify Storefront QA Sprint',
  description:
    'Reproducible storefront findings, fix-ready recommendations, and 30 days of regression watch—delivered in 48 hours.',
  openGraph: {
    type: 'website',
    title: '48-Hour Storefront QA',
    description: 'Reproducible findings. Fix-ready evidence.',
    images: [
      {
        url: '/og.png',
        width: 1729,
        height: 910,
        alt: '48-Hour Storefront QA — reproducible findings and fix-ready evidence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '48-Hour Storefront QA',
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
