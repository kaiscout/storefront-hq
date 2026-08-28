import { env } from 'cloudflare:workers';

import {
  canTransition,
  classifyReply,
  type LeadRecord,
  type PipelineStatus,
} from '@/lib/pipeline';
import {
  activeSourcePlatformStatuses,
  automatedSlaNextAction,
  deliverySlaSummary,
  UNQUALIFIED_RESEARCH_RETENTION_DAYS,
  UNSUCCESSFUL_LEAD_RETENTION_DAYS,
  unsuccessfulLeadStatuses,
} from '@/lib/operations';
import { offer } from '@/lib/offer';

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
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_findings_dedupe ON findings(lead_id, url, title, evidence)`,
  `CREATE TABLE IF NOT EXISTS watch_routes (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_routes_lead_url ON watch_routes(lead_id, url)`,
  `CREATE TABLE IF NOT EXISTS route_snapshots (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    status_code INTEGER,
    page_title TEXT,
    checked_at TEXT NOT NULL DEFAULT (datetime('now')),
    changed_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_route_snapshots_lead_url ON route_snapshots(lead_id, url)`,
  `CREATE INDEX IF NOT EXISTS idx_route_snapshots_checked ON route_snapshots(lead_id, checked_at)`,
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
    status TEXT NOT NULL DEFAULT 'processed',
    lease_until TEXT,
    processed_at TEXT,
    last_error TEXT,
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
  const webhookColumns = await database
    .prepare("PRAGMA table_info('webhook_events')")
    .all<{ name: string }>();
  const existing = new Set(webhookColumns.results.map((column) => column.name));
  const additions = [
    [
      'status',
      "ALTER TABLE webhook_events ADD COLUMN status TEXT NOT NULL DEFAULT 'processed'",
    ],
    ['lease_until', 'ALTER TABLE webhook_events ADD COLUMN lease_until TEXT'],
    ['processed_at', 'ALTER TABLE webhook_events ADD COLUMN processed_at TEXT'],
    ['last_error', 'ALTER TABLE webhook_events ADD COLUMN last_error TEXT'],
  ] as const;
  for (const [name, statement] of additions)
    if (!existing.has(name)) await database.prepare(statement).run();
}

export async function listLeads(limit = 100) {
  await ensureSchema();
  const result = await d1()
    .prepare('SELECT * FROM leads ORDER BY updated_at DESC LIMIT ?')
    .bind(Math.min(limit, 250))
    .all<LeadRecord>();
  return result.results;
}

export async function listDraftableDirectEmailLeads(limit = 250) {
  await ensureSchema();
  const result = await d1()
    .prepare(
      `SELECT leads.* FROM leads
       WHERE leads.status = 'proposal_ready'
         AND leads.explicit_intent = 1
         AND leads.contact_channel = 'direct-email'
         AND leads.contact_email IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM suppression
           WHERE lower(suppression.identifier) = lower(leads.contact_email)
         )
       ORDER BY leads.updated_at ASC
       LIMIT ?`,
    )
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
    contactChannel?: 'source-platform' | 'direct-email';
    contactEmail?: string;
    publishedAt?: string;
  }>,
) {
  await ensureSchema();
  const database = d1();
  if (opportunities.length === 0) return 0;
  const statements = opportunities.map((item) =>
    database
      .prepare(
        `INSERT INTO leads (
          id, company_name, contact_email, contact_channel, source_url, source_title, source_excerpt,
          explicit_intent, fit_score, fit_reason, status, next_action
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'discovered', ?)
        ON CONFLICT(source_url) DO UPDATE SET
          source_title = excluded.source_title,
          source_excerpt = excluded.source_excerpt,
          fit_score = MAX(leads.fit_score, excluded.fit_score),
          fit_reason = excluded.fit_reason,
          contact_email = CASE WHEN leads.status = 'discovered' THEN excluded.contact_email ELSE leads.contact_email END,
          contact_channel = CASE WHEN leads.status = 'discovered' THEN excluded.contact_channel ELSE leads.contact_channel END,
          updated_at = datetime('now')`,
      )
      .bind(
        crypto.randomUUID(),
        new URL(item.url).hostname.replace(/^www\./, ''),
        item.contactEmail?.toLowerCase() ?? null,
        item.contactChannel ?? 'source-platform',
        item.url,
        item.title.slice(0, 300),
        item.description.slice(0, 1800),
        item.score,
        [
          ...item.reasons,
          ...(item.publishedAt ? [`published ${item.publishedAt}`] : []),
        ].join(', '),
        item.contactChannel === 'direct-email'
          ? 'Verify the public request and published reply email'
          : 'Verify the public request and source-platform reply rules',
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
      ON CONFLICT(source_url) DO NOTHING`,
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
  const stored = await d1()
    .prepare('SELECT id FROM leads WHERE source_url = ?')
    .bind(input.sourceUrl)
    .first<{ id: string }>();
  if (!stored) throw new Error('Inbound request could not be stored');
  return stored.id;
}

