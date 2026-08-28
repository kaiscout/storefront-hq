import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hmacSha256,
  verifyHexHmac,
  verifyStripeSignature,
} from '../lib/security.ts';

void test('verifies Cal and Firecrawl style hex HMAC signatures', async () => {
  const signature = await hmacSha256('secret', '{"ok":true}');
  assert.equal(
    await verifyHexHmac('secret', '{"ok":true}', `sha256=${signature}`),
    true,
  );
  assert.equal(
    await verifyHexHmac('secret', '{"ok":false}', `sha256=${signature}`),
    false,
  );
});

void test('verifies Stripe timestamped signatures and rejects stale timestamps', async () => {
  const payload = '{"id":"evt_test"}';
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await hmacSha256('whsec_test', `${timestamp}.${payload}`);
  assert.equal(
    await verifyStripeSignature(
      'whsec_test',
      payload,
      `t=${timestamp},v1=${signature}`,
    ),
    true,
  );
  assert.equal(
    await verifyStripeSignature(
      'whsec_test',
      payload,
      `t=${timestamp - 1000},v1=${signature}`,
    ),
    false,
  );
});
