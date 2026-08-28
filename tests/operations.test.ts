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

void test('Apps Script schedules protected operations without adding a send API', () => {
  const source = readFileSync(
    new URL('../automations/google-apps-script/Code.gs', import.meta.url),
    'utf8',
  );
  for (const endpoint of [
    '/api/automation/outbound-contact',
    '/api/automation/sla-watch',
    '/api/automation/source-watch',
    '/api/automation/privacy-cleanup',
  ])
    assert.match(source, new RegExp(endpoint));
  assert.doesNotMatch(source, /\/(?:messages|drafts)\/send\b/i);
  assert.doesNotMatch(source, /GmailApp\.(?:sendEmail|createDraft)/);
});

void test('consented website enquiries enter the draft-first Gmail queue', () => {
  const databaseSource = readFileSync(
    new URL('../lib/database.ts', import.meta.url),
    'utf8',
  );
  const draftRouteSource = readFileSync(
    new URL('../app/api/automation/gmail-drafts/route.ts', import.meta.url),
    'utf8',
  );

  assert.match(
    databaseSource,
    /leads\.status = 'replied'[\s\S]*leads\.contact_channel = 'inbound'[\s\S]*leads\.last_contact_at IS NULL/,
  );
  assert.match(
    draftRouteSource,
    /lead\.contact_channel === 'inbound'[\s\S]*lead\.status === 'replied'/,
  );
  assert.match(
    draftRouteSource,
    /Review the consented inbound reply draft before sending/,
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
});
