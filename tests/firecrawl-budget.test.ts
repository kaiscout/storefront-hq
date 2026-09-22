import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import {
  firecrawlPolicy,
  reserveFirecrawlSql,
  validateCreditUsage,
  getFirecrawlCreditUsage,
} from '../lib/firecrawl-budget.ts';

function ledger() {
  const db = new DatabaseSync(':memory:');
  db.exec(
    readFileSync(
      new URL('../drizzle/0011_yellow_punisher.sql', import.meta.url),
      'utf8',
    ).replaceAll('--> statement-breakpoint', ''),
  );
  db.exec(
    readFileSync(
      new URL('../drizzle/0012_curly_catseye.sql', import.meta.url),
      'utf8',
    ).replaceAll('--> statement-breakpoint', ''),
  );
  db.prepare('INSERT INTO firecrawl_credit_periods VALUES (?, ?, ?, ?, ?)').run(
    'period-1',
    '2026-10-22',
    4893,
    4993,
    '2026-09-22',
  );
  let sequence = 0;
  const reserve = (
    units = 1,
    purpose = 'research',
    key?: string,
    day = '2026-09-22',
    period = 'period-1',
  ) =>
    db
      .prepare(reserveFirecrawlSql)
      .get(
        `request-${++sequence}`,
        period,
        day,
        key ?? `key-${sequence}`,
        purpose,
        units,
        `${day}T12:00:00.000Z`,
        `${day}T10:00:00.000Z`,
        firecrawlPolicy.researchDaily,
        firecrawlPolicy.researchPerCycle,
        firecrawlPolicy.deliveryReserve,
      );
  return { db, reserve };
}

void test('atomic reservations never exceed daily research cap and paid work stays separate', async () => {
  const { db, reserve } = ledger();
  try {
    const results = await Promise.all(
      Array.from({ length: 80 }, () => Promise.resolve().then(() => reserve())),
    );
    assert.equal(results.filter(Boolean).length, 46);
    assert.ok(reserve(2, 'research', 'discovery:US'));
    assert.ok(reserve(2, 'research', 'discovery:UK'));
    assert.ok(reserve(250, 'delivery'));
    assert.equal(reserve(), undefined);
    assert.ok(reserve(1, 'research', undefined, '2026-09-23'));
    assert.equal(
      db
        .prepare(
          "SELECT SUM(units) AS units FROM firecrawl_spend WHERE purpose='research'",
        )
        .get()?.units,
      51,
    );
  } finally {
    db.close();
  }
});

void test('duplicate attempts are suppressed but become eligible after cooldown', () => {
  const { db, reserve } = ledger();
  try {
    assert.ok(reserve(1, 'research', 'same'));
    assert.equal(reserve(1, 'research', 'same'), undefined);
    assert.ok(reserve(1, 'research', 'same', '2026-09-23'));
    // No refund after ambiguous failure: reservation remains and a retry cannot spend again.
    assert.equal(reserve(1, 'research', 'same', '2026-09-23'), undefined);
  } finally {
    db.close();
  }
});

void test('cycle research cap, delivery reserve, and total allowance are independent gates', () => {
  const { db, reserve } = ledger();
  try {
    db.prepare(
      'INSERT INTO firecrawl_spend (id, period, day, request_key, purpose, units, reserved_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(
      'old',
      'period-1',
      '2026-09-21',
      'old',
      'research',
      1500,
      '2026-09-21T00:00:00Z',
    );
    assert.equal(reserve(), undefined);
    assert.ok(reserve(250, 'delivery'));
    db.prepare('DELETE FROM firecrawl_spend').run();
    db.prepare('UPDATE firecrawl_credit_periods SET allowance=2001').run();
    assert.ok(reserve());
    assert.equal(reserve(), undefined);
    assert.ok(reserve(250, 'delivery'));
    db.prepare('UPDATE firecrawl_credit_periods SET allowance=251').run();
    assert.equal(reserve(1, 'delivery'), undefined);
    db.prepare(
      'INSERT INTO firecrawl_credit_periods VALUES (?, ?, ?, ?, ?)',
    ).run('period-2', '2026-11-22', 4900, 5000, '2026-10-22');
    assert.ok(reserve(1, 'research', 'new-period', '2026-10-22', 'period-2'));
    assert.equal(
      reserve(1, 'delivery', 'unknown-period', '2026-10-22', 'missing'),
      undefined,
    );
  } finally {
    db.close();
  }
});

void test('unverified or expired credit period fails closed', () => {
  const now = Date.parse('2026-09-22T12:00:00Z');
  const usage = {
    remainingCredits: 4993,
    planCredits: 5000,
    billingPeriodStart: '2026-09-22T00:00:00Z',
    billingPeriodEnd: '2026-10-22T00:00:00Z',
  };
  assert.deepEqual(validateCreditUsage(usage, now), usage);
  for (const invalid of [
    undefined,
    {},
    { ...usage, remainingCredits: '4993' },
    { ...usage, billingPeriodEnd: 'invalid' },
    { ...usage, billingPeriodEnd: '2026-09-21T00:00:00Z' },
  ])
    assert.throws(() => validateCreditUsage(invalid, now), /spending stopped/);
});

void test('credit usage request is read-only and rejects API errors without billing calls', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.FIRECRAWL_API_KEY;
  process.env.FIRECRAWL_API_KEY = 'test-key';
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls += 1;
    assert.equal(url, 'https://api.firecrawl.dev/v2/team/credit-usage');
    assert.equal(options?.method, undefined);
    return new Response('{}', { status: 401 });
  };
  try {
    await assert.rejects(getFirecrawlCreditUsage(), /401.*spending stopped/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FIRECRAWL_API_KEY;
    else process.env.FIRECRAWL_API_KEY = originalKey;
  }
});
