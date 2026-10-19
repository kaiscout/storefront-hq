import assert from 'node:assert/strict';

// Local synthetic form tests only: no email provider, Stripe, merchant or crawler.
const origin = new URL(
  process.env.WEBSITE_TEST_ORIGIN || 'http://127.0.0.1:4193',
);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname));
const secret = 'preview-only-not-a-production-secret';
const key = crypto.randomUUID();
const form = {
  kind: 'contact',
  submissionKey: key,
  contactName: 'Local functional test',
  contactEmail: 'functional@example.test',
  company: 'Synthetic test only',
  storeUrl: 'https://example.com/products/test',
  topic: 'other',
  productId: '',
  message:
    'LOCAL TEST ONLY — confirm durable receipt and notification queuing, not a customer or sale.',
  consent: true,
  website: '',
};
async function send(body, extra = {}) {
  return fetch(new URL('/api/website-forms', origin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin.origin,
      ...extra,
    },
    body: JSON.stringify(body),
  });
}
for (const path of [
  '/',
  '/products',
  '/contact',
  '/reviews',
  '/triage',
  '/agency-partners',
  '/start',
  '/products/store-emergency-check',
]) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.match(html, /Storefront HQ/);
  for (const href of [
    '/products',
    '/triage',
    '/agency-partners',
    '/reviews',
    '/contact',
  ])
    assert.ok(html.includes(`href="${href}"`), `${path} lacks ${href}`);
}
assert.equal(
  (await send(form, { Origin: 'https://untrusted.example' })).status,
  403,
);
assert.equal((await send({ ...form, consent: false })).status, 400);
assert.equal((await send({ ...form, message: 'x'.repeat(17000) })).status, 413);
assert.equal((await send(form)).status, 200);
assert.equal((await send(form)).status, 200, 'idempotent repeat');
assert.equal(
  (
    await send({
      ...form,
      message: 'Different content must not replace a saved submission.',
    })
  ).status,
  409,
);
const reviewId = crypto.randomUUID();
assert.equal(
  (
    await send({
      ...form,
      kind: 'review',
      submissionKey: reviewId,
      topic: 'free-triage',
      rating: 2,
      displayName: 'DO NOT PUBLISH LOCAL TEST',
      publishConsent: false,
      genuineExperience: true,
    })
  ).status,
  200,
);
const page = await (await fetch(new URL('/reviews', origin))).text();
assert.ok(!page.includes('DO NOT PUBLISH LOCAL TEST'));
assert.match(page, /No customer reviews published yet/);
const claimed = await (
  await fetch(new URL('/api/automation/website-notifications', origin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ action: 'claim' }),
  })
).json();
assert.equal(claimed.recipient, 'front.storecheckqa@gmail.com');
assert.equal(
  claimed.notifications.filter((n) => n.id === key).length,
  1,
  'duplicate browser submit must yield one notification',
);
assert.equal(claimed.notifications.filter((n) => n.id === reviewId).length, 1);
const again = await (
  await fetch(new URL('/api/automation/website-notifications', origin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ action: 'claim' }),
  })
).json();
assert.equal(
  again.notifications.length,
  0,
  'claimed work must not be delivered twice',
);
console.log(
  'PASS: eight routes, header links, origin/body/consent guards, durable forms, idempotency, private reviews and one-shot operator queue. No email was sent.',
);
