const siteUrl = (
  process.env.PUBLIC_SITE_URL?.trim() || 'https://storefronthq.co.uk'
).replace(/\/$/, '');

export function GET() {
  return new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /ops',
      'Disallow: /api',
      `Sitemap: ${siteUrl}/sitemap.xml`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