export async function transitionLead(
  id: string,
  to: PipelineStatus,
  options?: { nextAction?: string },
) {
  const lead = await getLead(id);
  if (!lead) throw new Error('Lead not found');
  if (!canTransition(lead.status, to)) {
    throw new Error(`Invalid transition from ${lead.status} to ${to}`);
  }
  const result = await d1()
    .prepare(
      `UPDATE leads SET status = ?, next_action = ?, updated_at = datetime('now'),
       booked_at = CASE WHEN ? = 'booked' THEN datetime('now') ELSE booked_at END,
       paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END
       WHERE id = ? AND status = ?`,
    )
    .bind(to, options?.nextAction ?? null, to, to, id, lead.status)
    .run();
  if (!result.meta.changes)
    throw new Error('Lead changed concurrently; refresh and retry');
  return {
    ...lead,
    status: to,
    next_action: options?.nextAction ?? null,
  };
}

const forwardPipeline: PipelineStatus[] = [
  'discovered',
  'qualified',
  'proposal_ready',
  'drafted',
  'replied',
  'booked',
  'paid',
  'fulfilling',
  'delivered',
];

export async function advanceLead(
  id: string,
  to: PipelineStatus,
  nextAction: string,
) {
  let lead = await getLead(id);
  if (!lead) throw new Error('Lead not found');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const fromIndex = forwardPipeline.indexOf(lead.status);
    const toIndex = forwardPipeline.indexOf(to);
    if (
      fromIndex < 0 ||
      toIndex <= fromIndex ||
      !canTransition(lead.status, to)
    )
      return { ...lead, advanced: false };
    const result = await d1()
      .prepare(
        `UPDATE leads SET status = ?, next_action = ?, updated_at = datetime('now'),
         booked_at = CASE WHEN ? = 'booked' THEN datetime('now') ELSE booked_at END,
         paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END
         WHERE id = ? AND status = ?`,
      )
      .bind(to, nextAction, to, to, id, lead.status)
      .run();
    if (result.meta.changes)
      return {
        ...lead,
        status: to,
        next_action: nextAction,
        advanced: true,
      };
    const refreshed = await getLead(id);
    if (!refreshed) throw new Error('Lead not found');
    lead = refreshed;
  }
  return { ...lead, advanced: false };
}

