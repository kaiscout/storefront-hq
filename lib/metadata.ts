import type { Metadata } from 'next';

export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title: `${title} | Storefront HQ`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: `${title} | Storefront HQ`,
      description,
      url: path,
      siteName: 'Storefront HQ',
    },
    twitter: {
      card: 'summary',
      title: `${title} | Storefront HQ`,
      description,
    },
  };
}
