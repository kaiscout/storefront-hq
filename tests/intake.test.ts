import assert from 'node:assert/strict';
import test from 'node:test';

import {
  intakeRateLimitKey,
  isPublicHttpsStoreUrl,
  normalizedSingleLine,
  readRequestBodyWithinLimit,
} from '../lib/intake.ts';

void test('intake accepts public HTTPS storefronts and rejects local or credentialed targets', () => {
  assert.equal(
    isPublicHttpsStoreUrl('https://example-shop.com/products/a'),
    true,
  );
  assert.equal(isPublicHttpsStoreUrl('http://example-shop.com'), false);
  assert.equal(isPublicHttpsStoreUrl('https://localhost/store'), false);
  assert.equal(isPublicHttpsStoreUrl('https://127.0.0.1/store'), false);
  assert.equal(isPublicHttpsStoreUrl('https://192.168.1.10/store'), false);
  assert.equal(isPublicHttpsStoreUrl('https://user:pass@example.com'), false);
  assert.equal(isPublicHttpsStoreUrl('https://example.com:8443'), false);
});

void test('intake body reader stops chunked requests at the byte limit', async () => {
  const small = new Request('https://example.test/api/intake', {
    method: 'POST',
    body: 'small',
  });
  assert.equal(await readRequestBodyWithinLimit(small, 8), 'small');
  const large = new Request('https://example.test/api/intake', {
    method: 'POST',
    body: 'this is too large',
  });
  assert.equal(await readRequestBodyWithinLimit(large, 8), null);
});

void test('intake normalizes names and hashes the request source without retaining the IP', async () => {
  assert.equal(normalizedSingleLine('  Deniz\n  Izci  '), 'Deniz Izci');
  const request = new Request('https://example.test/api/intake', {
    headers: {
      'CF-Connecting-IP': '203.0.113.9',
      'X-Forwarded-For': '198.51.100.2',
    },
  });
  const key = await intakeRateLimitKey(request);
  assert.match(key, /^intake-rate:[a-f0-9]{64}$/);
  assert.doesNotMatch(key, /203\.0\.113\.9/);
  const spoofedOnly = await intakeRateLimitKey(
    new Request('https://example.test/api/intake', {
      headers: { 'X-Forwarded-For': '198.51.100.2' },
    }),
  );
  assert.equal(
    spoofedOnly,
    await intakeRateLimitKey(new Request('https://example.test/api/intake')),
  );
});
