import { env } from 'cloudflare:workers';

import {
  canTransition,
  classifyReply,
  type LeadRecord,
  type PipelineStatus,
} from '@/lib/pipeline';

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    store_url TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_channel TEXT NOT NULL DEFAULT 'source-platform',
    source_url TEXT NOT NULL,
    source_title TEXT NOT NULL,
    source_excerpt TEXT,
    explicit_intent INTEGER NOT NULL DEFAULT 0,
    fit_score INTEGER NOT NULL DEFAULT 0,
    fit_reason TEXT,
    proof_url TEXT,
    proof_summary TEXT,
    status TEXT NOT NULL DEFAULT 'discovered',
    next_action TEXT,
    last_contact_at TEXT,
    last_reply_at TEXT,
    booked_at TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_source_url ON leads(source_url)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status_updated ON leads(status, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_contact_email ON leads(contact_email)`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
    external_id TEXT,
    direction TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    body_excerpt TEXT,
    classification TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_lead_created ON messages(lead_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS suppression (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_suppression_identifier ON suppression(identifier)`,
  `CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    referring_url TEXT,
    title TEXT NOT NULL,
    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    evidence TEXT NOT NULL,
    recommendation TEXT,
    screenshot_url TEXT,
    status_code INTEGER,
    found_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_findings_lead_severity ON findings(lead_id, severity)`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    dedupe_key TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    payload_json TEXT NOT NULL,
    result_json TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    run_after TEXT NOT NULL DEFAULT (datetime('now')),
    lease_until TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_dedupe_key ON jobs(dedupe_key)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_ready ON jobs(status, run_after, lease_until)`,
  `CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    external_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    received_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_provider_external ON webhook_events(provider, external_id)`,
  `PRAGMA optimize`,
];

export function d1() {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

export async function ensureSchema() {
  const database = d1();
  await database.batch(
    schemaStatements.map((statement) => database.prepare(statement)),
  );
}

export async function listLeads(limit = 100) {
  await ensureSchema();
  const result = await d1()
    .prepare('SELECT * FROM leads ORDER BY updated_at DESC LIMIT ?')
    .bind(Math.min(limit, 250))
    .all<LeadRecord>();
  return result.results;
}

export async function pipelineCounts() {
  await ensureSchema();
  const result = await d1()
    .prepare('SELECT status, COUNT(*) AS count FROM leads GROUP BY status')
    .all<{ status: PipelineStatus; count: number }>();
  return Object.fromEntries(
    result.results.map((row) => [row.status, Number(row.count)]),
  );
}

export async function getLead(id: string) {
  await ensureSchema();
  return d1()
    .prepare('SELECT * FROM leads WHERE id = ?')
    .bind(id)
    .first<LeadRecord>();
}

export async function getLeadByEmail(email: string) {
  await ensureSchema();
  return d1()
    .prepare(
      'SELECT * FROM leads WHERE lower(contact_email) = ? ORDER BY updated_at DESC LIMIT 1',
    )
    .bind(email.trim().toLowerCase())
    .first<LeadRecord>();
}

export async function insertDiscoveredOpportunities(
  opportunities: Array<{
    url: string;
    title: string;
    description: string;
    score: number;
    reasons: string[];
  }>,
) {
  await ensureSchema();
  const database = d1();
  if (opportunities.length === 0) return 0;
  const statements = opportunities.map((item) =>
    database
      .prepare(
        `INSERT INTO leads (
          id, company_name, contact_channel, source_url, source_title, source_excerpt,
          explicit_intent, fit_score, fit_reason, status, next_action
        ) VALUES (?, ?, 'source-platform', ?, ?, ?, 0, ?, ?, 'discovered', 'Verify explicit intent and channel rules')
        ON CONFLICT(source_url) DO UPDATE SET
          source_title = excluded.source_title,
          source_excerpt = excluded.source_excerpt,
          fit_score = MAX(leads.fit_score, excluded.fit_score),
          fit_reason = excluded.fit_reason,
          updated_at = datetime('now')`,
      )
      .bind(
        crypto.randomUUID(),
        new URL(item.url).hostname.replace(/^www\./, ''),
        item.url,
        item.title.slice(0, 300),
        item.description.slice(0, 1800),
        item.score,
        item.reasons.join(', '),
      ),
  );
  await database.batch(statements);
  return statements.length;
}

export async function createInboundLead(input: {
  companyName: string;
  contactName: string;
  contactEmail: string;
  storeUrl: string;
  sourceUrl: string;
}) {
  await ensureSchema();
  const id = crypto.randomUUID();
  await d1()
    .prepare(
      `INSERT INTO leads (
        id, company_name, store_url, contact_name, contact_email, contact_channel,
        source_url, source_title, explicit_intent, fit_score, status, next_action
      ) VALUES (?, ?, ?, ?, ?, 'inbound', ?, 'Website availability request', 1, 100, 'replied', 'Review request and offer a fit call')
      ON CONFLICT(source_url) DO UPDATE SET
        company_name = excluded.company_name,
        store_url = excluded.store_url,
        contact_name = excluded.contact_name,
        contact_email = excluded.contact_email,
        explicit_intent = 1,
        updated_at = datetime('now')`,
    )
    .bind(
      id,
      input.companyName,
      input.storeUrl,
      input.contactName,
      input.contactEmail.toLowerCase(),
      input.sourceUrl,
    )
    .run();
  return id;
}

export async function transitionLead(
  id: string,
  to: PipelineStatus,
  options?: { force?: boolean; nextAction?: string },
) {
  const lead = await getLead(id);
  if (!lead) throw new Error('Lead not found');
  if (!options?.force && !canTransition(lead.status, to)) {
    throw new Error(`Invalid transition from ${lead.status} to ${to}`);
  }
  await d1()
    .prepare(
      `UPDATE leads SET status = ?, next_action = ?, updated_at = datetime('now'),
       booked_at = CASE WHEN ? = 'booked' THEN datetime('now') ELSE booked_at END,
       paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END
       WHERE id = ?`,
    )
    .bind(to, options?.nextAction ?? null, to, to, id)
    .run();
  return { ...lead, status: to };
}

export async function markQualified(input: {
  id: string;
  companyName: string;
  storeUrl: string;
  contactEmail?: string;
  contactChannel: 'source-platform' | 'direct-email';
  proofUrl?: string;
  proofSummary?: string;
}) {
  const lead = await getLead(input.id);
  if (!lead) throw new Error('Lead not found');
  await d1()
    .prepare(
      `UPDATE leads SET company_name = ?, store_url = ?, contact_email = ?, contact_channel = ?, proof_url = ?,
       proof_summary = ?, explicit_intent = 1, status = 'qualified',
       next_action = 'Review evidence and approve proposal', updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(
      input.companyName,
      input.storeUrl,
      input.contactEmail?.toLowerCase() ?? null,
      input.contactChannel,
      input.proofUrl ?? null,
      input.proofSummary ?? null,
      input.id,
    )
    .run();
}

