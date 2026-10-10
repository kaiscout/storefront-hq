import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { createDeferredResearchHandler } from '../lib/research-automation.ts';

void test('scheduled research stays authenticated and does not call a network', async () => {
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => {
    networkCalls += 1;
    throw new Error('Network calls are forbidden in resource-saving tests');
  };
  try {
    for (const kind of ['discovery', 'source-watch'] as const) {
      const request = new Request(
        `https://example.test/api/automation/${kind}`,
        {
          method: 'POST',
        },
      );
      const denied = await createDeferredResearchHandler(
        kind,
        () => false,
      )(request);
      assert.equal(denied.status, 401);
      assert.deepEqual(await denied.json(), { error: 'Unauthorized' });

      const response = await createDeferredResearchHandler(
        kind,
        () => true,
      )(request);
      assert.equal(response.status, 200);
      const body = (await response.json()) as Record<string, unknown>;
      assert.equal(body.ok, true);
      assert.equal(body.skipped, true);
      assert.equal(body.reasonCode, 'scheduled_research_disabled');
      assert.equal(body.firecrawlInvoked, false);
      assert.equal(body.checked, 0);
      assert.equal(body.policy, 'ordinary-web-first');
      assert.match(String(body.reason), /disabled/);
      if (kind === 'discovery') {
        assert.equal(body.deferred, true);
        assert.equal(body.found, 0);
        assert.equal(body.saved, 0);
      } else {
        assert.deepEqual(body.deferred, []);
        assert.equal(body.targets, null);
        assert.equal(body.creditStatus, null);
        assert.deepEqual(body.changed, []);
        assert.equal(body.baselines, 0);
        assert.match(
          String(body.reason),
          /no source content or snapshots were checked/,
        );
      }
    }
    assert.equal(networkCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test('scheduled research routes have no Firecrawl or database import', () => {
  for (const kind of ['discover', 'source-watch']) {
    const source = readFileSync(
      new URL(`../app/api/automation/${kind}/route.ts`, import.meta.url),
      'utf8',
    );
    assert.match(source, /createDeferredResearchHandler/);
    assert.match(source, /hasAutomationSecret/);
    assert.doesNotMatch(source, /lib\/(?:firecrawl|database)|\bfetch\(/);
  }
});
