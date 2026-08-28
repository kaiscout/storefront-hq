import assert from 'node:assert/strict';
import test from 'node:test';

import { storefrontSnapshot } from '../lib/firecrawl.ts';

void test('storefront fingerprints ignore superficial ordering and detect status changes', async () => {
  const first = await storefrontSnapshot({
    markdown: '  BUY now\nfor this product  ',
    links: ['https://shop.example/b?x=1', 'https://shop.example/a'],
    metadata: { statusCode: 200, title: 'Product' },
  });
  const equivalent = await storefrontSnapshot({
    markdown: 'buy NOW for this product',
    links: ['https://shop.example/a', 'https://shop.example/b?x=2'],
    metadata: { statusCode: 200, title: 'Product' },
  });
  const broken = await storefrontSnapshot({
    markdown: 'buy NOW for this product',
    links: ['https://shop.example/a', 'https://shop.example/b?x=2'],
    metadata: { statusCode: 404, title: 'Product' },
  });

  assert.equal(first.contentHash, equivalent.contentHash);
  assert.notEqual(first.contentHash, broken.contentHash);
});
