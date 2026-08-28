import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createManualDiscoveryHandler,
  type ManualDiscoveryDependencies,
} from '../lib/manual-discovery.ts';
import { assessBuyerIntent } from '../lib/pipeline.ts';
import { hasAutomationSecret } from '../lib/security.ts';

const now = new Date('2026-08-28T20:00:00.000Z');
const secret = 'test-manual-discovery-secret';
const sourceUrl =
  'https://www.reddit.com/r/shopify/comments/abc123/looking_for_qa_help/';

const acceptedPayload = {
  url: sourceUrl,
  title: 'Looking for Shopify QA help before our launch',
  description:
    'We need someone to test our Shopify storefront on mobile and find broken links.',
  publishedAt: '2026-08-28T12:00:00.000Z',
};

function request(payload: unknown, bearer = secret) {
  return new Request('https://example.test/api/automation/manual-discovery', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

function handler(
  insertDiscoveredOpportunities: ManualDiscoveryDependencies['insertDiscoveredOpportunities'],
) {
  return createManualDiscoveryHandler({
    isAuthorized: hasAutomationSecret,
    assessBuyerIntent,
    insertDiscoveredOpportunities,
    now: () => now,
  });
}

async function withAutomationSecret<T>(run: () => Promise<T>) {
  const original = process.env.AUTOMATION_SECRET;
  process.env.AUTOMATION_SECRET = secret;
  try {
    return await run();
  } finally {
    if (original === undefined) delete process.env.AUTOMATION_SECRET;
    else process.env.AUTOMATION_SECRET = original;
  }
}

void test('manual discovery requires the automation bearer secret', async () => {
  await withAutomationSecret(async () => {
    let inserts = 0;
    const post = handler(async () => {
      inserts += 1;
      return 1;
    });

    const missing = new Request(
      'https://example.test/api/automation/manual-discovery',
      { method: 'POST' },
    );
    assert.equal((await post(missing)).status, 401);
    assert.equal(
      (await post(request(acceptedPayload, 'wrong-secret'))).status,
      401,
    );
    assert.equal(inserts, 0);
  });
});

void test('manual discovery rejects a source older than 72 hours', async () => {
  await withAutomationSecret(async () => {
    let inserts = 0;
    const post = handler(async () => {
      inserts += 1;
      return 1;
    });
    const response = await post(
      request({
        ...acceptedPayload,
        publishedAt: '2026-08-24T19:59:59.000Z',
      }),
    );

    assert.equal(response.status, 422);
    assert.equal(inserts, 0);
  });
});

void test('manual discovery rejects content without explicit buyer intent', async () => {
  await withAutomationSecret(async () => {
    let inserts = 0;
    const post = handler(async () => {
      inserts += 1;
      return 1;
    });
    const response = await post(
      request({
        ...acceptedPayload,
        title: 'Shopify storefront discussion',
        description:
          'A general discussion of ecommerce storefront design trends and industry news.',
      }),
    );

    assert.equal(response.status, 422);
    assert.equal(inserts, 0);
  });
});

void test('manual discovery rejects an accepted direct-email opportunity', async () => {
  await withAutomationSecret(async () => {
    let inserts = 0;
    const post = handler(async () => {
      inserts += 1;
      return 1;
    });
    const response = await post(
      request({
        ...acceptedPayload,
        url: 'https://merchant.example/request-for-proposals/storefront-qa',
        description:
          'We need someone to test our Shopify checkout and mobile store. Email proposals to owner@merchant.example.',
      }),
    );

    assert.equal(response.status, 422);
    assert.equal(inserts, 0);
  });
});

void test('manual discovery stores only a recent source-platform opportunity', async () => {
  await withAutomationSecret(async () => {
    const inserted: Parameters<
      ManualDiscoveryDependencies['insertDiscoveredOpportunities']
    >[0] = [];
    const post = handler(async (opportunities) => {
      inserted.push(...opportunities);
      return opportunities.length;
    });
    const response = await post(request(acceptedPayload));
    const body = (await response.json()) as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true, count: 1, saved: 1 });
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0]?.contactChannel, 'source-platform');
    assert.equal('contactEmail' in (inserted[0] ?? {}), false);
  });
});

void test('manual discovery never accepts an email field or source text containing an address', async () => {
  await withAutomationSecret(async () => {
    let inserts = 0;
    const post = handler(async () => {
      inserts += 1;
      return 1;
    });
    const extraField = await post(
      request({ ...acceptedPayload, contactEmail: 'owner@example.test' }),
    );
    const sourceText = await post(
      request({
        ...acceptedPayload,
        description: `${acceptedPayload.description} Contact owner@example.test for details.`,
      }),
    );

    assert.equal(extraField.status, 400);
    assert.equal(sourceText.status, 422);
    assert.equal(inserts, 0);
  });
});
