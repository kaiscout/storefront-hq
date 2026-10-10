const siteUrl = (
  process.env.PUBLIC_SITE_URL?.trim() || 'https://storefronthq.co.uk'
).replace(/\/$/, '');

const routes = [
  { path: '', frequency: 'weekly', priority: '1.0', lastmod: '2026-10-10' },
  {
    path: '/start',
    frequency: 'weekly',
    priority: '0.9',
    lastmod: '2026-10-10',
  },
  ...[
    'store-launch-kit',
    'product-page-rescue',
    'store-emergency-check',
    'seller-campaign-club',
  ].map((slug) => ({
    path: `/products/${slug}`,
    frequency: 'weekly',
    priority: '0.9',
    lastmod: '2026-10-10',
  })),
  {
    path: '/shopify-launch-migration-qa-checklist',
    frequency: 'monthly',
    priority: '0.8',
    lastmod: '2026-10-01',
  },
  {
    path: '/sample-report',
    frequency: 'monthly',
    priority: '0.7',
    lastmod: '2026-09-23',
  },
  {
    path: '/privacy',
    frequency: 'yearly',
    priority: '0.2',
    lastmod: '2026-10-10',
  },
  {
    path: '/terms',
    frequency: 'yearly',
    priority: '0.2',
    lastmod: '2026-10-10',
  },
];

export function GET() {
  const urls = routes
    .map(
      ({ path, frequency, priority, lastmod }) =>
        `<url><loc>${siteUrl}${path}</loc><lastmod>${lastmod}</lastmod><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`,
    )
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
