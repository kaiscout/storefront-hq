import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const firecrawlCreditPeriods = sqliteTable('firecrawl_credit_periods', {
  period: text('period').primaryKey(),
  endsAt: text('ends_at').notNull(),
  allowance: integer('allowance').notNull(),
  remaining: integer('remaining').notNull(),
  checkedAt: text('checked_at').notNull(),
});

export const firecrawlSpend = sqliteTable(
  'firecrawl_spend',
  {
    id: text('id').primaryKey(),
    period: text('period').notNull(),
    day: text('day').notNull(),
    requestKey: text('request_key').notNull(),
    purpose: text('purpose').notNull(),
    units: integer('units').notNull(),
    reservedAt: text('reserved_at').notNull(),
    settledUnits: integer('settled_units').notNull().default(0),
    externalId: text('external_id'),
    retryReleased: integer('retry_released').notNull().default(0),
  },
  (table) => [
    index('idx_firecrawl_spend_period').on(table.period, table.purpose),
    index('idx_firecrawl_spend_day').on(table.day, table.purpose),
    index('idx_firecrawl_spend_request').on(table.requestKey, table.reservedAt),
  ],
);

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
    threadId: text('thread_id'),
    direction: text('direction').notNull(),
    channel: text('channel').notNull(),
    subject: text('subject'),
    bodyExcerpt: text('body_excerpt'),
    classification: text('classification'),
    replyClaimToken: text('reply_claim_token'),
    replyClaimUntil: text('reply_claim_until'),
    repliedAt: text('replied_at'),
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

export const commerceOrders = sqliteTable(
  'commerce_orders',
  {
    sessionId: text('session_id').primaryKey(),
    productId: text('product_id').notNull(),
    outcome: text('outcome').notNull(),
    outcomeRank: integer('outcome_rank').notNull(),
    eventCreated: integer('event_created').notNull(),
    eventId: text('event_id').notNull(),
    leadId: text('lead_id'),
    customerEmail: text('customer_email'),
    amountTotal: integer('amount_total'),
    currency: text('currency'),
    paymentStatus: text('payment_status'),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_commerce_orders_outcome').on(table.outcome, table.updatedAt),
    index('idx_commerce_orders_email').on(table.customerEmail, table.updatedAt),
  ],
);

export const commerceSubscriptions = sqliteTable(
  'commerce_subscriptions',
  {
    subscriptionId: text('subscription_id').primaryKey(),
    productId: text('product_id').notNull(),
    checkoutSessionId: text('checkout_session_id').notNull(),
    customerId: text('customer_id'),
    customerEmail: text('customer_email'),
    status: text('status').notNull(),
    currentPeriodStart: integer('current_period_start'),
    currentPeriodEnd: integer('current_period_end'),
    cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' })
      .notNull()
      .default(false),
    latestInvoiceId: text('latest_invoice_id'),
    lastEventId: text('last_event_id').notNull(),
    lastEventCreated: integer('last_event_created').notNull(),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_commerce_subscriptions_session').on(
      table.checkoutSessionId,
    ),
    index('idx_commerce_subscriptions_status').on(
      table.status,
      table.updatedAt,
    ),
    index('idx_commerce_subscriptions_email').on(
      table.customerEmail,
      table.updatedAt,
    ),
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
    lastEventCreated: integer('last_event_created').notNull().default(0),
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
