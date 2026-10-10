import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  automatedSlaNextAction,
  deliverySlaSummary,
  retentionDisposition,
} from '../lib/operations.ts';

const now = new Date('2026-08-28T12:00:00.000Z');

void test('48-hour SLA distinguishes on-track, approaching and overdue work', () => {
  const onTrack = deliverySlaSummary('2026-08-27 03:00:00', now);
  const approaching = deliverySlaSummary('2026-08-26 20:00:00', now);
  const overdue = deliverySlaSummary('2026-08-26 10:00:00', now);

  assert.equal(onTrack?.state, 'on_track');
  assert.equal(onTrack?.hoursRemaining, 15);
  assert.equal(approaching?.state, 'approaching');
  assert.equal(approaching?.hoursRemaining, 8);
  assert.equal(overdue?.state, 'overdue');
  assert.equal(overdue?.hoursRemaining, -2);
  assert.match(automatedSlaNextAction(approaching!), /^\[SLA\] Delivery due/);
  assert.match(automatedSlaNextAction(overdue!), /^\[SLA\] Delivery overdue/);
});

void test('privacy policy deletes only expired research and unsuccessful unpaid leads', () => {
  const candidate = {
    status: 'discovered' as const,
    explicitIntent: false,
    paidAt: null,
    createdAt: '2026-07-28 11:59:59',
    updatedAt: '2026-07-28 11:59:59',
  };
  assert.equal(
    retentionDisposition(candidate, now),
    'delete_unqualified_research',
  );
  assert.equal(
    retentionDisposition(
      { ...candidate, explicitIntent: true, createdAt: '2026-01-01 00:00:00' },
      now,
    ),
    'keep',
  );
  assert.equal(
    retentionDisposition(
      {
        ...candidate,
        status: 'closed_lost',
        explicitIntent: true,
        updatedAt: '2026-05-29 11:59:59',
      },
      now,
    ),
    'delete_unsuccessful_lead',
  );
  assert.equal(
    retentionDisposition(
      {
        ...candidate,
        status: 'qualified',
        explicitIntent: true,
        updatedAt: '2026-05-29 11:59:59',
      },
      now,
    ),
    'delete_unsuccessful_lead',
  );
});

void test('privacy policy preserves paid and contract-stage records', () => {
  const oldRecord = {
    explicitIntent: true,
    createdAt: '2025-01-01 00:00:00',
    updatedAt: '2025-01-01 00:00:00',
  };
  assert.equal(
    retentionDisposition(
      {
        ...oldRecord,
        status: 'closed_lost',
        paidAt: '2025-01-02 00:00:00',
      },
      now,
    ),
    'keep',
  );
  assert.equal(
    retentionDisposition(
      { ...oldRecord, status: 'delivered', paidAt: null },
      now,
    ),
    'keep',
  );
});

