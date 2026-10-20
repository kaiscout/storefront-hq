import assert from 'node:assert/strict';

// Read-only smoke checks against a local preview, never payment or form submission.
const origin = new URL(
  process.env.BRANDING_TEST_ORIGIN || 'http://localhost:5174',
);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname));
const pages = [
  '/',
  '/products',
  '/triage',
  '/agency-partners',
  '/contact',
  '/reviews',
  '/start',
  '/terms',
  '/privacy',
];
const catalogue = [
  ['store-emergency-check', 'Store Emergency Check', '£99'],
  ['product-page-rescue', 'Product Page Rescue', '£79'],
  ['store-launch-kit', 'Store Launch Kit', '£39'],
  ['seller-campaign-club', 'Seller Campaign Club', '£19/month'],
];
for (const path of [...pages, ...catalogue.map(([id]) => `/products/${id}`)]) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.match(html, /brand-signature/);
  assert.match(html, /aria-label="Storefront HQ home"/);
  for (const href of [
    '/products',
    '/triage',
    '/agency-partners',
    '/reviews',
    '/contact',
  ]) {
    assert.ok(html.includes(`href="${href}"`), `${path} missing ${href}`);
  }
  if (path === '/') assert.match(html, /Illustrated workflow/);
  if (path === '/products') {
    for (const [id, name, price] of catalogue) {
      assert.ok(html.includes(`data-product-icon="${id}"`));
      assert.ok(html.includes(name));
      assert.ok(html.includes(price));
    }
  }
  const product = catalogue.find(([id]) => path === `/products/${id}`);
  if (product) {
    assert.ok(html.includes(`data-product-icon="${product[0]}"`));
    assert.ok(html.includes(product[1]));
    assert.ok(html.includes(product[2]));
  }
  if (path === '/products/store-emergency-check')
    assert.ok(html.includes('id="worked-example"'));
  console.log(`PASS ${path}`);
}
const favicon = await fetch(new URL('/favicon.svg', origin));
assert.equal(favicon.status, 200);
assert.match(await favicon.text(), /M41.5 45L44.5 48L50 42/);
console.log(
  'PASS: 13 pages, shared branding/navigation, all product icons/prices, worked example and custom favicon. No external side effects.',
);
