const siteUrl = (
  process.env.PUBLIC_SITE_URL?.trim() || 'https://storefronthq.co.uk'
).replace(/\/$/, '');

const routes = [
  { path: '', frequency: 'weekly', priority: '1.0' },
  { path: '/start', frequency: 'weekly', priority: '0.9' },
  { path: '/agency-partners', frequency: 'weekly', priority: '0.8' },
  { path: '/sample-report', frequency: 'monthly', priority: '0.7' },
  { path: '/privacy', frequency: 'yearly', priority: '0.2' },
  { path: '/terms', frequency: 'yearly', priority: '0.2' },
];

export function GET() {
  const urls = routes
    .map(
      ({ path, frequency, priority }) =>
        `<url><loc>${siteUrl}${path}</loc><lastmod>2026-09-29</lastmod><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`,
    )
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
