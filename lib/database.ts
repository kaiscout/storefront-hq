import { env } from 'cloudflare:workers';

import { auditPageUpsertSql } from '@/lib/audit-coverage';
import { calBookingStatus, type CalBookingEventType } from '@/lib/cal';
import {
  canTransition,
  classifyReply,
  extractAuthoredReply,
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
import { parseWebsiteConfirmationSubject } from '@/lib/intake';
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
    thread_id TEXT,
    direction TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    body_excerpt TEXT,
    classification TEXT,
    reply_claim_token TEXT,
    reply_claim_until TEXT,
    replied_at TEXT,
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
  `CREATE TABLE IF NOT EXISTS commerce_orders (
    session_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    outcome TEXT NOT NULL,
    outcome_rank INTEGER NOT NULL,
    event_created INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    lead_id TEXT,
    customer_email TEXT,
    amount_total INTEGER,
    currency TEXT,
    payment_status TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_commerce_orders_outcome ON commerce_orders(outcome, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_commerce_orders_email ON commerce_orders(customer_email, updated_at)`,
  `CREATE TABLE IF NOT EXISTS cal_bookings (
    booking_uid TEXT PRIMARY KEY,
    attendee_email TEXT,
    status TEXT NOT NULL,
    lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
    last_event_id TEXT NOT NULL,
    last_event_type TEXT NOT NULL,
    last_event_created INTEGER NOT NULL DEFAULT 0,
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
  const messageColumns = await database
    .prepare("PRAGMA table_info('messages')")
    .all<{ name: string }>();
  if (!messageColumns.results.some((column) => column.name === 'thread_id'))
    await database
      .prepare('ALTER TABLE messages ADD COLUMN thread_id TEXT')
      .run();
  const messageAdditions = [
    [
      'reply_claim_token',
      'ALTER TABLE messages ADD COLUMN reply_claim_token TEXT',
    ],
    [
      'reply_claim_until',
      'ALTER TABLE messages ADD COLUMN reply_claim_until TEXT',
    ],
    ['replied_at', 'ALTER TABLE messages ADD COLUMN replied_at TEXT'],
  ] as const;
  const existingMessageColumns = new Set(
    messageColumns.results.map((column) => column.name),
  );
  for (const [name, statement] of messageAdditions)
    if (!existingMessageColumns.has(name))
      await database.prepare(statement).run();
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
  const calBookingColumns = await database
    .prepare("PRAGMA table_info('cal_bookings')")
    .all<{ name: string }>();
  if (
    !calBookingColumns.results.some(
      (column) => column.name === 'last_event_created',
    )
  )
    await database
      .prepare(
        'ALTER TABLE cal_bookings ADD COLUMN last_event_created INTEGER NOT NULL DEFAULT 0',
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
      `SELECT leads.*,
         (
           SELECT messages.subject FROM messages
           WHERE messages.lead_id = leads.id AND messages.direction = 'inbound'
           ORDER BY julianday(messages.created_at) DESC, messages.rowid DESC LIMIT 1
         ) AS latest_message_subject,
         (
           SELECT messages.body_excerpt FROM messages
           WHERE messages.lead_id = leads.id AND messages.direction = 'inbound'
           ORDER BY julianday(messages.created_at) DESC, messages.rowid DESC LIMIT 1
         ) AS latest_message_excerpt,
         (
           SELECT messages.classification FROM messages
           WHERE messages.lead_id = leads.id AND messages.direction = 'inbound'
           ORDER BY julianday(messages.created_at) DESC, messages.rowid DESC LIMIT 1
         ) AS latest_message_classification,
         (
           SELECT messages.external_id FROM messages
           WHERE messages.lead_id = leads.id AND messages.direction = 'inbound'
           ORDER BY julianday(messages.created_at) DESC, messages.rowid DESC LIMIT 1
         ) AS latest_message_external_id,
         (
           SELECT messages.thread_id FROM messages
           WHERE messages.lead_id = leads.id AND messages.direction = 'inbound'
           ORDER BY julianday(messages.created_at) DESC, messages.rowid DESC LIMIT 1
         ) AS latest_message_thread_id,
         (
           SELECT messages.created_at FROM messages
           WHERE messages.lead_id = leads.id AND messages.direction = 'inbound'
           ORDER BY julianday(messages.created_at) DESC, messages.rowid DESC LIMIT 1
         ) AS latest_message_created_at,
         EXISTS (
           SELECT 1 FROM cal_bookings
           WHERE cal_bookings.lead_id = leads.id
             AND cal_bookings.status = 'booked'
             AND cal_bookings.starts_at IS NOT NULL
             AND julianday(COALESCE(cal_bookings.ends_at, cal_bookings.starts_at)) > julianday('now')
         ) AS has_active_booking
       FROM leads
       WHERE (
           (leads.status = 'proposal_ready' AND leads.contact_channel = 'direct-email')
           OR (
             leads.status IN ('replied', 'booked')
             AND leads.contact_channel IN ('inbound', 'direct-email')
             AND leads.last_reply_at IS NOT NULL
             AND (
               leads.last_contact_at IS NULL
               OR julianday(leads.last_reply_at) > julianday(leads.last_contact_at)
             )
           )
         )
         AND leads.explicit_intent = 1
         AND leads.contact_permission IN ('verified-inbound', 'explicit-public-request')
         AND leads.contact_email IS NOT NULL
         AND COALESCE((
           SELECT messages.classification FROM messages
           WHERE messages.lead_id = leads.id AND messages.direction = 'inbound'
           ORDER BY julianday(messages.created_at) DESC, messages.rowid DESC LIMIT 1
         ), '') <> 'out_of_office'
         AND NOT EXISTS (
           SELECT 1 FROM suppression
           WHERE lower(suppression.identifier) = lower(leads.contact_email)
         )
       ORDER BY leads.updated_at ASC
       LIMIT ?`,
    )
    .bind(Math.min(limit, 250))
    .all<
      LeadRecord & {
        latest_message_subject: string | null;
        latest_message_excerpt: string | null;
        latest_message_classification: string | null;
        latest_message_external_id: string | null;
        latest_message_thread_id: string | null;
        latest_message_created_at: string | null;
        has_active_booking: number;
      }
    >();
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

async function resolveGmailMessageLead(
  database: ReturnType<typeof d1>,
  email: string,
  threadId?: string,
) {
  if (threadId) {
    const mapped = await database
      .prepare(
        `SELECT leads.* FROM messages
         INNER JOIN leads ON leads.id = messages.lead_id
         WHERE messages.thread_id = ? OR messages.external_id = ?
         GROUP BY leads.id
         ORDER BY MIN(CASE WHEN messages.thread_id = ? THEN 0 ELSE 1 END)
         LIMIT 2`,
      )
      .bind(threadId, `gmail-thread:${threadId}`, threadId)
      .all<LeadRecord>();
    if (mapped.results.length === 1)
      return mapped.results[0].contact_email?.trim().toLowerCase() === email
        ? { lead: mapped.results[0], resolution: 'thread' as const }
        : { lead: null, resolution: 'thread-email-mismatch' as const };
    if (mapped.results.length > 1)
      return { lead: null, resolution: 'ambiguous-thread' as const };
  }
  const candidates = await database
    .prepare(
      `SELECT * FROM leads
       WHERE lower(contact_email) = ?
       ORDER BY updated_at DESC
       LIMIT 2`,
    )
    .bind(email)
    .all<LeadRecord>();
  if (candidates.results.length === 1)
    return { lead: candidates.results[0], resolution: 'unique-email' as const };
  return {
    lead: null,
    resolution:
      candidates.results.length > 1
        ? ('ambiguous-email' as const)
        : ('unmatched-email' as const),
  };
}

export async function recordCalBookingEvent(input: {
  bookingUid: string;
  eventId: string;
  eventType: CalBookingEventType;
  eventCreated: number;
  rescheduleUid?: string;
  attendeeEmail?: string;
  startsAt?: string;
  endsAt?: string;
}) {
  await ensureSchema();
  const database = d1();
  const attendeeEmail = input.attendeeEmail?.trim().toLowerCase() || null;
  const incomingStatus = calBookingStatus(input.eventType);
  const rescheduledFromUid =
    input.eventType === 'BOOKING_RESCHEDULED' &&
    input.rescheduleUid &&
    input.rescheduleUid !== input.bookingUid
      ? input.rescheduleUid
      : null;
  const rescheduledFromBooking = rescheduledFromUid
    ? await database
        .prepare(
          `SELECT lead_id FROM cal_bookings
           WHERE booking_uid = ?`,
        )
        .bind(rescheduledFromUid)
        .first<{ lead_id: string | null }>()
    : null;
  if (rescheduledFromUid && rescheduledFromBooking?.lead_id) {
    const targetLineage = await database
      .prepare('SELECT lead_id FROM cal_bookings WHERE booking_uid = ?')
      .bind(input.bookingUid)
      .first<{ lead_id: string | null }>();
    if (
      targetLineage?.lead_id &&
      targetLineage.lead_id !== rescheduledFromBooking.lead_id
    )
      throw new Error(
        `Cal reschedule lineage conflict between ${rescheduledFromUid} and ${input.bookingUid}`,
      );
  }
  let previousBookingUpdated = false;
  if (rescheduledFromUid) {
    const previousWrite = await database
      .prepare(
        `INSERT INTO cal_bookings (
           booking_uid, attendee_email, status, lead_id, last_event_id,
           last_event_type, last_event_created
         ) VALUES (?, ?, 'rescheduled', ?, ?, 'BOOKING_RESCHEDULED_OUT', ?)
         ON CONFLICT(booking_uid) DO UPDATE SET
           attendee_email = COALESCE(cal_bookings.attendee_email, excluded.attendee_email),
           status = excluded.status,
           lead_id = COALESCE(cal_bookings.lead_id, excluded.lead_id),
           last_event_id = excluded.last_event_id,
           last_event_type = excluded.last_event_type,
           last_event_created = excluded.last_event_created,
           updated_at = datetime('now')
         WHERE excluded.last_event_created > cal_bookings.last_event_created
            OR (
              excluded.last_event_created = cal_bookings.last_event_created
              AND CASE cal_bookings.last_event_type
                WHEN 'BOOKING_CANCELLED' THEN 4
                WHEN 'BOOKING_RESCHEDULED_OUT' THEN 3
                WHEN 'BOOKING_RESCHEDULED' THEN 2
                ELSE 1
              END < 3
            )`,
      )
      .bind(
        rescheduledFromUid,
        attendeeEmail,
        rescheduledFromBooking?.lead_id ?? null,
        input.eventId,
        input.eventCreated,
      )
      .run();
    previousBookingUpdated = Boolean(previousWrite.meta.changes);
  }
  const existingBooking = await database
    .prepare(
      `SELECT lead_id, status, last_event_id, last_event_type, last_event_created
       FROM cal_bookings WHERE booking_uid = ?`,
    )
    .bind(input.bookingUid)
    .first<{
      lead_id: string | null;
      status: string;
      last_event_id: string;
      last_event_type: string;
      last_event_created: number;
    }>();

  const write = await database
    .prepare(
      `INSERT INTO cal_bookings (
        booking_uid, attendee_email, status, lead_id, last_event_id,
        last_event_type, last_event_created, starts_at, ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(booking_uid) DO UPDATE SET
        attendee_email = COALESCE(excluded.attendee_email, cal_bookings.attendee_email),
        status = excluded.status,
        lead_id = COALESCE(cal_bookings.lead_id, excluded.lead_id),
        last_event_id = excluded.last_event_id,
        last_event_type = excluded.last_event_type,
        last_event_created = excluded.last_event_created,
        starts_at = COALESCE(excluded.starts_at, cal_bookings.starts_at),
        ends_at = COALESCE(excluded.ends_at, cal_bookings.ends_at),
        updated_at = datetime('now')
      WHERE excluded.last_event_created > cal_bookings.last_event_created
         OR (
           excluded.last_event_created = cal_bookings.last_event_created
           AND CASE excluded.last_event_type
             WHEN 'BOOKING_CANCELLED' THEN 4
             WHEN 'BOOKING_RESCHEDULED_OUT' THEN 3
             WHEN 'BOOKING_RESCHEDULED' THEN 2
             ELSE 1
           END > CASE cal_bookings.last_event_type
             WHEN 'BOOKING_CANCELLED' THEN 4
             WHEN 'BOOKING_RESCHEDULED_OUT' THEN 3
             WHEN 'BOOKING_RESCHEDULED' THEN 2
             ELSE 1
           END
         )`,
    )
    .bind(
      input.bookingUid,
      attendeeEmail,
      incomingStatus,
      existingBooking?.lead_id ?? rescheduledFromBooking?.lead_id ?? null,
      input.eventId,
      input.eventType,
      input.eventCreated,
      input.startsAt ?? null,
      input.endsAt ?? null,
    )
    .run();
  let recoveryBooking: {
    status: string;
    lead_id: string | null;
    last_event_id: string;
    last_event_type: string;
    last_event_created: number;
  } | null = null;
  if (!write.meta.changes) {
    let current = await database
      .prepare(
        `SELECT status, lead_id, last_event_id, last_event_type,
                last_event_created
         FROM cal_bookings WHERE booking_uid = ?`,
      )
      .bind(input.bookingUid)
      .first<{
        status: string;
        lead_id: string | null;
        last_event_id: string;
        last_event_type: string;
        last_event_created: number;
      }>();
    if (current && !current.lead_id && rescheduledFromBooking?.lead_id) {
      const lineage = await database
        .prepare(
          `UPDATE cal_bookings SET lead_id = ?, updated_at = datetime('now')
           WHERE booking_uid = ? AND last_event_id = ? AND lead_id IS NULL`,
        )
        .bind(
          rescheduledFromBooking.lead_id,
          input.bookingUid,
          current.last_event_id,
        )
        .run();
      if (lineage.meta.changes)
        current = { ...current, lead_id: rescheduledFromBooking.lead_id };
    }
    if (current?.last_event_id === input.eventId) {
      recoveryBooking = current;
    } else {
      if (current?.lead_id && current.status === 'cancelled')
        await database
          .prepare(
            `UPDATE leads SET
             status = CASE WHEN status = 'booked' THEN 'replied' ELSE status END,
             next_action = 'Booking cancelled; decide whether a response is appropriate',
             updated_at = datetime('now')
           WHERE id = ? AND status IN ('replied', 'booked')
             AND EXISTS (
               SELECT 1 FROM cal_bookings
               WHERE booking_uid = ? AND last_event_id = ? AND status = 'cancelled'
             )
             AND NOT EXISTS (
               SELECT 1 FROM cal_bookings AS other_booking
               WHERE other_booking.lead_id = leads.id
                 AND other_booking.status = 'booked'
                 AND other_booking.booking_uid <> ?
             )`,
          )
          .bind(
            current.lead_id,
            input.bookingUid,
            current.last_event_id,
            input.bookingUid,
          )
          .run();
      return {
        bookingUid: input.bookingUid,
        status: current?.status ?? incomingStatus,
        leadId: current?.lead_id ?? null,
        eventId: current?.last_event_id ?? null,
        eventType: current?.last_event_type ?? null,
        eventCreated: current?.last_event_created ?? null,
        applied: false,
        superseded: true,
        matchedExistingLead: Boolean(current?.lead_id),
        createdLead: false,
        ambiguousMatches: 0,
        rescheduledFromUid,
        previousBookingUpdated,
      };
    }
  }

  let leadId =
    recoveryBooking?.lead_id ??
    existingBooking?.lead_id ??
    rescheduledFromBooking?.lead_id ??
    null;
  let matchedExistingLead = Boolean(leadId);
  let createdLead = false;
  let ambiguousMatches = 0;
  if (!leadId && attendeeEmail) {
    const candidates = await database
      .prepare(
        `SELECT id FROM leads
         WHERE lower(contact_email) = ?
           AND status IN ('discovered', 'qualified', 'proposal_ready', 'drafted', 'replied', 'booked')
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

  if (!leadId && attendeeEmail && incomingStatus === 'booked') {
    leadId = crypto.randomUUID();
    const emailDomain = attendeeEmail.split('@')[1] || 'calendar prospect';
    const inserted = await database
      .prepare(
        `INSERT INTO leads (
          id, company_name, contact_email, contact_channel, contact_permission,
          source_url, source_title, explicit_intent, fit_score, status,
          next_action, booked_at
        ) SELECT ?, ?, ?, 'cal-booking', 'scheduled-contact', ?,
          'Cal fit-call booking', 1, 100, 'booked',
          'Review the booking details and run the fit call', datetime('now')
        FROM cal_bookings
        WHERE booking_uid = ? AND last_event_id = ? AND status = 'booked'
        ON CONFLICT(source_url) DO NOTHING`,
      )
      .bind(
        leadId,
        `Calendar prospect (${emailDomain})`,
        attendeeEmail,
        `cal-booking:${input.bookingUid}`,
        input.bookingUid,
        input.eventId,
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

  if (leadId)
    await database
      .prepare(
        `UPDATE cal_bookings SET lead_id = COALESCE(lead_id, ?)
         WHERE booking_uid = ? AND last_event_id = ?`,
      )
      .bind(leadId, input.bookingUid, input.eventId)
      .run();
  if (leadId && rescheduledFromUid)
    await database
      .prepare(
        `UPDATE cal_bookings SET lead_id = COALESCE(lead_id, ?)
         WHERE booking_uid = ? AND last_event_id = ?
           AND last_event_type = 'BOOKING_RESCHEDULED_OUT'`,
      )
      .bind(leadId, rescheduledFromUid, input.eventId)
      .run();

  const currentBooking = await database
    .prepare(
      `SELECT status, lead_id, last_event_id, last_event_type, last_event_created
       FROM cal_bookings WHERE booking_uid = ?`,
    )
    .bind(input.bookingUid)
    .first<{
      status: string;
      lead_id: string | null;
      last_event_id: string;
      last_event_type: string;
      last_event_created: number;
    }>();
  if (!currentBooking || currentBooking.last_event_id !== input.eventId) {
    if (createdLead && leadId) {
      const rollback = await database
        .prepare(
          `DELETE FROM leads
             WHERE id = ? AND source_url = ?
               AND NOT EXISTS (
                 SELECT 1 FROM cal_bookings WHERE cal_bookings.lead_id = leads.id
               )
               AND NOT EXISTS (
                 SELECT 1 FROM messages WHERE messages.lead_id = leads.id
               )`,
        )
        .bind(leadId, `cal-booking:${input.bookingUid}`)
        .run();
      if (rollback.meta.changes) createdLead = false;
    }
    return {
      bookingUid: input.bookingUid,
      status: currentBooking?.status ?? incomingStatus,
      leadId: currentBooking?.lead_id ?? null,
      eventId: currentBooking?.last_event_id ?? null,
      eventType: currentBooking?.last_event_type ?? null,
      eventCreated: currentBooking?.last_event_created ?? null,
      applied: false,
      superseded: true,
      matchedExistingLead: Boolean(currentBooking?.lead_id),
      createdLead,
      ambiguousMatches,
      rescheduledFromUid,
      previousBookingUpdated,
    };
  }

  leadId = currentBooking.lead_id;
  if (leadId && incomingStatus === 'booked') {
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
          WHERE id = ?
            AND EXISTS (
              SELECT 1 FROM cal_bookings
              WHERE booking_uid = ? AND last_event_id = ? AND status = 'booked'
            )`,
      )
      .bind(leadId, input.bookingUid, input.eventId)
      .run();
  } else if (leadId && incomingStatus === 'cancelled') {
    await database
      .prepare(
        `UPDATE leads SET
           status = CASE WHEN status = 'booked' THEN 'replied' ELSE status END,
           next_action = 'Booking cancelled; decide whether a response is appropriate',
           updated_at = datetime('now')
         WHERE id = ? AND status IN ('replied', 'booked')
           AND EXISTS (
             SELECT 1 FROM cal_bookings
             WHERE booking_uid = ? AND last_event_id = ? AND status = 'cancelled'
           )
           AND NOT EXISTS (
             SELECT 1 FROM cal_bookings AS other_booking
             WHERE other_booking.lead_id = leads.id
               AND other_booking.status = 'booked'
               AND other_booking.booking_uid <> ?
           )`,
      )
      .bind(leadId, input.bookingUid, input.eventId, input.bookingUid)
      .run();
  }

  const finalBooking = await database
    .prepare(
      `SELECT status, lead_id, last_event_id, last_event_type, last_event_created
       FROM cal_bookings WHERE booking_uid = ?`,
    )
    .bind(input.bookingUid)
    .first<{
      status: string;
      lead_id: string | null;
      last_event_id: string;
      last_event_type: string;
      last_event_created: number;
    }>();
  const stillCurrent = finalBooking?.last_event_id === input.eventId;

  return {
    bookingUid: input.bookingUid,
    status: finalBooking?.status ?? currentBooking.status,
    leadId: finalBooking?.lead_id ?? leadId,
    eventId: finalBooking?.last_event_id ?? currentBooking.last_event_id,
    eventType: finalBooking?.last_event_type ?? currentBooking.last_event_type,
    eventCreated:
      finalBooking?.last_event_created ?? currentBooking.last_event_created,
    applied: stillCurrent,
    superseded: !stillCurrent,
    matchedExistingLead,
    createdLead,
    ambiguousMatches,
    rescheduledFromUid,
    previousBookingUpdated,
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
  productId?: string;
  problem?: string;
}) {
  await ensureSchema();
  const id = crypto.randomUUID();
  await d1()
    .prepare(
      `INSERT INTO leads (
        id, company_name, store_url, contact_name, contact_email, contact_channel,
        contact_permission, source_url, source_title, source_excerpt, explicit_intent, fit_score, status, next_action
      ) VALUES (?, ?, ?, ?, ?, 'unverified-inbound', 'unverified-intake', ?, ?, ?, 1, 100, 'discovered', 'Review product fit; await email ownership confirmation or Cal booking; never contact from intake alone')
      ON CONFLICT(source_url) DO NOTHING`,
    )
    .bind(
      id,
      input.companyName,
      input.storeUrl,
      input.contactName,
      input.contactEmail.toLowerCase(),
      input.sourceUrl,
      `Website product enquiry: ${input.productId ?? 'unspecified'}`,
      input.problem?.slice(0, 1800) ?? null,
    )
    .run();
  const stored = await d1()
    .prepare('SELECT id FROM leads WHERE source_url = ?')
    .bind(input.sourceUrl)
    .first<{ id: string }>();
  if (!stored) throw new Error('Inbound request could not be stored');
  return stored.id;
}

export async function confirmWebsiteIntakeFromGmail(input: {
  externalId: string;
  threadId?: string;
  from: string;
  subject: string;
  body: string;
  receivedAt?: string;
}) {
  await ensureSchema();
  const receivedAt = new Date(input.receivedAt ?? Date.now());
  if (!Number.isFinite(receivedAt.getTime()))
    throw new Error('Invalid Gmail received time');
  const receivedAtIso = receivedAt.toISOString();
  const leadId = parseWebsiteConfirmationSubject(input.subject);
  if (!leadId)
    return { accepted: false, leadId: null, reason: 'invalid-subject' };
  const database = d1();
  const sender = input.from.trim().toLowerCase();
  const authoredBody = extractAuthoredReply(input.body);
  const classification = classifyReply(authoredBody);
  if (classification === 'unsubscribe') {
    await database
      .prepare(
        `INSERT OR IGNORE INTO suppression (id, identifier, reason)
         VALUES (?, ?, 'recipient objection')`,
      )
      .bind(crypto.randomUUID(), sender)
      .run();
    await database
      .prepare(
        `UPDATE leads SET
           status = CASE
             WHEN status IN ('discovered', 'qualified', 'proposal_ready', 'drafted', 'replied', 'booked')
               THEN 'suppressed'
             ELSE status
           END,
           next_action = CASE
             WHEN status IN ('discovered', 'qualified', 'proposal_ready', 'drafted', 'replied', 'booked')
               THEN 'Reply classified: unsubscribe'
             WHEN status IN ('paid', 'fulfilling', 'delivered')
               THEN 'Marketing suppression recorded; active delivery stage preserved'
             ELSE next_action
           END,
           updated_at = datetime('now')
         WHERE lower(contact_email) = ?`,
      )
      .bind(sender)
      .run();
    await database
      .prepare(
        `UPDATE messages SET
           reply_claim_token = NULL,
           reply_claim_until = NULL
         WHERE replied_at IS NULL
           AND lead_id IN (
             SELECT id FROM leads WHERE lower(contact_email) = ?
           )`,
      )
      .bind(sender)
      .run();
    return {
      accepted: false,
      leadId: null,
      reason: 'unsubscribe',
      suppressed: true,
    };
  }
  if (classification === 'out_of_office' || classification === 'not_interested')
    return {
      accepted: false,
      leadId: null,
      reason: `contradictory-${classification}`,
    };
  const existingMessage = await database
    .prepare('SELECT lead_id FROM messages WHERE external_id = ? LIMIT 1')
    .bind(input.externalId)
    .first<{ lead_id: string | null }>();
  if (existingMessage && existingMessage.lead_id !== leadId)
    return { accepted: false, leadId: null, reason: 'message-id-conflict' };

  const lead = await database
    .prepare(
      `SELECT id, contact_channel, contact_permission FROM leads
       WHERE id = ?
         AND source_title = 'Website availability request'
         AND lower(contact_email) = ?
       LIMIT 1`,
    )
    .bind(leadId, sender)
    .first<{
      id: string;
      contact_channel: string;
      contact_permission: string;
    }>();
  if (!lead)
    return { accepted: false, leadId: null, reason: 'intake-not-eligible' };

  const alreadyVerified =
    lead.contact_channel === 'inbound' &&
    lead.contact_permission === 'verified-inbound';
  if (!alreadyVerified) {
    if (
      lead.contact_channel !== 'unverified-inbound' ||
      lead.contact_permission !== 'unverified-intake'
    )
      return { accepted: false, leadId: null, reason: 'intake-not-eligible' };
    const promoted = await database
      .prepare(
        `UPDATE leads SET
           contact_channel = 'inbound',
           contact_permission = 'verified-inbound',
           explicit_intent = 1,
           status = 'replied',
           next_action = 'Review the consented request and prepare a tailored response',
           last_reply_at = ?,
           updated_at = datetime('now')
         WHERE id = ?
           AND source_title = 'Website availability request'
           AND contact_channel = 'unverified-inbound'
           AND contact_permission = 'unverified-intake'
           AND lower(contact_email) = ?`,
      )
      .bind(receivedAtIso, leadId, sender)
      .run();
    if (!promoted.meta.changes)
      return { accepted: false, leadId: null, reason: 'intake-changed' };
  }

  const inserted = await database
    .prepare(
      `INSERT OR IGNORE INTO messages (
         id, lead_id, external_id, thread_id, direction, channel, subject,
         body_excerpt, classification, created_at
       ) VALUES (?, ?, ?, ?, 'inbound', 'gmail', ?, ?, 'website_confirmation', ?)`,
    )
    .bind(
      crypto.randomUUID(),
      leadId,
      input.externalId,
      input.threadId ?? null,
      input.subject,
      authoredBody.slice(0, 2000),
      receivedAtIso,
    )
    .run();
  if (!inserted.meta.changes) {
    const stored = await database
      .prepare('SELECT lead_id FROM messages WHERE external_id = ? LIMIT 1')
      .bind(input.externalId)
      .first<{ lead_id: string | null }>();
    if (stored?.lead_id !== leadId)
      throw new Error('Gmail confirmation message identity conflicted');
  }
  let stale = false;
  if (alreadyVerified) {
    const refreshed = await database
      .prepare(
        `UPDATE leads SET
           explicit_intent = 1,
           status = CASE WHEN status = 'closed_lost' THEN 'replied' ELSE status END,
           next_action = CASE
             WHEN status = 'suppressed'
               THEN '[Consent review] New explicit request from a suppressed address; human review required'
             WHEN status IN ('paid', 'fulfilling', 'delivered')
               THEN '[Inbound] New explicit request received; confirm whether this is current-work support or a new sprint'
             WHEN status = 'booked'
               THEN '[Inbound] New confirmation received; review before the scheduled fit call'
             ELSE 'Review the consented repeat request and prepare a tailored response'
           END,
           last_reply_at = ?,
           updated_at = datetime('now')
         WHERE id = ?
           AND (
             last_reply_at IS NULL
             OR julianday(last_reply_at) < julianday(?)
           )`,
      )
      .bind(receivedAtIso, leadId, receivedAtIso)
      .run();
    stale = !refreshed.meta.changes;
  }
  return {
    accepted: true,
    leadId,
    duplicate: !inserted.meta.changes,
    stale,
  };
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
  threadId?: string;
  from: string;
  subject?: string;
  body: string;
  receivedAt?: string;
}) {
  await ensureSchema();
  const receivedAt = new Date(input.receivedAt ?? Date.now());
  if (!Number.isFinite(receivedAt.getTime()))
    throw new Error('Invalid Gmail received time');
  const receivedAtIso = receivedAt.toISOString();
  const email = input.from.trim().toLowerCase();
  const database = d1();
  const leadResolution = await resolveGmailMessageLead(
    database,
    email,
    input.threadId,
  );
  const lead = leadResolution.lead;
  const authoredBody = extractAuthoredReply(input.body);
  const classification = classifyReply(authoredBody);
  let suppressedLeads = 0;
  if (classification === 'unsubscribe') {
    await database
      .prepare(
        `INSERT OR IGNORE INTO suppression (id, identifier, reason)
         VALUES (?, ?, 'recipient objection')`,
      )
      .bind(crypto.randomUUID(), email)
      .run();
    const suppressed = await database
      .prepare(
        `UPDATE leads SET
           status = CASE
             WHEN status IN ('discovered', 'qualified', 'proposal_ready', 'drafted', 'replied', 'booked')
               THEN 'suppressed'
             ELSE status
           END,
           next_action = CASE
             WHEN status IN ('discovered', 'qualified', 'proposal_ready', 'drafted', 'replied', 'booked')
               THEN 'Reply classified: unsubscribe'
             WHEN status IN ('paid', 'fulfilling', 'delivered')
               THEN 'Marketing suppression recorded; active delivery stage preserved'
             ELSE next_action
           END,
           last_reply_at = CASE
             WHEN last_reply_at IS NULL OR julianday(last_reply_at) < julianday(?)
               THEN ?
             ELSE last_reply_at
           END,
           updated_at = datetime('now')
         WHERE lower(contact_email) = ?`,
      )
      .bind(receivedAtIso, receivedAtIso, email)
      .run();
    suppressedLeads = Number(suppressed.meta.changes ?? 0);
    await database
      .prepare(
        `UPDATE messages SET
           reply_claim_token = NULL,
           reply_claim_until = NULL
         WHERE replied_at IS NULL
           AND lead_id IN (
             SELECT id FROM leads WHERE lower(contact_email) = ?
           )`,
      )
      .bind(email)
      .run();
  }
  if (!lead)
    return {
      leadId: null,
      classification,
      ignored: true,
      resolution: leadResolution.resolution,
      suppressed: classification === 'unsubscribe',
      suppressedLeads,
    };
  const inserted = await database
    .prepare(
      `INSERT OR IGNORE INTO messages (
        id, lead_id, external_id, thread_id, direction, channel, subject,
        body_excerpt, classification, created_at
      ) VALUES (?, ?, ?, ?, 'inbound', 'gmail', ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      lead?.id ?? null,
      input.externalId,
      input.threadId ?? null,
      input.subject?.slice(0, 300) ?? null,
      authoredBody.slice(0, 2000),
      classification,
      receivedAtIso,
    )
    .run();
  const duplicate = !inserted.meta.changes;
  if (duplicate) {
    const stored = await database
      .prepare(
        `SELECT lead_id, classification FROM messages
         WHERE external_id = ? LIMIT 1`,
      )
      .bind(input.externalId)
      .first<{ lead_id: string | null; classification: string | null }>();
    if (
      !stored ||
      stored.lead_id !== lead.id ||
      stored.classification !== classification
    )
      return {
        leadId: null,
        classification,
        duplicate: true,
        ignored: true,
        resolution: 'message-id-conflict',
      };
    if (input.threadId)
      await database
        .prepare(
          `UPDATE messages SET thread_id = COALESCE(thread_id, ?)
           WHERE external_id = ? AND lead_id = ?`,
        )
        .bind(input.threadId, input.externalId, lead.id)
        .run();
  }

  if (lead) {
    const latest = await database
      .prepare(
        `SELECT external_id FROM messages
         WHERE lead_id = ? AND direction = 'inbound'
         ORDER BY julianday(created_at) DESC, rowid DESC
         LIMIT 1`,
      )
      .bind(lead.id)
      .first<{ external_id: string | null }>();
    const stale = latest?.external_id !== input.externalId;
    if (classification === 'unsubscribe') {
      return {
        leadId: lead.id,
        classification,
        duplicate,
        stale,
        suppressed: true,
        suppressedLeads,
      };
    }
    if (stale)
      return {
        leadId: lead.id,
        classification,
        duplicate,
        stale: true,
      };
    if (
      lead.contact_channel === 'unverified-inbound' ||
      lead.contact_permission === 'unverified-intake'
    )
      return {
        leadId: lead.id,
        classification,
        duplicate,
        ignored: true,
        resolution: 'exact-confirmation-required',
      };
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
    const bookedReplyNextAction =
      classification === 'ambiguous'
        ? 'Human review required; keep the scheduled fit call and payment decision active'
        : `Reply classified: ${classification}; keep the scheduled fit call and payment decision active`;
    if (
      classification === 'not_interested' &&
      beforePayment.includes(lead.status)
    ) {
      await transitionLead(lead.id, 'closed_lost', { nextAction });
    } else if (
      lead.status === 'closed_lost' &&
      ['interested', 'question', 'website_confirmation'].includes(
        classification,
      )
    ) {
      await database
        .prepare(
          `UPDATE leads SET status = 'replied', next_action = ?,
             last_reply_at = ?, updated_at = datetime('now')
           WHERE id = ? AND status = 'closed_lost'
             AND contact_permission IN ('verified-inbound', 'explicit-public-request')
             AND explicit_intent = 1
             AND NOT EXISTS (
               SELECT 1 FROM suppression
               WHERE lower(suppression.identifier) = lower(leads.contact_email)
             )`,
        )
        .bind(nextAction, receivedAtIso, lead.id)
        .run();
    } else if (lead.status === 'closed_lost' && classification === 'booked') {
      await database
        .prepare(
          `UPDATE leads SET status = 'booked', next_action = ?,
             booked_at = COALESCE(booked_at, datetime('now')),
             last_reply_at = ?, updated_at = datetime('now')
           WHERE id = ? AND status = 'closed_lost'
             AND contact_permission IN ('verified-inbound', 'explicit-public-request')
             AND explicit_intent = 1
             AND NOT EXISTS (
               SELECT 1 FROM suppression
               WHERE lower(suppression.identifier) = lower(leads.contact_email)
             )`,
        )
        .bind(nextAction, receivedAtIso, lead.id)
        .run();
    } else if (classification === 'booked') {
      const advanced = await advanceLead(lead.id, 'booked', nextAction);
      if (!advanced.advanced && lead.status === 'booked')
        await setLeadNextAction(lead.id, bookedReplyNextAction, ['booked']);
    } else if (classification === 'out_of_office') {
      await setLeadNextAction(lead.id, nextAction, beforePayment);
    } else if (lead.status === 'booked') {
      await setLeadNextAction(lead.id, bookedReplyNextAction, ['booked']);
    } else if (classification !== 'not_interested') {
      await advanceLead(lead.id, 'replied', nextAction);
    }
    await database
      .prepare(
        `UPDATE leads SET last_reply_at = ?
         WHERE id = ? AND (
           last_reply_at IS NULL OR julianday(last_reply_at) < julianday(?)
         )`,
      )
      .bind(receivedAtIso, lead.id, receivedAtIso)
      .run();
  }
  return { leadId: lead?.id ?? null, classification, duplicate };
}

export async function claimCurrentGmailReply(input: {
  leadId: string;
  sourceMessageId: string;
}) {
  await ensureSchema();
  const database = d1();
  const claimToken = crypto.randomUUID();
  const claimed = await database
    .prepare(
      `UPDATE messages SET
         reply_claim_token = ?,
         reply_claim_until = datetime('now', '+5 minutes')
       WHERE lead_id = ?
         AND external_id = ?
         AND direction = 'inbound'
         AND thread_id IS NOT NULL
         AND classification IN ('interested', 'question', 'booked', 'website_confirmation')
         AND julianday(created_at) >= julianday('now', '-72 hours')
         AND replied_at IS NULL
         AND (
           reply_claim_until IS NULL
           OR julianday(reply_claim_until) <= julianday('now')
         )
         AND rowid = (
           SELECT latest.rowid FROM messages AS latest
           WHERE latest.lead_id = messages.lead_id
             AND latest.direction = 'inbound'
           ORDER BY julianday(latest.created_at) DESC, latest.rowid DESC
           LIMIT 1
         )
         AND EXISTS (
           SELECT 1 FROM leads
           WHERE leads.id = messages.lead_id
             AND leads.status IN ('replied', 'booked')
             AND leads.contact_channel IN ('inbound', 'direct-email')
             AND leads.contact_permission IN ('verified-inbound', 'explicit-public-request')
             AND leads.explicit_intent = 1
             AND leads.last_reply_at IS NOT NULL
             AND (
               leads.last_contact_at IS NULL
               OR julianday(leads.last_reply_at) > julianday(leads.last_contact_at)
             )
             AND NOT EXISTS (
               SELECT 1 FROM suppression
               WHERE lower(suppression.identifier) = lower(leads.contact_email)
             )
         )`,
    )
    .bind(claimToken, input.leadId, input.sourceMessageId)
    .run();
  if (!claimed.meta.changes) return null;
  const stored = await database
    .prepare(
      `SELECT thread_id FROM messages
       WHERE lead_id = ? AND external_id = ? AND reply_claim_token = ?
       LIMIT 1`,
    )
    .bind(input.leadId, input.sourceMessageId, claimToken)
    .first<{ thread_id: string | null }>();
  if (!stored?.thread_id) throw new Error('Claimed Gmail reply has no thread');
  return {
    leadId: input.leadId,
    sourceMessageId: input.sourceMessageId,
    sourceThreadId: stored.thread_id,
    claimToken,
  };
}

export async function validateCurrentGmailReplyClaim(input: {
  leadId: string;
  sourceMessageId: string;
  claimToken: string;
}) {
  await ensureSchema();
  const valid = await d1()
    .prepare(
      `SELECT messages.thread_id FROM messages
       INNER JOIN leads ON leads.id = messages.lead_id
       WHERE messages.lead_id = ?
         AND messages.external_id = ?
         AND messages.reply_claim_token = ?
         AND messages.direction = 'inbound'
         AND messages.thread_id IS NOT NULL
         AND messages.classification IN ('interested', 'question', 'booked', 'website_confirmation')
         AND messages.replied_at IS NULL
         AND julianday(messages.reply_claim_until) > julianday('now')
         AND messages.rowid = (
           SELECT latest.rowid FROM messages AS latest
           WHERE latest.lead_id = messages.lead_id
             AND latest.direction = 'inbound'
           ORDER BY julianday(latest.created_at) DESC, latest.rowid DESC
           LIMIT 1
         )
         AND leads.status IN ('replied', 'booked')
         AND leads.contact_channel IN ('inbound', 'direct-email')
         AND leads.contact_permission IN ('verified-inbound', 'explicit-public-request')
         AND leads.explicit_intent = 1
         AND leads.last_reply_at IS NOT NULL
         AND (
           leads.last_contact_at IS NULL
           OR julianday(leads.last_reply_at) > julianday(leads.last_contact_at)
         )
         AND NOT EXISTS (
           SELECT 1 FROM suppression
           WHERE lower(suppression.identifier) = lower(leads.contact_email)
         )
       LIMIT 1`,
    )
    .bind(input.leadId, input.sourceMessageId, input.claimToken)
    .first<{ thread_id: string }>();
  return valid
    ? {
        leadId: input.leadId,
        sourceMessageId: input.sourceMessageId,
        sourceThreadId: valid.thread_id,
        claimToken: input.claimToken,
      }
    : null;
}

export async function releaseGmailReplyClaim(input: {
  leadId: string;
  sourceMessageId: string;
  claimToken: string;
}) {
  await ensureSchema();
  const released = await d1()
    .prepare(
      `UPDATE messages SET reply_claim_token = NULL, reply_claim_until = NULL
       WHERE lead_id = ? AND external_id = ? AND reply_claim_token = ?
         AND replied_at IS NULL`,
    )
    .bind(input.leadId, input.sourceMessageId, input.claimToken)
    .run();
  return Boolean(released.meta.changes);
}

export async function recordGmailDraftThreadLink(input: {
  leadId: string;
  threadId: string;
  draftId: string;
}) {
  await ensureSchema();
  const lead = await getLead(input.leadId);
  if (!lead) throw new Error('Lead not found');
  if (
    !['direct-email', 'inbound'].includes(lead.contact_channel) ||
    !['verified-inbound', 'explicit-public-request'].includes(
      lead.contact_permission,
    ) ||
    !['proposal_ready', 'drafted', 'replied', 'booked'].includes(lead.status)
  )
    throw new Error('Only an eligible consented Gmail lead can link a draft');
  const database = d1();
  const conflict = await database
    .prepare(
      `SELECT lead_id FROM messages
       WHERE thread_id = ? AND lead_id IS NOT NULL AND lead_id <> ?
       LIMIT 1`,
    )
    .bind(input.threadId, input.leadId)
    .first<{ lead_id: string }>();
  if (conflict) throw new Error('Gmail draft thread is linked to another lead');
  const externalId = `gmail-draft:${input.draftId}`;
  const inserted = await database
    .prepare(
      `INSERT OR IGNORE INTO messages (
         id, lead_id, external_id, thread_id, direction, channel,
         classification, created_at
       ) VALUES (?, ?, ?, ?, 'draft', 'gmail', 'pending-draft', datetime('now'))`,
    )
    .bind(crypto.randomUUID(), input.leadId, externalId, input.threadId)
    .run();
  if (!inserted.meta.changes) {
    const stored = await database
      .prepare(
        `SELECT lead_id, thread_id FROM messages
         WHERE external_id = ? LIMIT 1`,
      )
      .bind(externalId)
      .first<{ lead_id: string | null; thread_id: string | null }>();
    if (
      !stored ||
      stored.lead_id !== input.leadId ||
      stored.thread_id !== input.threadId
    )
      throw new Error('Gmail draft identity conflicted');
  }
  return {
    leadId: input.leadId,
    threadId: input.threadId,
    draftId: input.draftId,
    recorded: Boolean(inserted.meta.changes),
  };
}

export async function listInvalidGmailDraftLeadIds(leadIds: string[]) {
  await ensureSchema();
  const uniqueIds = [...new Set(leadIds)].slice(0, 250);
  if (!uniqueIds.length) return [];
  const placeholders = uniqueIds.map(() => '?').join(', ');
  const eligible = await d1()
    .prepare(
      `SELECT leads.id FROM leads
       WHERE leads.id IN (${placeholders})
         AND leads.explicit_intent = 1
         AND leads.contact_email IS NOT NULL
         AND leads.contact_permission IN ('verified-inbound', 'explicit-public-request')
         AND NOT EXISTS (
           SELECT 1 FROM suppression
           WHERE lower(suppression.identifier) = lower(leads.contact_email)
         )
         AND (
           (
             leads.status IN ('proposal_ready', 'drafted')
             AND leads.contact_channel = 'direct-email'
           )
           OR (
             leads.status IN ('replied', 'booked')
             AND leads.contact_channel IN ('inbound', 'direct-email')
             AND leads.last_reply_at IS NOT NULL
             AND (
               leads.last_contact_at IS NULL
               OR julianday(leads.last_reply_at) > julianday(leads.last_contact_at)
             )
             AND COALESCE((
               SELECT messages.classification FROM messages
               WHERE messages.lead_id = leads.id
                 AND messages.direction = 'inbound'
               ORDER BY julianday(messages.created_at) DESC, messages.rowid DESC
               LIMIT 1
             ), '') <> 'out_of_office'
           )
         )`,
    )
    .bind(...uniqueIds)
    .all<{ id: string }>();
  const eligibleIds = new Set(eligible.results.map((row) => row.id));
  return uniqueIds.filter((id) => !eligibleIds.has(id));
}

export async function recordOutboundContact(input: {
  leadId: string;
  threadId: string;
  sentMessageId: string;
  sentAt: string;
  subject?: string;
  sourceMessageId?: string;
  claimToken?: string;
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
  if (Boolean(input.sourceMessageId) !== Boolean(input.claimToken))
    throw new Error('Gmail reply claim identity is incomplete');
  if (input.sourceMessageId && input.claimToken) {
    const claim = await d1()
      .prepare(
        `SELECT lead_id, reply_claim_token, replied_at FROM messages
         WHERE external_id = ? LIMIT 1`,
      )
      .bind(input.sourceMessageId)
      .first<{
        lead_id: string | null;
        reply_claim_token: string | null;
        replied_at: string | null;
      }>();
    if (
      !claim ||
      claim.lead_id !== input.leadId ||
      (!claim.replied_at && claim.reply_claim_token !== input.claimToken)
    )
      throw new Error('Gmail reply claim is no longer valid');
  }
  const externalId = `gmail-sent:${input.sentMessageId}`;
  const inserted = await d1()
    .prepare(
      `INSERT OR IGNORE INTO messages (
        id, lead_id, external_id, thread_id, direction, channel, subject,
        classification, created_at
      ) VALUES (?, ?, ?, ?, 'outbound', 'gmail', ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.leadId,
      externalId,
      input.threadId,
      input.subject?.slice(0, 300) ?? null,
      `sent:${input.sentMessageId}`,
      sentAtIso,
    )
    .run();
  if (!inserted.meta.changes) {
    const stored = await d1()
      .prepare(
        `SELECT lead_id, thread_id, classification FROM messages
         WHERE external_id = ? LIMIT 1`,
      )
      .bind(externalId)
      .first<{
        lead_id: string | null;
        thread_id: string | null;
        classification: string | null;
      }>();
    if (
      !stored ||
      stored.lead_id !== input.leadId ||
      stored.thread_id !== input.threadId ||
      stored.classification !== `sent:${input.sentMessageId}`
    )
      throw new Error('Gmail sent-message identity conflicted');
  }
  const awaitReply =
    '[Outbound] Await reply; follow up only within the permitted channel rules';
  const bookedAwaitReply =
    'Run the scheduled fit call and send the payment link after scope is confirmed; [Outbound] await a new reply';
  await d1()
    .prepare(
      `UPDATE leads SET
         last_contact_at = CASE
           WHEN last_contact_at IS NULL OR julianday(last_contact_at) < julianday(?)
             THEN ?
           ELSE last_contact_at
         END,
         next_action = CASE
           WHEN status IN ('drafted', 'replied', 'booked')
             AND (
               next_action IS NULL OR trim(next_action) = ''
               OR next_action = 'Review the Gmail draft and send only if channel rules allow'
               OR next_action = 'Review the consented inbound reply draft before sending'
               OR next_action = 'Review the consented inbound reply draft before sending; keep the scheduled fit call and payment decision active'
               OR next_action = 'Review request and offer a fit call'
               OR next_action = 'Run the scheduled fit call and send the payment link after scope is confirmed; [Outbound] await a new reply'
               OR next_action LIKE '[Outbound] %'
             )
             THEN CASE WHEN status = 'booked' THEN ? ELSE ? END
           ELSE next_action
         END,
         updated_at = datetime('now')
       WHERE id = ? AND contact_channel IN ('direct-email', 'inbound')
         AND (
           last_contact_at IS NULL OR julianday(last_contact_at) < julianday(?)
           OR (
             status IN ('drafted', 'replied', 'booked')
             AND COALESCE(next_action, '') <> ?
             AND (
               next_action IS NULL OR trim(next_action) = ''
               OR next_action = 'Review the Gmail draft and send only if channel rules allow'
               OR next_action = 'Review the consented inbound reply draft before sending'
               OR next_action = 'Review the consented inbound reply draft before sending; keep the scheduled fit call and payment decision active'
               OR next_action = 'Review request and offer a fit call'
               OR next_action = 'Run the scheduled fit call and send the payment link after scope is confirmed; [Outbound] await a new reply'
               OR next_action LIKE '[Outbound] %'
             )
           )
         )`,
    )
    .bind(
      sentAtIso,
      sentAtIso,
      bookedAwaitReply,
      awaitReply,
      input.leadId,
      sentAtIso,
      awaitReply,
    )
    .run();
  if (input.sourceMessageId && input.claimToken)
    await d1()
      .prepare(
        `UPDATE messages SET
           replied_at = COALESCE(replied_at, ?),
           reply_claim_token = NULL,
           reply_claim_until = NULL
         WHERE external_id = ? AND lead_id = ?
           AND (reply_claim_token = ? OR replied_at IS NOT NULL)`,
      )
      .bind(sentAtIso, input.sourceMessageId, input.leadId, input.claimToken)
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

export async function recordCommerceOrder(input: {
  sessionId: string;
  productId: string;
  eventId: string;
  eventCreated: number;
  outcome: StoredStripeCheckoutOutcome;
  leadId?: string | null;
  customerEmail?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  paymentStatus?: string | null;
}) {
  await ensureSchema();
  const database = d1();
  const write = await database
    .prepare(
      `INSERT INTO commerce_orders (
         session_id, product_id, outcome, outcome_rank, event_created, event_id,
         lead_id, customer_email, amount_total, currency, payment_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET
         product_id = excluded.product_id,
         outcome = excluded.outcome,
         outcome_rank = excluded.outcome_rank,
         event_created = excluded.event_created,
         event_id = excluded.event_id,
         lead_id = COALESCE(excluded.lead_id, commerce_orders.lead_id),
         customer_email = COALESCE(excluded.customer_email, commerce_orders.customer_email),
         amount_total = excluded.amount_total,
         currency = excluded.currency,
         payment_status = excluded.payment_status,
         updated_at = datetime('now')
       WHERE excluded.outcome_rank > commerce_orders.outcome_rank
          OR (excluded.outcome_rank = commerce_orders.outcome_rank
              AND excluded.event_created >= commerce_orders.event_created)`,
    )
    .bind(
      input.sessionId,
      input.productId,
      input.outcome,
      stripeRevenueOutcomeRank[input.outcome],
      input.eventCreated,
      input.eventId,
      input.leadId ?? null,
      input.customerEmail?.trim().toLowerCase() ?? null,
      input.amountTotal ?? null,
      input.currency?.toLowerCase() ?? null,
      input.paymentStatus ?? null,
    )
    .run();
  const current = await database
    .prepare(
      `SELECT session_id, product_id, outcome, event_id, event_created FROM commerce_orders WHERE session_id = ?`,
    )
    .bind(input.sessionId)
    .first<{
      session_id: string;
      product_id: string;
      outcome: StoredStripeCheckoutOutcome;
      event_id: string;
      event_created: number;
    }>();
  if (!current) throw new Error('Commerce order was not stored');
  return { applied: Boolean(write.meta.changes), ...current };
}

export async function getCommerceOrder(sessionId: string) {
  await ensureSchema();
  return d1()
    .prepare(
      `SELECT session_id, product_id, outcome, lead_id, customer_email, amount_total, currency, payment_status, updated_at FROM commerce_orders WHERE session_id = ?`,
    )
    .bind(sessionId)
    .first<{
      session_id: string;
      product_id: string;
      outcome: StoredStripeCheckoutOutcome;
      lead_id: string | null;
      customer_email: string | null;
      amount_total: number | null;
      currency: string | null;
      payment_status: string | null;
      updated_at: string;
    }>();
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