export async function recordMessage(input: {
  externalId: string;
  from: string;
  subject?: string;
  body: string;
}) {
  await ensureSchema();
  const email = input.from.trim().toLowerCase();
  const lead = await getLeadByEmail(email);
  const classification = classifyReply(`${input.subject ?? ''}\n${input.body}`);
  await d1()
    .prepare(
      `INSERT OR IGNORE INTO messages (
        id, lead_id, external_id, direction, channel, subject, body_excerpt, classification
      ) VALUES (?, ?, ?, 'inbound', 'gmail', ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      lead?.id ?? null,
      input.externalId,
      input.subject?.slice(0, 300) ?? null,
      input.body.slice(0, 2000),
      classification,
    )
    .run();

  if (classification === 'unsubscribe') {
    await d1()
      .prepare(
        `INSERT OR IGNORE INTO suppression (id, identifier, reason) VALUES (?, ?, 'recipient objection')`,
      )
      .bind(crypto.randomUUID(), email)
      .run();
  }
  if (lead) {
    const target: PipelineStatus =
      classification === 'unsubscribe'
        ? 'suppressed'
        : classification === 'not_interested'
          ? 'closed_lost'
          : classification === 'booked'
            ? 'booked'
            : 'replied';
    await transitionLead(lead.id, target, {
      force: true,
      nextAction:
        classification === 'ambiguous'
          ? 'Human review required'
          : `Reply classified: ${classification}`,
    });
    await d1()
      .prepare("UPDATE leads SET last_reply_at = datetime('now') WHERE id = ?")
      .bind(lead.id)
      .run();
  }
  return { leadId: lead?.id ?? null, classification };
}

export async function recordWebhookOnce(
  provider: string,
  externalId: string,
  eventType: string,
) {
  await ensureSchema();
  const result = await d1()
    .prepare(
      'INSERT OR IGNORE INTO webhook_events (id, provider, external_id, event_type) VALUES (?, ?, ?, ?)',
    )
    .bind(crypto.randomUUID(), provider, externalId, eventType)
    .run();
  return Boolean(result.meta.changes);
}

export async function addFinding(input: {
  leadId: string;
  url: string;
  title: string;
  severity: string;
  category: string;
  evidence: string;
  recommendation?: string;
  screenshotUrl?: string;
  statusCode?: number;
}) {
  await ensureSchema();
  await d1()
    .prepare(
      `INSERT INTO findings (
        id, lead_id, url, title, severity, category, evidence, recommendation, screenshot_url, status_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.leadId,
      input.url,
      input.title,
      input.severity,
      input.category,
      input.evidence,
      input.recommendation ?? null,
      input.screenshotUrl ?? null,
      input.statusCode ?? null,
    )
    .run();
}

export async function listFindings(leadId: string) {
  await ensureSchema();
  const result = await d1()
    .prepare('SELECT * FROM findings WHERE lead_id = ? ORDER BY found_at DESC')
    .bind(leadId)
    .all<Record<string, unknown>>();
  return result.results;
}