export async function setLeadNextAction(
  id: string,
  nextAction: string,
  onlyStatuses?: PipelineStatus[],
) {
  await ensureSchema();
  if (!onlyStatuses?.length) {
    await d1()
      .prepare(
        "UPDATE leads SET next_action = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(nextAction, id)
      .run();
    return;
  }
  const placeholders = onlyStatuses.map(() => '?').join(', ');
  await d1()
    .prepare(
      `UPDATE leads SET next_action = ?, updated_at = datetime('now')
       WHERE id = ? AND status IN (${placeholders})`,
    )
    .bind(nextAction, id, ...onlyStatuses)
    .run();
}

export async function retryFailedAudit(id: string, nextAction: string) {
  await ensureSchema();
  await d1()
    .prepare(
      `UPDATE leads SET status = 'paid', next_action = ?, updated_at = datetime('now')
       WHERE id = ? AND status = 'fulfilling'`,
    )
    .bind(nextAction, id)
    .run();
}

export async function watchDeliverySla(now = new Date()) {
  await ensureSchema();
  const result = await d1()
    .prepare(
      `SELECT id, company_name, status, paid_at, next_action
       FROM leads
       WHERE paid_at IS NOT NULL AND status IN ('paid', 'fulfilling')
       ORDER BY paid_at ASC`,
    )
    .all<{
      id: string;
      company_name: string;
      status: PipelineStatus;
      paid_at: string;
      next_action: string | null;
    }>();

  const approaching: Array<Record<string, unknown>> = [];
  const overdue: Array<Record<string, unknown>> = [];
  let nextActionsUpdated = 0;
  for (const lead of result.results) {
    const summary = deliverySlaSummary(lead.paid_at, now);
    if (!summary || summary.state === 'on_track') continue;
    const nextAction = automatedSlaNextAction(summary);
    const update = await d1()
      .prepare(
        `UPDATE leads SET next_action = ?, updated_at = datetime('now')
         WHERE id = ? AND status = ? AND paid_at = ?
           AND (next_action IS NULL OR trim(next_action) = '' OR next_action LIKE '[SLA] %')
           AND COALESCE(next_action, '') <> ?`,
      )
      .bind(nextAction, lead.id, lead.status, lead.paid_at, nextAction)
      .run();
    const item = {
      leadId: lead.id,
      companyName: lead.company_name,
      status: lead.status,
      paidAt: summary.paidAt,
      dueAt: summary.dueAt,
      hoursRemaining: summary.hoursRemaining,
      nextActionUpdated: Boolean(update.meta.changes),
    };
    nextActionsUpdated += Number(update.meta.changes ?? 0);
    (summary.state === 'overdue' ? overdue : approaching).push(item);
  }

  return {
    activeDeliveries: result.results.length,
    approaching,
    overdue,
    nextActionsUpdated,
  };
}

export async function runPrivacyRetentionCleanup(now = new Date()) {
  await ensureSchema();
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid cleanup time');
  const unqualifiedCutoff = new Date(
    now.getTime() - UNQUALIFIED_RESEARCH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const unsuccessfulCutoff = new Date(
    now.getTime() - UNSUCCESSFUL_LEAD_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const database = d1();
  const unqualified = await database
    .prepare(
      `DELETE FROM leads
       WHERE paid_at IS NULL
         AND status = 'discovered'
         AND explicit_intent = 0
         AND created_at <= datetime(?)`,
    )
    .bind(unqualifiedCutoff)
    .run();
  const placeholders = unsuccessfulLeadStatuses.map(() => '?').join(', ');
  const unsuccessful = await database
    .prepare(
      `DELETE FROM leads
       WHERE paid_at IS NULL
         AND status IN (${placeholders})
         AND updated_at <= datetime(?)`,
    )
    .bind(...unsuccessfulLeadStatuses, unsuccessfulCutoff)
    .run();
  const unqualifiedResearchDeleted = Number(unqualified.meta.changes ?? 0);
  const unsuccessfulLeadsDeleted = Number(unsuccessful.meta.changes ?? 0);
  return {
    unqualifiedResearchDeleted,
    unsuccessfulLeadsDeleted,
    totalDeleted: unqualifiedResearchDeleted + unsuccessfulLeadsDeleted,
    unqualifiedCutoff,
    unsuccessfulCutoff,
    suppressionRecordsPreserved: true,
    paidAndContractRecordsPreserved: true,
  };
}

export async function isSuppressed(identifier: string) {
  await ensureSchema();
  const row = await d1()
    .prepare(
      'SELECT 1 AS suppressed FROM suppression WHERE lower(identifier) = ? LIMIT 1',
    )
    .bind(identifier.trim().toLowerCase())
    .first<{ suppressed: number }>();
  return Boolean(row);
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
  if (lead.status !== 'discovered')
    throw new Error(`Cannot qualify a lead in ${lead.status}`);
  if (input.contactEmail && (await isSuppressed(input.contactEmail)))
    throw new Error('This address is suppressed and cannot be drafted');
  const result = await d1()
    .prepare(
      `UPDATE leads SET company_name = ?, store_url = ?, contact_email = ?, contact_channel = ?, proof_url = ?,
       proof_summary = ?, explicit_intent = 1, status = 'qualified',
       next_action = 'Review evidence and approve proposal', updated_at = datetime('now')
       WHERE id = ? AND status = 'discovered'`,
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
  if (!result.meta.changes)
    throw new Error('Lead changed concurrently; refresh and retry');
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
  const inserted = await d1()
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

  if (!inserted.meta.changes)
    return { leadId: lead?.id ?? null, classification, duplicate: true };

  if (classification === 'unsubscribe') {
    await d1()
      .prepare(
        `INSERT OR IGNORE INTO suppression (id, identifier, reason) VALUES (?, ?, 'recipient objection')`,
      )
      .bind(crypto.randomUUID(), email)
      .run();
  }
  if (lead) {
    const beforePayment = forwardPipeline.slice(
      0,
      forwardPipeline.indexOf('paid'),
    );
    const nextAction =
      classification === 'ambiguous'
        ? 'Human review required'
        : `Reply classified: ${classification}`;
    if (
      (classification === 'unsubscribe' ||
        classification === 'not_interested') &&
      beforePayment.includes(lead.status)
    ) {
      await transitionLead(
        lead.id,
        classification === 'unsubscribe' ? 'suppressed' : 'closed_lost',
        { nextAction },
      );
    } else if (classification === 'booked') {
      await advanceLead(lead.id, 'booked', nextAction);
    } else if (classification === 'out_of_office') {
      await setLeadNextAction(lead.id, nextAction, beforePayment);
    } else if (
      classification !== 'unsubscribe' &&
      classification !== 'not_interested'
    ) {
      await advanceLead(lead.id, 'replied', nextAction);
    } else if (classification === 'unsubscribe') {
      await setLeadNextAction(
        lead.id,
        'Marketing suppression recorded; active delivery stage preserved',
      );
    }
    await d1()
      .prepare("UPDATE leads SET last_reply_at = datetime('now') WHERE id = ?")
      .bind(lead.id)
      .run();
  }
  return { leadId: lead?.id ?? null, classification };
}

export async function recordOutboundContact(input: {
  leadId: string;
  threadId: string;
  sentMessageId: string;
  sentAt: string;
  subject?: string;
}) {
  await ensureSchema();
  const lead = await getLead(input.leadId);
  if (!lead) throw new Error('Lead not found');
  if (lead.contact_channel !== 'direct-email')
    throw new Error('Only direct-email leads can record Gmail contact');
  const sentAt = new Date(input.sentAt);
  if (!Number.isFinite(sentAt.getTime())) throw new Error('Invalid sent time');
  const sentAtIso = sentAt.toISOString();
  const externalId = `gmail-thread:${input.threadId}`;
  const inserted = await d1()
    .prepare(
      `INSERT OR IGNORE INTO messages (
        id, lead_id, external_id, direction, channel, subject, classification, created_at
      ) VALUES (?, ?, ?, 'outbound', 'gmail', ?, ?, datetime(?))`,
    )
    .bind(
      crypto.randomUUID(),
      input.leadId,
      externalId,
      input.subject?.slice(0, 300) ?? null,
      `sent:${input.sentMessageId}`,
      sentAtIso,
    )
    .run();
  const awaitReply =
    '[Outbound] Await reply; follow up only within the permitted channel rules';
  await d1()
    .prepare(
      `UPDATE leads SET
         last_contact_at = CASE
           WHEN last_contact_at IS NULL OR datetime(last_contact_at) < datetime(?)
             THEN datetime(?)
           ELSE last_contact_at
         END,
         next_action = CASE
           WHEN status = 'drafted'
             AND (
               next_action IS NULL OR trim(next_action) = ''
               OR next_action = 'Review the Gmail draft and send only if channel rules allow'
               OR next_action LIKE '[Outbound] %'
             )
             THEN ?
           ELSE next_action
         END,
         updated_at = datetime('now')
       WHERE id = ? AND contact_channel = 'direct-email'
         AND (
           last_contact_at IS NULL OR datetime(last_contact_at) < datetime(?)
           OR (
             status = 'drafted'
             AND COALESCE(next_action, '') <> ?
             AND (
               next_action IS NULL OR trim(next_action) = ''
               OR next_action = 'Review the Gmail draft and send only if channel rules allow'
               OR next_action LIKE '[Outbound] %'
             )
           )
         )`,
    )
    .bind(sentAtIso, sentAtIso, awaitReply, input.leadId, sentAtIso, awaitReply)
    .run();
  return {
    leadId: input.leadId,
    threadId: input.threadId,
    recorded: Boolean(inserted.meta.changes),
    duplicate: !inserted.meta.changes,
  };
}

export async function claimWebhookEvent(
  provider: string,
  externalId: string,
  eventType: string,
) {
  await ensureSchema();
  const result = await d1()
    .prepare(
      `INSERT INTO webhook_events (
        id, provider, external_id, event_type, status, lease_until
      ) VALUES (?, ?, ?, ?, 'processing', datetime('now', '+5 minutes'))
      ON CONFLICT(provider, external_id) DO UPDATE SET
        event_type = excluded.event_type,
        status = 'processing',
        lease_until = datetime('now', '+5 minutes'),
        processed_at = NULL,
        last_error = NULL,
        received_at = datetime('now')
      WHERE webhook_events.status = 'failed'
         OR (
           webhook_events.status = 'processing'
           AND webhook_events.lease_until < datetime('now')
         )`,
    )
    .bind(crypto.randomUUID(), provider, externalId, eventType)
    .run();
  return Boolean(result.meta.changes);
}

export async function completeWebhookEvent(
  provider: string,
  externalId: string,
) {
  await ensureSchema();
  await d1()
    .prepare(
      `UPDATE webhook_events SET status = 'processed', lease_until = NULL,
       processed_at = datetime('now'), last_error = NULL
       WHERE provider = ? AND external_id = ? AND status = 'processing'`,
    )
    .bind(provider, externalId)
    .run();
}

export async function failWebhookEvent(
  provider: string,
  externalId: string,
  error: string,
) {
  await ensureSchema();
  await d1()
    .prepare(
      `UPDATE webhook_events SET status = 'failed', lease_until = NULL,
       last_error = ? WHERE provider = ? AND external_id = ?`,
    )
    .bind(error.slice(0, 1000), provider, externalId)
    .run();
}

export async function recordRouteSnapshot(input: {
  leadId: string;
  url: string;
  contentHash: string;
  statusCode?: number;
  pageTitle?: string;
}) {
  await ensureSchema();
  const existing = await d1()
    .prepare(
      `SELECT content_hash, status_code FROM route_snapshots
       WHERE lead_id = ? AND url = ?`,
    )
    .bind(input.leadId, input.url)
    .first<{ content_hash: string; status_code: number | null }>();
  if (existing) {
    const changed =
      existing.content_hash !== input.contentHash ||
      existing.status_code !== (input.statusCode ?? null);
    await d1()
      .prepare(
        `UPDATE route_snapshots SET content_hash = ?, status_code = ?, page_title = ?,
         checked_at = datetime('now'),
         changed_at = CASE WHEN ? THEN datetime('now') ELSE changed_at END
         WHERE lead_id = ? AND url = ?`,
      )
      .bind(
        input.contentHash,
        input.statusCode ?? null,
        input.pageTitle ?? null,
        changed ? 1 : 0,
        input.leadId,
        input.url,
      )
      .run();
    return {
      tracked: true,
      baseline: false,
      changed,
      previousStatusCode: existing.status_code,
    };
  }
  const inserted = await d1()
    .prepare(
      `INSERT INTO route_snapshots (
        id, lead_id, url, content_hash, status_code, page_title
      ) SELECT ?, ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM route_snapshots WHERE lead_id = ?) < ?`,
    )
    .bind(
      crypto.randomUUID(),
      input.leadId,
      input.url,
      input.contentHash,
      input.statusCode ?? null,
      input.pageTitle ?? null,
      input.leadId,
      offer.watchRouteLimit,
    )
    .run();
  return {
    tracked: Boolean(inserted.meta.changes),
    baseline: Boolean(inserted.meta.changes),
    changed: false,
    previousStatusCode: null,
  };
}

export async function listRegressionWatchTargets() {
  await ensureSchema();
  const rows = await d1()
    .prepare(
      `SELECT leads.id AS lead_id, watch_routes.url AS url
       FROM leads
       INNER JOIN watch_routes ON watch_routes.lead_id = leads.id
       WHERE leads.paid_at IS NOT NULL
          AND leads.paid_at >= datetime('now', '-${offer.watchDays} days')
         AND leads.status IN ('paid', 'fulfilling', 'delivered')
       ORDER BY leads.paid_at ASC, watch_routes.created_at ASC`,
    )
    .all<{ lead_id: string; url: string }>();
  const grouped = new Map<string, string[]>();
  for (const row of rows.results)
    grouped.set(row.lead_id, [...(grouped.get(row.lead_id) ?? []), row.url]);
  return Array.from(grouped, ([leadId, routes]) => ({ leadId, routes }));
}

export async function listActiveSourcePlatformTargets(limit = 100) {
  await ensureSchema();
  const placeholders = activeSourcePlatformStatuses.map(() => '?').join(', ');
  const result = await d1()
    .prepare(
      `SELECT id AS lead_id, source_url AS url, status
       FROM leads
       WHERE contact_channel = 'source-platform'
         AND paid_at IS NULL
         AND status IN (${placeholders})
       ORDER BY updated_at ASC
       LIMIT ?`,
    )
    .bind(
      ...activeSourcePlatformStatuses,
      Math.max(1, Math.min(Math.floor(limit), 250)),
    )
    .all<{ lead_id: string; url: string; status: PipelineStatus }>();
  return result.results.map((row) => ({
    leadId: row.lead_id,
    url: row.url,
    status: row.status,
  }));
}

export async function listWatchRoutes() {
  await ensureSchema();
  const result = await d1()
    .prepare(
      'SELECT lead_id, url FROM watch_routes ORDER BY lead_id, created_at ASC',
    )
    .all<{ lead_id: string; url: string }>();
  return result.results;
}

export async function replaceWatchRoutes(leadId: string, routes: string[]) {
  await ensureSchema();
  const database = d1();
  const statements = [
    database.prepare('DELETE FROM watch_routes WHERE lead_id = ?').bind(leadId),
    ...routes.map((url) =>
      database
        .prepare('INSERT INTO watch_routes (id, lead_id, url) VALUES (?, ?, ?)')
        .bind(crypto.randomUUID(), leadId, url),
    ),
  ];
  if (routes.length) {
    const placeholders = routes.map(() => '?').join(', ');
    statements.push(
      database
        .prepare(
          `DELETE FROM route_snapshots
           WHERE lead_id = ? AND url NOT IN (${placeholders})`,
        )
        .bind(leadId, ...routes),
    );
  } else {
    statements.push(
      database
        .prepare('DELETE FROM route_snapshots WHERE lead_id = ?')
        .bind(leadId),
    );
  }
  await database.batch(statements);
}

export async function addFinding(input: {
  leadId: string;
  url: string;
  referringUrl?: string;
  title: string;
  severity: string;
  category: string;
  evidence: string;
  recommendation?: string;
  screenshotUrl?: string;
  statusCode?: number;
}) {
  await ensureSchema();
  const result = await d1()
    .prepare(
      `INSERT OR IGNORE INTO findings (
        id, lead_id, url, referring_url, title, severity, category, evidence, recommendation, screenshot_url, status_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.leadId,
      input.url,
      input.referringUrl ?? null,
      input.title,
      input.severity,
      input.category,
      input.evidence,
      input.recommendation ?? null,
      input.screenshotUrl ?? null,
      input.statusCode ?? null,
    )
    .run();
  return { created: Boolean(result.meta.changes) };
}

export async function deleteFinding(leadId: string, findingId: string) {
  await ensureSchema();
  const result = await d1()
    .prepare('DELETE FROM findings WHERE id = ? AND lead_id = ?')
    .bind(findingId, leadId)
    .run();
  return Boolean(result.meta.changes);
}

export async function listFindings(leadId: string) {
  await ensureSchema();
  const result = await d1()
    .prepare('SELECT * FROM findings WHERE lead_id = ? ORDER BY found_at DESC')
    .bind(leadId)
    .all<Record<string, unknown>>();
  return result.results;
}
