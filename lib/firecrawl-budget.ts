// Conservative reservations, not an invoice ledger. Ambiguous failures retain
// their reservation; an asynchronous crawl reserves its entire page limit.
export const firecrawlPolicy = {
  researchDaily: 50,
  researchPerCycle: 1500,
  deliveryReserve: 2000,
  safetyBuffer: 100,
} as const;

export type CreditUsage = {
  remainingCredits: number;
  planCredits: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
};

export class FirecrawlDeferred extends Error {
  nextEligibleAt: string;
  constructor(message: string, nextEligibleAt: string) {
    super(message);
    this.name = 'FirecrawlDeferred';
    this.nextEligibleAt = nextEligibleAt;
  }
}

export function validateCreditUsage(
  value: unknown,
  now = Date.now(),
): CreditUsage {
  const usage = value as CreditUsage | undefined;
  if (
    !usage ||
    !Number.isFinite(usage.remainingCredits) ||
    !Number.isFinite(usage.planCredits) ||
    usage.planCredits < 0 ||
    !Number.isFinite(Date.parse(usage.billingPeriodStart)) ||
    !Number.isFinite(Date.parse(usage.billingPeriodEnd)) ||
    Date.parse(usage.billingPeriodStart) > now ||
    Date.parse(usage.billingPeriodEnd) <= now
  ) {
    throw new Error(
      'Firecrawl credit balance or billing period could not be verified; spending stopped',
    );
  }
  return usage;
}

// One SQLite statement makes checking and reserving indivisible across Workers.
export const reserveFirecrawlSql = `
INSERT INTO firecrawl_spend (id, period, day, request_key, purpose, units, reserved_at)
SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
WHERE NOT EXISTS (SELECT 1 FROM firecrawl_spend WHERE request_key = ?4 AND reserved_at > ?8 AND retry_released = 0)
AND (SELECT COALESCE(SUM(units), 0) FROM firecrawl_spend WHERE period = ?2) + ?6
    <= (SELECT allowance FROM firecrawl_credit_periods WHERE period = ?2)
AND (?5 = 'delivery' OR (
  (SELECT COALESCE(SUM(units), 0) FROM firecrawl_spend WHERE purpose = 'research' AND day = ?3) + ?6 <= ?9
  AND (?4 LIKE 'discovery:%' OR (SELECT COALESCE(SUM(units), 0) FROM firecrawl_spend WHERE purpose = 'research' AND day = ?3 AND request_key NOT LIKE 'discovery:%') + ?6 <= ?9 - 4)
  AND (SELECT COALESCE(SUM(units), 0) FROM firecrawl_spend WHERE purpose = 'research' AND period = ?2) + ?6 <= ?10
  AND (SELECT COALESCE(SUM(units), 0) FROM firecrawl_spend WHERE period = ?2) + ?6
      <= (SELECT allowance FROM firecrawl_credit_periods WHERE period = ?2) - ?11
)) RETURNING id`;

export async function getFirecrawlCreditUsage(): Promise<CreditUsage> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('FIRECRAWL_API_KEY is not configured');
  const response = await fetch(
    'https://api.firecrawl.dev/v2/team/credit-usage',
    {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok)
    throw new Error(
      `Firecrawl credit check failed (${response.status}); spending stopped`,
    );
  const result = (await response.json()) as {
    success?: boolean;
    data?: unknown;
  };
  if (!result.success)
    throw new Error(
      'Firecrawl credit check was unsuccessful; spending stopped',
    );
  return validateCreditUsage(result.data);
}

async function budgetDatabase() {
  // Keep pure policy/SQL importable in Node tests without cloudflare:workers.
  const { env } = await import('cloudflare:workers');
  if (!env.DB)
    throw new Error('Firecrawl budget storage unavailable; spending stopped');
  return env.DB;
}

