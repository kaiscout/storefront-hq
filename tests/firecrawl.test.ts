import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveCorpusFindings,
  deriveDeterministicFindings,
  discoverExplicitIntent,
  isSuccessfulStorefrontDocument,
  runStorefrontPreflight,
  selectStorefrontPreflightRoutes,
  storefrontSnapshot,
} from '../lib/firecrawl.ts';

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

void test('discovery filters noisy pages and ranks recent replyable requests first', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.FIRECRAWL_API_KEY;
  let requestBody: Record<string, unknown> | undefined;
  process.env.FIRECRAWL_API_KEY = 'test-key';
  globalThis.fetch = async (_input, init) => {
    if (typeof init?.body !== 'string') throw new Error('Expected JSON body');
    requestBody = JSON.parse(init.body) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          web: [
            {
              title: 'Shopify QA help needed this week',
              description:
                'We need someone to test our ecommerce storefront on mobile and check broken links.',
              url: 'https://www.reddit.com/r/shopify/comments/fresh123/qa_help/',
              date: '1 hour ago',
            },
            {
              title: 'Shopify storefront audit consultant wanted',
              description:
                'We need our ecommerce checkout tested. Email proposals to owner@merchant.example.',
              url: 'https://merchant.example/rfp/storefront-audit',
              date: '2 days ago',
            },
            {
              title: 'Looking for Shopify QA? Hire our team',
              description:
                'Our services cover ecommerce QA. We offer audits and mobile testing.',
              url: 'https://agency.example/services/shopify-qa',
              date: '1 day ago',
            },
            {
              title: 'How to test a Shopify storefront',
              description: 'A complete ecommerce QA audit guide.',
              url: 'https://publisher.example/blog/shopify-testing',
              date: '1 day ago',
            },
            {
              title: 'Shopify QA tester needed',
              description:
                'Full-time role with a job description, responsibilities and benefits. Apply now.',
              url: 'https://merchant.example/careers/qa-tester',
              date: '1 day ago',
            },
          ],
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    const results = await discoverExplicitIntent();
    assert.deepEqual(
      results.map((result) => result.url),
      [
        'https://www.reddit.com/r/shopify/comments/fresh123/qa_help/',
        'https://merchant.example/rfp/storefront-audit',
      ],
    );
    assert.equal(results[0].contactChannel, 'source-platform');
    assert.equal(results[1].contactChannel, 'direct-email');
    assert.equal(results[1].contactEmail, 'owner@merchant.example');
    assert.equal(requestBody?.tbs, 'qdr:w,sbd:1');
    assert.match(String(requestBody?.query), /-career/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.FIRECRAWL_API_KEY;
    else process.env.FIRECRAWL_API_KEY = originalApiKey;
  }
});

void test('preflight route selection is deterministic, same-origin and capped at five pages', () => {
  const routes = selectStorefrontPreflightRoutes(
    'https://shop.example/?campaign=launch',
    {
      links: [
        '/pages/about',
        '/products/zeta?variant=2',
        'https://other.example/products/nope',
        '/collections/summer#featured',
        '/account/login',
        '/products/alpha',
        '/assets/theme.css',
      ],
    },
  );
  assert.deepEqual(routes, [
    'https://shop.example/',
    'https://shop.example/products/alpha',
    'https://shop.example/products/zeta',
    'https://shop.example/collections/summer',
    'https://shop.example/pages/about',
  ]);
});

void test('five-page preflight keeps successful pages when one selected route fails', async () => {
  const calls: string[] = [];
  const result = await runStorefrontPreflight('https://shop.example/', {
    scrape: async (url) => {
      calls.push(url);
      if (url.endsWith('/products/beta')) throw new Error('temporary block');
      return {
        links:
          url === 'https://shop.example/'
            ? [
                '/products/alpha',
                '/products/beta',
                '/collections/summer',
                '/pages/about',
                '/pages/contact',
              ]
            : [],
        metadata: { sourceURL: url, statusCode: 200, title: url },
      };
    },
  });

  assert.equal(calls.length, 5);
  assert.equal(result.attemptedRoutes.length, 5);
  assert.equal(result.pages.length, 4);
  assert.deepEqual(result.failures, [
    {
      url: 'https://shop.example/products/beta',
      error: 'temporary block',
    },
  ]);
});

void test('conservative page and corpus findings use only captured crawl evidence', () => {
  const documents = [
    {
      links: ['/products/broken'],
      metadata: {
        sourceURL: 'https://shop.example/',
        statusCode: 200,
        title: 'Summer collection',
      },
    },
    {
      links: [],
      metadata: {
        sourceURL: 'https://shop.example/collections/summer',
        statusCode: 200,
        title: 'Summer collection',
      },
    },
    {
      links: [],
      metadata: {
        sourceURL: 'https://shop.example/products/broken',
        statusCode: 404,
        title: 'Not found',
      },
    },
  ];
  const pageFindings = deriveDeterministicFindings({
    markdown: 'Product details',
    metadata: {
      sourceURL: 'https://shop.example/products/untitled',
      statusCode: 200,
      title: '   ',
    },
  });
  const corpusFindings = deriveCorpusFindings(documents);

  assert.ok(pageFindings.some((item) => item.category === 'page-title'));
  assert.ok(corpusFindings.some((item) => item.category === 'duplicate-title'));
  assert.ok(
    corpusFindings.some(
      (item) =>
        item.category === 'broken-internal-destination' &&
        item.referringUrl === 'https://shop.example/',
    ),
  );
  assert.doesNotMatch(
    JSON.stringify([...pageFindings, ...corpusFindings]),
    /guaranteed|revenue loss|conversion uplift/i,
  );
  assert.equal(isSuccessfulStorefrontDocument(documents[0]), true);
  assert.equal(isSuccessfulStorefrontDocument(documents[2]), false);
});