void test('Apps Script limits automatic sending to a claimed current inbound reply', () => {
  const source = readFileSync(
    new URL('../automations/google-apps-script/Code.gs', import.meta.url),
    'utf8',
  );
  for (const endpoint of [
    '/api/automation/outbound-contact',
    '/api/automation/gmail-thread-link',
    '/api/automation/gmail-reply-claims',
    '/api/automation/sla-watch',
    '/api/automation/source-watch',
    '/api/automation/privacy-cleanup',
  ])
    assert.match(source, new RegExp(endpoint));
  assert.doesNotMatch(source, /\/messages\/send\b/i);
  assert.match(source, /gmailApi_\('\/drafts\/send', 'post'/);
  assert.doesNotMatch(source, /GmailApp\.(?:sendEmail|createDraft)/);
  assert.match(
    source,
    /REQUIRED_BUSINESS_EMAIL = 'front\.storecheckqa@gmail\.com'/,
  );
  assert.match(source, /gmailApi_\('\/profile', 'get'\)/);
  assert.match(source, /function requireBusinessGmailProfile_/);
  assert.match(
    source,
    /function createProposalDrafts\(\) \{[\s\S]*getUserLock\(\)[\s\S]*createProposalDraftsLocked_\(\)/,
  );
  assert.match(
    source,
    /drafts\.forEach\(function \(item\) \{[\s\S]*try \{[\s\S]*Could not prepare Gmail draft for lead/,
  );
  assert.match(
    source,
    /pending\.push\(state\)[\s\S]*savePendingDrafts_\(pending\)[\s\S]*labelGmailDraftThread_\(state\)[\s\S]*linkGmailDraft_\(state, item\)/,
  );
  const createDraftFunction = source.match(
    /function createGmailDraft_\([\s\S]*?\n\}/,
  );
  assert.ok(createDraftFunction);
  assert.doesNotMatch(createDraftFunction[0], /ensureWatchLabelId_/);
  assert.match(source, /function removeInvalidPendingDrafts_/);
  assert.match(source, /gmailApi_\('\/drafts\/'[\s\S]*'delete'\)/);
  assert.match(source, /PENDING_DRAFTS_CHUNK_SIZE = 7000/);
  assert.match(source, /PENDING_DRAFTS_MAX_ITEMS = 250/);
  assert.match(
    source,
    /properties\.setProperties\(chunks, false\)[\s\S]*PENDING_DRAFTS_META_PROPERTY/,
  );
  assert.match(
    source,
    /function sendEligibleInboundDraft_[\s\S]*item\.autoSend[\s\S]*item\.sourceMessageId[\s\S]*item\.sourceThreadId/,
  );
  assert.match(
    source,
    /function isCurrentInboundSource_[\s\S]*latest\.id !== item\.sourceMessageId/,
  );
  assert.match(
    source,
    /function isCurrentInboundSource_[\s\S]*latestSentAt >= sourceTime/,
  );
  assert.match(source, /claim\.claimed[\s\S]*claim\.claimToken/);
  assert.match(source, /action: 'validate'[\s\S]*validationResult\.valid/);
  assert.match(
    source,
    /function syncInboundReplies\(\) \{[\s\S]*getUserLock\(\)[\s\S]*syncInboundRepliesLocked_\(\)/,
  );
  assert.match(
    source,
    /Number\(message\.internalDate \|\| 0\) >= Number\(item\.createdAt \|\| 0\)/,
  );
});

void test('public website enquiries remain quarantined until email ownership is proven', () => {
  const databaseSource = readFileSync(
    new URL('../lib/database.ts', import.meta.url),
    'utf8',
  );
  const draftRouteSource = readFileSync(
    new URL('../app/api/automation/gmail-drafts/route.ts', import.meta.url),
    'utf8',
  );
  const confirmationRouteSource = readFileSync(
    new URL(
      '../app/api/automation/gmail-confirmation/route.ts',
      import.meta.url,
    ),
    'utf8',
  );
  const gmailRouteSource = readFileSync(
    new URL('../app/api/webhooks/gmail/route.ts', import.meta.url),
    'utf8',
  );
  const appsScriptSource = readFileSync(
    new URL('../automations/google-apps-script/Code.gs', import.meta.url),
    'utf8',
  );

  assert.match(
    databaseSource,
    /'unverified-inbound', 'unverified-intake'[\s\S]*\?, \?, \?, 1, 100, 'discovered'[\s\S]*Website product enquiry:/,
  );
  assert.match(
    databaseSource,
    /contact_channel = 'inbound'[\s\S]*contact_permission = 'verified-inbound'[\s\S]*contact_channel = 'unverified-inbound'/,
  );
  assert.match(
    databaseSource,
    /contact_permission IN \('verified-inbound', 'explicit-public-request'\)/,
  );
  assert.match(
    databaseSource,
    /leads\.last_reply_at IS NOT NULL[\s\S]*julianday\(leads\.last_reply_at\) > julianday\(leads\.last_contact_at\)/,
  );
  assert.match(
    databaseSource,
    /SELECT messages\.classification FROM messages[\s\S]*<> 'out_of_office'/,
  );
  assert.match(
    databaseSource,
    /source_title = 'Website availability request'[\s\S]*last_contact_at IS NULL[\s\S]*last_reply_at IS NULL/,
  );

  assert.match(
    databaseSource,
    /leads\.status IN \('replied', 'booked'\)[\s\S]*leads\.contact_channel IN \('inbound', 'direct-email'\)[\s\S]*leads\.last_contact_at IS NULL/,
  );
  assert.match(
    draftRouteSource,
    /\['replied', 'booked'\]\.includes\(lead\.status\)[\s\S]*\['inbound', 'direct-email'\]\.includes\(lead\.contact_channel\)/,
  );
  assert.match(
    draftRouteSource,
    /Review the consented inbound reply draft before sending/,
  );
  assert.match(
    draftRouteSource,
    /hasCompleteSourceIdentity[\s\S]*sourceMessageId = hasCompleteSourceIdentity[\s\S]*sourceThreadId = hasCompleteSourceIdentity/,
  );
  const batchLimit = draftRouteSource.match(
    /const gmailDraftBatchLimit = (\d+);/,
  );
  assert.ok(batchLimit);
  assert.ok(Number(batchLimit[1]) <= 50);
  assert.match(
    draftRouteSource,
    /listDraftableDirectEmailLeads\(gmailDraftBatchLimit\)/,
  );
  assert.match(
    draftRouteSource,
    /z\.array\(z\.uuid\(\)\)\.max\(gmailDraftBatchLimit\)/,
  );
  assert.match(confirmationRouteSource, /hasAutomationSecret\(request\)/);
  assert.match(
    databaseSource,
    /source_title = 'Website availability request'[\s\S]*contact_channel = 'unverified-inbound'[\s\S]*contact_permission = 'unverified-intake'[\s\S]*lower\(contact_email\) = \?/,
  );
  assert.doesNotMatch(databaseSource, /verifiesWebsiteRequest/);
  assert.match(
    databaseSource,
    /contact_channel === 'unverified-inbound'[\s\S]*resolution: 'exact-confirmation-required'/,
  );
  assert.match(
    databaseSource,
    /classification,[\s\S]*created_at[\s\S]*'website_confirmation', \?\)/,
  );
  assert.match(
    databaseSource,
    /if \(alreadyVerified\)[\s\S]*status = CASE WHEN status = 'closed_lost' THEN 'replied'/,
  );
  assert.match(confirmationRouteSource, /body: z\.string\(\)\.max\(20_000\)/);
  assert.match(
    databaseSource,
    /classification === 'unsubscribe'[\s\S]*recipient objection[\s\S]*accepted: false/,
  );
  assert.match(
    appsScriptSource,
    /newer_than:30d to:[\s\S]*subject:"Storefront QA confirmation"/,
  );
  assert.match(
    appsScriptSource,
    /api_\('\/api\/automation\/gmail-confirmation', 'post'/,
  );
  assert.match(
    appsScriptSource,
    /receivedAt: new Date\(timestamp\)\.toISOString\(\)/,
  );
  assert.match(
    appsScriptSource,
    /body: plainBody_\(message\)\.slice\(0, 20000\)/,
  );
  assert.match(appsScriptSource, /threadId: threadSummary\.id/);
  assert.match(gmailRouteSource, /receivedAt: z\.iso\.datetime/);
  assert.match(
    databaseSource,
    /ORDER BY julianday\(created_at\) DESC, rowid DESC[\s\S]*stale: true/,
  );
  assert.match(
    appsScriptSource,
    /if \(results\[index\] && results\[index\]\.accepted\)[\s\S]*addLabelIds: \[labelId\]/,
  );
  const confirmationFunction = appsScriptSource.match(
    /function syncWebsiteConfirmations_\([\s\S]*?\n\}/,
  );
  assert.ok(confirmationFunction);
  assert.match(confirmationFunction[0], /body: plainBody_\(message\)/);
});

void test('every Cal booking is persisted and unmatched bookings create a visible lead', () => {
  const databaseSource = readFileSync(
    new URL('../lib/database.ts', import.meta.url),
    'utf8',
  );
  const calRouteSource = readFileSync(
    new URL('../app/api/webhooks/cal/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(databaseSource, /CREATE TABLE IF NOT EXISTS cal_bookings/);
  assert.match(databaseSource, /last_event_created INTEGER NOT NULL DEFAULT 0/);
  assert.match(
    databaseSource,
    /WHERE excluded\.last_event_created > cal_bookings\.last_event_created/,
  );
  assert.match(
    databaseSource,
    /VALUES \(\?, \?, 'rescheduled',[\s\S]*'BOOKING_RESCHEDULED_OUT'/,
  );
  assert.match(
    databaseSource,
    /ON CONFLICT\(booking_uid\) DO UPDATE SET[\s\S]*excluded\.last_event_created > cal_bookings\.last_event_created/,
  );
  assert.match(
    databaseSource,
    /rescheduledFromBooking[\s\S]*existingBooking\?\.lead_id \?\? rescheduledFromBooking\?\.lead_id/,
  );
  assert.match(
    databaseSource,
    /WHERE booking_uid = \? AND last_event_id = \? AND status = 'booked'/,
  );
  assert.match(
    databaseSource,
    /EXISTS \([\s\S]*booking_uid = \? AND last_event_id = \? AND status = 'booked'/,
  );
  assert.match(
    databaseSource,
    /status = CASE WHEN status = 'booked' THEN 'replied' ELSE status END[\s\S]*status = 'cancelled'/,
  );
  assert.match(databaseSource, /'Cal fit-call booking'/);
  assert.match(databaseSource, /'scheduled-contact'/);
  assert.match(calRouteSource, /recordCalBookingEvent/);
  assert.match(calRouteSource, /isCalBookingEventType/);
  assert.match(calRouteSource, /parseCalEventCreated/);
  assert.match(calRouteSource, /await sha256Hex\(raw\)/);
  assert.match(calRouteSource, /rescheduleUid/);
  assert.match(
    calRouteSource,
    /completeWebhookEvent\('cal', eventId, booking\)/,
  );
  assert.doesNotMatch(calRouteSource, /getLeadByEmail/);
});
