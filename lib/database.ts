import { env } from 'cloudflare:workers';

import { auditPageUpsertSql } from '@/lib/audit-coverage';
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
import { stripeRevenueOutcomeRank } from '@/lib/payments';

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    store_url TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_channel TEXT NOT NULL DEFAULT 'source-platform',
    contact_permission TEXT NOT NULL DEFAULT 'none',
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
  `CREATE TABLE IF NOT EXISTS intake_rate_limits (
    identifier TEXT PRIMARY KEY,
    window_started_at TEXT NOT NULL DEFAULT (datetime('now')),
    attempts INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_intake_rate_limits_updated ON intake_rate_limits(updated_at)`,
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
  `CREATE TABLE IF NOT EXISTS audit_pages (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status_code INTEGER,
    page_title TEXT,
    screenshot_url TEXT,
    captured_at TEXT,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_pages_lead_url ON audit_pages(lead_id, url)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_pages_lead_recorded ON audit_pages(lead_id, recorded_at)`,
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
    result_json TEXT,
    received_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_provider_external ON webhook_events(provider, external_id)`,
  `CREATE TABLE IF NOT EXISTS stripe_checkout_sessions (
    session_id TEXT PRIMARY KEY,
    outcome TEXT NOT NULL,
    outcome_rank INTEGER NOT NULL,
    event_created INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    lead_id TEXT,
    amount_total INTEGER,
    currency TEXT,
    payment_status TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_stripe_checkout_outcome ON stripe_checkout_sessions(outcome, updated_at)`,
  `CREATE TABLE IF NOT EXISTS cal_bookings (
    booking_uid TEXT PRIMARY KEY,
    attendee_email TEXT,
    status TEXT NOT NULL,
    lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
    last_event_id TEXT NOT NULL,
    last_event_type TEXT NOT NULL,
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cal_bookings_status_updated ON cal_bookings(status, updated_at)`,
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
    ['result_json', 'ALTER TABLE webhook_events ADD COLUMN result_json TEXT'],
  ] as const;
  for (const [name, statement] of additions)
    if (!existing.has(name)) await database.prepare(statement).run();
  const leadColumns = await database
    .prepare("PRAGMA table_info('leads')")
    .all<{ name: string }>();
  if (
    !leadColumns.results.some((column) => column.name === 'contact_permission')
  )
    await database
      .prepare(
        "ALTER TABLE leads ADD COLUMN contact_permission TEXT NOT NULL DEFAULT 'none'",
      )
      .run();
  await database
    .prepare(
      `UPDATE leads SET contact_permission = CASE
         WHEN contact_channel = 'direct-email' AND explicit_intent = 1
           THEN 'explicit-public-request'
         WHEN contact_channel = 'inbound' AND explicit_intent = 1
              AND last_reply_at IS NOT NULL
           THEN 'verified-inbound'
         ELSE contact_permission
       END
       WHERE contact_permission = 'none'`,
    )
    .run();
  await database
    .prepare(
      `UPDATE leads SET contact_channel = 'unverified-inbound',
       contact_permission = 'unverified-intake', explicit_intent = 0,
       status = 'discovered',
       next_action = 'Await email ownership confirmation or Cal booking; never contact from intake alone',
       updated_at = datetime('now')
       WHERE source_title = 'Website availability request'
         AND contact_channel = 'inbound'
         AND status = 'replied'
         AND last_contact_at IS NULL
         AND last_reply_at IS NULL`,
    )
    .run();
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
       WHERE (
           (leads.status = 'proposal_ready' AND leads.contact_channel = 'direct-email')
           OR (
             leads.status = 'replied'
             AND leads.contact_channel = 'inbound'
             AND leads.last_contact_at IS NULL
             AND (
               leads.next_action IS NULL
               OR leads.next_action = 'Review request and offer a fit call'
             )
           )
         )
         AND leads.explicit_intent = 1
         AND leads.contact_permission IN ('verified-inbound', 'explicit-public-request')
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

export async function recordCalBookingEvent(input: {
  bookingUid: string;
  eventId: string;
  eventType: string;
  attendeeEmail?: string;
  startsAt?: string;
  endsAt?: string;
}) {
  await ensureSchema();
  const database = d1();
  const attendeeEmail = input.attendeeEmail?.trim().toLowerCase() || null;
  const status =
    input.eventType === 'BOOKING_CANCELLED'
      ? 'cancelled'
      : ['BOOKING_CREATED', 'BOOKING_RESCHEDULED'].includes(input.eventType)
        ? 'booked'
        : 'ignored';
  const existingBooking = await database
    .prepare('SELECT lead_id FROM cal_bookings WHERE booking_uid = ?')
    .bind(input.bookingUid)
    .first<{ lead_id: string | null }>();

  let leadId = existingBooking?.lead_id ?? null;
  let matchedExistingLead = Boolean(leadId);
  let createdLead = false;
  let ambiguousMatches = 0;
  if (!leadId && attendeeEmail) {
    const candidates = await database
      .prepare(
        `SELECT id FROM leads
         WHERE lower(contact_email) = ?
           AND status NOT IN ('closed_lost', 'suppressed', 'delivered')
         ORDER BY updated_at DESC
         LIMIT 3`,
      )
      .bind(attendeeEmail)
      .all<{ id: string }>();
    ambiguousMatches = candidates.results.length;
    if (candidates.results.length === 1) {
      leadId = candidates.results[0].id;
      matchedExistingLead = true;
    }
  }

  if (!leadId && attendeeEmail && status === 'booked') {
    leadId = crypto.randomUUID();
    const emailDomain = attendeeEmail.split('@')[1] || 'calendar prospect';
    const inserted = await database
      .prepare(
        `INSERT INTO leads (
          id, company_name, contact_email, contact_channel, contact_permission,
          source_url, source_title, explicit_intent, fit_score, status,
          next_action, booked_at
        ) VALUES (?, ?, ?, 'cal-booking', 'scheduled-contact', ?,
          'Cal fit-call booking', 1, 100, 'booked',
          'Review the booking details and run the fit call', datetime('now'))
        ON CONFLICT(source_url) DO NOTHING`,
      )
      .bind(
        leadId,
        `Calendar prospect (${emailDomain})`,
        attendeeEmail,
        `cal-booking:${input.bookingUid}`,
      )
      .run();
    createdLead = Boolean(inserted.meta.changes);
    if (!createdLead) {
      const stored = await database
        .prepare('SELECT id FROM leads WHERE source_url = ?')
        .bind(`cal-booking:${input.bookingUid}`)
        .first<{ id: string }>();
      leadId = stored?.id ?? null;
    }
  }

  await database
    .prepare(
      `INSERT INTO cal_bookings (
        booking_uid, attendee_email, status, lead_id, last_event_id,
        last_event_type, starts_at, ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(booking_uid) DO UPDATE SET
        attendee_email = COALESCE(excluded.attendee_email, cal_bookings.attendee_email),
        status = excluded.status,
        lead_id = COALESCE(excluded.lead_id, cal_bookings.lead_id),
        last_event_id = excluded.last_event_id,
        last_event_type = excluded.last_event_type,
        starts_at = COALESCE(excluded.starts_at, cal_bookings.starts_at),
        ends_at = COALESCE(excluded.ends_at, cal_bookings.ends_at),
        updated_at = datetime('now')`,
    )
    .bind(
      input.bookingUid,
      attendeeEmail,
      status,
      leadId,
      input.eventId,
      input.eventType,
      input.startsAt ?? null,
      input.endsAt ?? null,
    )
    .run();

  if (leadId && status === 'booked') {
    await database
      .prepare(
        `UPDATE leads SET
          explicit_intent = 1,
          contact_permission = CASE
            WHEN contact_permission IN ('none', 'unverified-intake')
              THEN 'scheduled-contact'
            ELSE contact_permission
          END,
          status = CASE
            WHEN status IN ('discovered', 'qualified', 'proposal_ready', 'drafted', 'replied')
              THEN 'booked'
            ELSE status
          END,
          booked_at = COALESCE(booked_at, datetime('now')),
          next_action = CASE
            WHEN status IN ('discovered', 'qualified', 'proposal_ready', 'drafted', 'replied', 'booked')
              THEN 'Run the fit call and send the payment link after scope is confirmed'
            ELSE next_action
          END,
          updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(leadId)
      .run();
  } else if (leadId && status === 'cancelled') {
    await setLeadNextAction(
      leadId,
      'Booking cancelled; decide whether a response is appropriate',
      ['replied', 'booked'],
    );
  }

  return {
    bookingUid: input.bookingUid,
    status,
    leadId,
    matchedExistingLead,
    createdLead,
    ambiguousMatches,
  };
}

export async function listLeadsByEmail(email: string, limit = 10) {
  await ensureSchema();
  const result = await d1()
    .prepare(
      `SELECT * FROM leads
       WHERE lower(contact_email) = ?
       ORDER BY updated_at DESC
       LIMIT ?`,
    )
    .bind(email.trim().toLowerCase(), Math.max(1, Math.min(limit, 25)))
    .all<LeadRecord>();
  return result.results;
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
        contact_permission, source_url, source_title, explicit_intent, fit_score, status, next_action
      ) VALUES (?, ?, ?, ?, ?, 'unverified-inbound', 'unverified-intake', ?, 'Website availability request', 0, 100, 'discovered', 'Await email ownership confirmation or Cal booking; never contact from intake alone')
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

export async function consumePublicIntakeAttempt(
  identifier: string,
  maxAttempts = 5,
  windowMinutes = 60,
) {
  await ensureSchema();
  const safeLimit = Math.max(1, Math.min(Math.floor(maxAttempts), 100));
  const safeWindow = Math.max(1, Math.min(Math.floor(windowMinutes), 24 * 60));
  const cutoff = new Date(Date.now() - safeWindow * 60_000).toISOString();
  const database = d1();
  await database
    .prepare(
      `INSERT INTO intake_rate_limits (identifier, attempts)
       VALUES (?, 1)
       ON CONFLICT(identifier) DO UPDATE SET
         attempts = CASE
           WHEN datetime(intake_rate_limits.window_started_at) <= datetime(?) THEN 1
           ELSE intake_rate_limits.attempts + 1
         END,
         window_started_at = CASE
           WHEN datetime(intake_rate_limits.window_started_at) <= datetime(?) THEN datetime('now')
           ELSE intake_rate_limits.window_started_at
         END,
         updated_at = datetime('now')`,
    )
    .bind(identifier, cutoff, cutoff)
    .run();
  const current = await database
    .prepare(
      `SELECT attempts, window_started_at
       FROM intake_rate_limits WHERE identifier = ?`,
    )
    .bind(identifier)
    .first<{ attempts: number; window_started_at: string }>();
  await database
    .prepare(
      `DELETE FROM intake_rate_limits
       WHERE updated_at < datetime('now', '-2 days')`,
    )
    .run();
  const attempts = Number(current?.attempts ?? safeLimit + 1);
  return {
    allowed: attempts <= safeLimit,
    attempts,
    maxAttempts: safeLimit,
    retryAfterSeconds: attempts <= safeLimit ? 0 : safeWindow * 60,
  };
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
      `UPDATE leads SET company_name = ?, store_url = ?, contact_email = ?, contact_channel = ?,
       contact_permission = ?, proof_url = ?, proof_summary = ?, explicit_intent = 1, status = 'qualified',
       next_action = 'Review evidence and approve proposal', updated_at = datetime('now')
       WHERE id = ? AND status = 'discovered'`,
    )
    .bind(
      input.companyName,
      input.storeUrl,
      input.contactEmail?.toLowerCase() ?? null,
      input.contactChannel,
      input.contactChannel === 'direct-email'
        ? 'explicit-public-request'
        : 'none',
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
  let lead = await getLeadByEmail(email);
  const classification = classifyReply(`${input.subject ?? ''}\n${input.body}`);
  const verifiesWebsiteRequest =
    lead?.contact_channel === 'unverified-inbound' &&
    classification !== 'out_of_office';
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

  if (lead && verifiesWebsiteRequest) {
    await d1()
      .prepare(
        `UPDATE leads SET contact_channel = 'inbound',
         contact_permission = 'verified-inbound', explicit_intent = 1,
         status = 'replied', next_action = ?, last_reply_at = datetime('now'),
         updated_at = datetime('now')
         WHERE id = ? AND contact_channel = 'unverified-inbound'`,
      )
      .bind(`Reply classified: ${classification}`, lead.id)
      .run();
    lead = await getLead(lead.id);
  }

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
    } else if (verifiesWebsiteRequest) {
      await setLeadNextAction(lead.id, nextAction, ['replied']);
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
  if (
    !['direct-email', 'inbound'].includes(lead.contact_channel) ||
    !['verified-inbound', 'explicit-public-request'].includes(
      lead.contact_permission,
    )
  )
    throw new Error('Only consented email leads can record Gmail contact');
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
           WHEN status IN ('drafted', 'replied')
             AND (
               next_action IS NULL OR trim(next_action) = ''
               OR next_action = 'Review the Gmail draft and send only if channel rules allow'
               OR next_action = 'Review the consented inbound reply draft before sending'
               OR next_action = 'Review request and offer a fit call'
               OR next_action LIKE '[Outbound] %'
             )
             THEN ?
           ELSE next_action
         END,
         updated_at = datetime('now')
       WHERE id = ? AND contact_channel IN ('direct-email', 'inbound')
         AND (
           last_contact_at IS NULL OR datetime(last_contact_at) < datetime(?)
           OR (
             status IN ('drafted', 'replied')
             AND COALESCE(next_action, '') <> ?
             AND (
               next_action IS NULL OR trim(next_action) = ''
               OR next_action = 'Review the Gmail draft and send only if channel rules allow'
               OR next_action = 'Review the consented inbound reply draft before sending'
               OR next_action = 'Review request and offer a fit call'
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
        result_json = NULL,
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
  result?: Record<string, unknown>,
) {
  await ensureSchema();
  const resultJson = result ? JSON.stringify(result).slice(0, 4000) : null;
  await d1()
    .prepare(
      `UPDATE webhook_events SET status = 'processed', lease_until = NULL,
       processed_at = datetime('now'), last_error = NULL, result_json = ?
       WHERE provider = ? AND external_id = ? AND status = 'processing'`,
    )
    .bind(resultJson, provider, externalId)
    .run();
}

export async function listRecentStripeEvents(limit = 20) {
  await ensureSchema();
  const result = await d1()
    .prepare(
      `SELECT external_id, event_type, status, result_json, processed_at,
              last_error, received_at
       FROM webhook_events
       WHERE provider = 'stripe'
       ORDER BY received_at DESC
       LIMIT ?`,
    )
    .bind(Math.max(1, Math.min(Math.floor(limit), 50)))
    .all<{
      external_id: string;
      event_type: string;
      status: string;
      result_json: string | null;
      processed_at: string | null;
      last_error: string | null;
      received_at: string;
    }>();
  return result.results;
}

export type StoredStripeCheckoutOutcome = keyof typeof stripeRevenueOutcomeRank;

export async function recordStripeCheckoutOutcome(input: {
  sessionId: string;
  eventId: string;
  eventCreated: number;
  outcome: StoredStripeCheckoutOutcome;
  leadId?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  paymentStatus?: string | null;
}) {
  await ensureSchema();
  const database = d1();
  const write = await database
    .prepare(
      `INSERT INTO stripe_checkout_sessions (
         session_id, outcome, outcome_rank, event_created, event_id, lead_id,
         amount_total, currency, payment_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET
         outcome = excluded.outcome,
         outcome_rank = excluded.outcome_rank,
         event_created = excluded.event_created,
         event_id = excluded.event_id,
         lead_id = COALESCE(excluded.lead_id, stripe_checkout_sessions.lead_id),
         amount_total = excluded.amount_total,
         currency = excluded.currency,
         payment_status = excluded.payment_status,
         updated_at = datetime('now')
       WHERE excluded.outcome_rank > stripe_checkout_sessions.outcome_rank
          OR (
            excluded.outcome_rank = stripe_checkout_sessions.outcome_rank
            AND excluded.event_created >= stripe_checkout_sessions.event_created
          )`,
    )
    .bind(
      input.sessionId,
      input.outcome,
      stripeRevenueOutcomeRank[input.outcome],
      input.eventCreated,
      input.eventId,
      input.leadId ?? null,
      input.amountTotal ?? null,
      input.currency?.toLowerCase() ?? null,
      input.paymentStatus ?? null,
    )
    .run();
  const current = await database
    .prepare(
      `SELECT outcome, event_id, lead_id, event_created
       FROM stripe_checkout_sessions WHERE session_id = ?`,
    )
    .bind(input.sessionId)
    .first<{
      outcome: StoredStripeCheckoutOutcome;
      event_id: string;
      lead_id: string | null;
      event_created: number;
    }>();
  if (!current) throw new Error('Stripe checkout outcome was not stored');
  return {
    applied: Boolean(write.meta.changes),
    outcome: current.outcome,
    eventId: current.event_id,
    leadId: current.lead_id,
    eventCreated: current.event_created,
  };
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

export type AuditPageInput = {
  leadId: string;
  url: string;
  statusCode?: number;
  pageTitle?: string;
  screenshotUrl?: string;
  capturedAt?: string;
};

function auditPageUpsert(database: D1Database, input: AuditPageInput) {
  return database
    .prepare(auditPageUpsertSql)
    .bind(
      crypto.randomUUID(),
      input.leadId,
      input.url,
      input.statusCode ?? null,
      input.pageTitle?.trim() || null,
      input.screenshotUrl ?? null,
      input.capturedAt ?? null,
    );
}

export async function recordAuditPages(inputs: AuditPageInput[]) {
  if (!inputs.length) return { processed: 0 };
  await ensureSchema();
  const database = d1();
  const chunkSize = 50;
  for (let index = 0; index < inputs.length; index += chunkSize) {
    await database.batch(
      inputs
        .slice(index, index + chunkSize)
        .map((input) => auditPageUpsert(database, input)),
    );
  }
  return { processed: inputs.length };
}

export async function recordAuditPage(input: AuditPageInput) {
  const result = await recordAuditPages([input]);
  return { recorded: result.processed === 1 };
}

export async function listAuditPages(leadId: string) {
  await ensureSchema();
  const result = await d1()
    .prepare(
      `SELECT * FROM audit_pages
       WHERE lead_id = ?
       ORDER BY url ASC`,
    )
    .bind(leadId)
    .all<Record<string, unknown>>();
  return result.results;
}
