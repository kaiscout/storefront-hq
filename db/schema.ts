import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const leads = sqliteTable(
  'leads',
  {
    id: text('id').primaryKey(),
    companyName: text('company_name').notNull(),
    storeUrl: text('store_url'),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    contactChannel: text('contact_channel')
      .notNull()
      .default('source-platform'),
    contactPermission: text('contact_permission').notNull().default('none'),
    sourceUrl: text('source_url').notNull(),
    sourceTitle: text('source_title').notNull(),
    sourceExcerpt: text('source_excerpt'),
    explicitIntent: integer('explicit_intent', { mode: 'boolean' })
      .notNull()
      .default(false),
    fitScore: integer('fit_score').notNull().default(0),
    fitReason: text('fit_reason'),
    proofUrl: text('proof_url'),
    proofSummary: text('proof_summary'),
    status: text('status').notNull().default('discovered'),
    nextAction: text('next_action'),
    lastContactAt: text('last_contact_at'),
    lastReplyAt: text('last_reply_at'),
    bookedAt: text('booked_at'),
    paidAt: text('paid_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_leads_source_url').on(table.sourceUrl),
    index('idx_leads_status_updated').on(table.status, table.updatedAt),
    index('idx_leads_contact_email').on(table.contactEmail),
  ],
);

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
    externalId: text('external_id'),
    direction: text('direction').notNull(),
    channel: text('channel').notNull(),
    subject: text('subject'),
    bodyExcerpt: text('body_excerpt'),
    classification: text('classification'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_messages_external_id').on(table.externalId),
    index('idx_messages_lead_created').on(table.leadId, table.createdAt),
  ],
);

export const suppression = sqliteTable(
  'suppression',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    reason: text('reason').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex('idx_suppression_identifier').on(table.identifier)],
);

export const intakeRateLimits = sqliteTable(
  'intake_rate_limits',
  {
    identifier: text('identifier').primaryKey(),
    windowStartedAt: text('window_started_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    attempts: integer('attempts').notNull().default(0),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index('idx_intake_rate_limits_updated').on(table.updatedAt)],
);

export const findings = sqliteTable(
  'findings',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    referringUrl: text('referring_url'),
    title: text('title').notNull(),
    severity: text('severity').notNull(),
    category: text('category').notNull(),
    evidence: text('evidence').notNull(),
    recommendation: text('recommendation'),
    screenshotUrl: text('screenshot_url'),
    statusCode: integer('status_code'),
    foundAt: text('found_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_findings_lead_severity').on(table.leadId, table.severity),
    uniqueIndex('idx_findings_dedupe').on(
      table.leadId,
      table.url,
      table.title,
      table.evidence,
    ),
  ],
);

export const auditPages = sqliteTable(
  'audit_pages',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    statusCode: integer('status_code'),
    pageTitle: text('page_title'),
    screenshotUrl: text('screenshot_url'),
    capturedAt: text('captured_at'),
    recordedAt: text('recorded_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_audit_pages_lead_url').on(table.leadId, table.url),
    index('idx_audit_pages_lead_recorded').on(table.leadId, table.recordedAt),
  ],
);

export const routeSnapshots = sqliteTable(
  'route_snapshots',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    contentHash: text('content_hash').notNull(),
    statusCode: integer('status_code'),
    pageTitle: text('page_title'),
    checkedAt: text('checked_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    changedAt: text('changed_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_route_snapshots_lead_url').on(table.leadId, table.url),
    index('idx_route_snapshots_checked').on(table.leadId, table.checkedAt),
  ],
);

export const watchRoutes = sqliteTable(
  'watch_routes',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_watch_routes_lead_url').on(table.leadId, table.url),
  ],
);

export const jobs = sqliteTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    dedupeKey: text('dedupe_key').notNull(),
    type: text('type').notNull(),
    status: text('status').notNull().default('queued'),
    payloadJson: text('payload_json').notNull(),
    resultJson: text('result_json'),
    attempts: integer('attempts').notNull().default(0),
    runAfter: text('run_after')
      .notNull()
      .default(sql`(datetime('now'))`),
    leaseUntil: text('lease_until'),
    lastError: text('last_error'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_jobs_dedupe_key').on(table.dedupeKey),
    index('idx_jobs_ready').on(table.status, table.runAfter, table.leaseUntil),
  ],
);

export const webhookEvents = sqliteTable(
  'webhook_events',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    eventType: text('event_type').notNull(),
    status: text('status').notNull().default('processed'),
    leaseUntil: text('lease_until'),
    processedAt: text('processed_at'),
    lastError: text('last_error'),
    resultJson: text('result_json'),
    receivedAt: text('received_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_webhook_provider_external').on(
      table.provider,
      table.externalId,
    ),
  ],
);

export const stripeCheckoutSessions = sqliteTable(
  'stripe_checkout_sessions',
  {
    sessionId: text('session_id').primaryKey(),
    outcome: text('outcome').notNull(),
    outcomeRank: integer('outcome_rank').notNull(),
    eventCreated: integer('event_created').notNull(),
    eventId: text('event_id').notNull(),
    leadId: text('lead_id'),
    amountTotal: integer('amount_total'),
    currency: text('currency'),
    paymentStatus: text('payment_status'),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_stripe_checkout_outcome').on(table.outcome, table.updatedAt),
  ],
);

export const calBookings = sqliteTable(
  'cal_bookings',
  {
    bookingUid: text('booking_uid').primaryKey(),
    attendeeEmail: text('attendee_email'),
    status: text('status').notNull(),
    leadId: text('lead_id').references(() => leads.id, {
      onDelete: 'set null',
    }),
    lastEventId: text('last_event_id').notNull(),
    lastEventType: text('last_event_type').notNull(),
    startsAt: text('starts_at'),
    endsAt: text('ends_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_cal_bookings_status_updated').on(table.status, table.updatedAt),
  ],
);