export async function refreshFirecrawlCreditStatus() {
  const db = await budgetDatabase();
  // Capture settled spend BEFORE the provider read. Never add in-flight work
  // to the balance; that could admit two concurrent crawls against the same funds.
  const settled = await db
    .prepare(
      'SELECT period, SUM(settled_units) AS units FROM firecrawl_spend GROUP BY period',
    )
    .all<{ period: string; units: number }>();
  const usage = await getFirecrawlCreditUsage();
  const period = new Date(usage.billingPeriodStart).toISOString();
  const settledUnits =
    settled.results.find((row) => row.period === period)?.units ?? 0;
  await db
    .prepare(`INSERT INTO firecrawl_credit_periods
    (period, ends_at, allowance, remaining, checked_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(period) DO UPDATE SET remaining=excluded.remaining, checked_at=excluded.checked_at,
      allowance=MIN(firecrawl_credit_periods.allowance, excluded.allowance)`)
    .bind(
      period,
      usage.billingPeriodEnd,
      Math.max(
        0,
        settledUnits +
          Math.floor(usage.remainingCredits) -
          firecrawlPolicy.safetyBuffer,
      ),
      usage.remainingCredits,
      new Date().toISOString(),
    )
    .run();
  return { ...usage, period, policy: firecrawlPolicy };
}

export async function reserveFirecrawl(input: {
  key: string;
  units: number;
  purpose: 'research' | 'delivery';
  cooldownMs: number;
}) {
  if (!Number.isInteger(input.units) || input.units < 1 || input.units > 250)
    throw new Error('Invalid Firecrawl reservation');
  const now = Date.now();
  const db = await budgetDatabase();
  const recent = await db
    .prepare(
      'SELECT reserved_at FROM firecrawl_spend WHERE request_key = ? AND reserved_at > ? AND retry_released = 0 ORDER BY reserved_at DESC LIMIT 1',
    )
    .bind(input.key, new Date(now - input.cooldownMs).toISOString())
    .first<{ reserved_at: string }>();
  if (recent)
    throw new FirecrawlDeferred(
      'Recent Firecrawl attempt already reserved; no new scrape performed',
      new Date(Date.parse(recent.reserved_at) + input.cooldownMs).toISOString(),
    );
  const usage = await refreshFirecrawlCreditStatus();
  const floor =
    input.purpose === 'research'
      ? firecrawlPolicy.deliveryReserve
      : firecrawlPolicy.safetyBuffer;
  if (usage.remainingCredits - input.units < floor) {
    if (input.purpose === 'research')
      throw new FirecrawlDeferred(
        'Research paused to protect the paid-delivery credit reserve',
        usage.billingPeriodEnd,
      );
    throw new Error(
      'Insufficient Firecrawl credits for paid delivery; operator review required',
    );
  }
  const reserved = await db
    .prepare(reserveFirecrawlSql)
    .bind(
      crypto.randomUUID(),
      usage.period,
      new Date(now).toISOString().slice(0, 10),
      input.key,
      input.purpose,
      input.units,
      new Date(now).toISOString(),
      new Date(now - input.cooldownMs).toISOString(),
      firecrawlPolicy.researchDaily,
      firecrawlPolicy.researchPerCycle,
      firecrawlPolicy.deliveryReserve,
    )
    .first<{ id: string }>();
  if (!reserved) {
    if (input.purpose === 'delivery')
      throw new Error(
        'Paid-delivery credit reservation refused (budget or duplicate); operator review required',
      );
    throw new FirecrawlDeferred(
      'Firecrawl research budget or duplicate-check guard reached; no credits spent',
      new Date(
        Math.min(Date.parse(usage.billingPeriodEnd), now + 86400_000),
      ).toISOString(),
    );
  }
  return {
    async recordOutcome(externalId?: string) {
      await db
        .prepare(
          'UPDATE firecrawl_spend SET settled_units = ?, external_id = ? WHERE id = ?',
        )
        .bind(externalId ? 0 : input.units, externalId ?? null, reserved.id)
        .run();
    },
  };
}

export async function releaseFailedCrawl(leadId: string, crawlId: string) {
  const db = await budgetDatabase();
  // A verified failure permits a NEW reservation without refunding the old one.
  // Matching the crawl ID prevents late webhooks from unlocking a newer crawl.
  await db
    .prepare(
      'UPDATE firecrawl_spend SET retry_released = 1 WHERE request_key = ? AND external_id = ?',
    )
    .bind(`audit:${leadId}`, crawlId)
    .run();
}
