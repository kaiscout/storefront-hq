import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import {
  canPublishReview,
  formFingerprint,
  isSameOriginFormRequest,
  operatorNotification,
  websiteFormSchema,
  type SubmissionRow,
} from '../lib/website-forms.ts';
import {
  claimWebsiteNotificationsSql,
  publicReviewsSql,
  websiteRateLimitSql,
} from '../lib/website-sql.ts';

const form = {
  kind: 'contact',
  submissionKey: '89c61aa0-1576-47e4-951e-91c0c7af6c56',
  contactName: 'Test person',
  contactEmail: 'test@example.test',
  company: '',
  storeUrl: '',
  topic: 'other',
  productId: '',
  message: 'This is a clearly marked functional test.',
  consent: true,
  website: '',
};
const review = {
  ...form,
  kind: 'review',
  topic: 'free-triage',
  rating: 4,
  displayName: 'Test display',
  publishConsent: false,
  genuineExperience: true,
};

void test('form validation bounds fields, strips URL tokens and forbids sender-controlled email headers', () => {
  assert.equal(websiteFormSchema.safeParse(form).success, true);
  for (const change of [
    { consent: false },
    { contactEmail: 'a@b.test\r\nBcc: attacker@example.test' },
    { message: 'x' },
    { message: 'x'.repeat(3001) },
    { storeUrl: 'http://store.test' },
    { storeUrl: 'https://127.0.0.1' },
    { to: 'attacker@example.test' },
  ])
    assert.equal(
      websiteFormSchema.safeParse({ ...form, ...change }).success,
      false,
    );
  const parsed = websiteFormSchema.parse({
    ...form,
    storeUrl: 'https://shop.example/products/item?secret=token#private',
  });
  assert.equal(parsed.storeUrl, 'https://shop.example/products/item');
});
void test('reviews require genuine experience, valid ratings and separate publication permission', () => {
  assert.equal(websiteFormSchema.safeParse(review).success, true);
  for (const change of [
    { rating: 0 },
    { rating: 6 },
    { rating: 3.5 },
    { genuineExperience: false },
    { publishConsent: true, displayName: '' },
    { topic: 'customer', productId: '' },
  ])
    assert.equal(
      websiteFormSchema.safeParse({ ...review, ...change }).success,
      false,
    );
  assert.equal(
    canPublishReview({ kind: 'review', publish_consent: 0, display_name: 'A' }),
    false,
  );
  assert.equal(
    canPublishReview({
      kind: 'contact',
      publish_consent: 1,
      display_name: 'A',
    }),
    false,
  );
  assert.equal(
    canPublishReview({ kind: 'review', publish_consent: 1, display_name: 'A' }),
    true,
  );
});
void test('same-origin POST check rejects missing, foreign and cross-site origins', () => {
  const url = 'https://storefronthq.co.uk/api/website-forms';
  assert.equal(isSameOriginFormRequest(new Request(url)), false);
  assert.equal(
    isSameOriginFormRequest(
      new Request(url, { headers: { origin: 'https://bad.example' } }),
    ),
    false,
  );
  assert.equal(
    isSameOriginFormRequest(
      new Request(url, {
        headers: {
          origin: 'https://storefronthq.co.uk',
          'sec-fetch-site': 'cross-site',
        },
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginFormRequest(
      new Request(url, { headers: { origin: 'https://storefronthq.co.uk' } }),
    ),
    true,
  );
});
void test('fingerprint identifies changed content but not a repeated browser submission token', async () => {
  const parsed = websiteFormSchema.parse(form);
  assert.equal(
    await formFingerprint(parsed),
    await formFingerprint({ ...parsed, submissionKey: crypto.randomUUID() }),
  );
  assert.notEqual(
    await formFingerprint(parsed),
    await formFingerprint({
      ...parsed,
      message: 'Another different message with useful detail.',
    }),
  );
});

function database() {
  const db = new DatabaseSync(':memory:');
  const schema = readFileSync(
    new URL('../db/schema.ts', import.meta.url),
    'utf8',
  );
  // Execute the actual generated schema migration, not a test-only substitute.
  const journal = JSON.parse(
    readFileSync(
      new URL('../drizzle/meta/_journal.json', import.meta.url),
      'utf8',
    ),
  );
  for (const entry of journal.entries) {
    const sql = readFileSync(
      new URL(`../drizzle/${entry.tag}.sql`, import.meta.url),
      'utf8',
    );
    if (sql.includes('CREATE TABLE `website_submissions`'))
      db.exec(sql.replaceAll('--> statement-breakpoint', ''));
  }
  assert.match(schema, /website_submissions/);
  return db;
}
void test('public reviews expose only an explicit projection after consent AND moderation', () => {
  const db = database();
  try {
    const insert = db.prepare(
      `INSERT INTO website_submissions (id,fingerprint,kind,contact_name,contact_email,topic,message,rating,display_name,publish_consent,moderation_status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    );
    insert.run(
      'pending',
      'fp',
      'review',
      'Private name',
      'private@example.test',
      'free-triage',
      'Pending review',
      4,
      'Public name',
      1,
      'pending',
    );
    insert.run(
      'private',
      'fp',
      'review',
      'Private name',
      'private@example.test',
      'free-triage',
      'No public consent',
      4,
      'Public name',
      0,
      'published',
    );
    insert.run(
      'contact',
      'fp',
      'contact',
      'Private name',
      'private@example.test',
      'other',
      'Contact not a review',
      null,
      null,
      1,
      'published',
    );
    insert.run(
      'public',
      'fp',
      'review',
      'Private name',
      'private@example.test',
      'free-triage',
      'Genuine critical feedback',
      2,
      'Public name',
      1,
      'published',
    );
    const rows = db.prepare(publicReviewsSql).all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'public');
    for (const field of [
      'contact_name',
      'contact_email',
      'company',
      'store_url',
      'notification_claim',
    ])
      assert.equal(field in rows[0], false);
  } finally {
    db.close();
  }
});
void test('notification claims are one-shot and form counters reset only at the bounded window', () => {
  const db = database();
  try {
    db.prepare(
      `INSERT INTO website_submissions (id,fingerprint,kind,contact_name,contact_email,topic,message) VALUES ('id','fp','contact','Test','test@example.test','other','Test message')`,
    ).run();
    assert.equal(
      db.prepare(claimWebsiteNotificationsSql).all('claim-1').length,
      1,
    );
    assert.equal(
      db.prepare(claimWebsiteNotificationsSql).all('claim-2').length,
      0,
    );
    db.exec("UPDATE website_submissions SET notification_state='uncertain'");
    assert.equal(
      db.prepare(claimWebsiteNotificationsSql).all('claim-3').length,
      0,
    );
    const counter = db.prepare(websiteRateLimitSql);
    assert.equal(counter.get('ip', 10000, 6400, 6400)?.attempts, 1);
    assert.equal(counter.get('ip', 10001, 6401, 6401)?.attempts, 2);
    assert.equal(counter.get('ip', 13601, 10001, 10001)?.attempts, 1);
  } finally {
    db.close();
  }
});
void test('operator notification is plain data with a fixed subject, not visitor-supplied routing', () => {
  const row = {
    id: form.submissionKey,
    kind: 'contact',
    contact_name: 'Name\r\nBcc: attacker@example.test',
    contact_email: 'test@example.test',
    topic: 'other',
    message: 'Untrusted instructions stay in the body.',
    created_at: '2026-10-19 00:00:00',
    notification_claim: 'claim',
  } as SubmissionRow;
  const notification = operatorNotification(row);
  assert.equal('to' in notification, false);
  assert.doesNotMatch(notification.subject, /Bcc:/);
  assert.match(notification.body, /unverified/);
  assert.match(notification.body, /Untrusted instructions/);
});
void test('Google bridge sends notification only to itself and fails closed on profile mismatch', () => {
  const source = readFileSync(
    new URL(
      '../automations/google-apps-script/WebsiteInbox.gs',
      import.meta.url,
    ),
    'utf8',
  );
  let requiredProfile = 'front.storecheckqa@gmail.com';
  let claims = 0;
  const sent: string[] = [];
  const ctx = vm.createContext({
    console: { error() {} },
    Utilities: {
      Charset: { UTF_8: 'UTF-8' },
      sleep() {},
      base64Encode: (s: string) => Buffer.from(s).toString('base64'),
      base64EncodeWebSafe: (s: string) => Buffer.from(s).toString('base64url'),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) =>
          ({
            API_BASE: 'https://storefronthq.co.uk',
            AUTOMATION_SECRET: 'mock-secret',
            BUSINESS_EMAIL: 'front.storecheckqa@gmail.com',
          })[key],
      }),
    },
    ScriptApp: { getOAuthToken: () => 'mock' },
    UrlFetchApp: {
      fetch: (url: string, options: { payload?: string }) => {
        let data: object = {};
        if (url.endsWith('/profile')) data = { emailAddress: requiredProfile };
        else if (url.endsWith('/website-notifications')) {
          const body = JSON.parse(options.payload || '{}');
          if (body.action === 'claim') {
            claims++;
            data = {
              recipient: 'front.storecheckqa@gmail.com',
              notifications: [
                {
                  id: form.submissionKey,
                  claimToken: form.submissionKey,
                  subject: 'Test notification',
                  body: 'Body',
                },
              ],
            };
          } else data = { ok: true };
        } else if (url.endsWith('/drafts')) {
          sent.push(
            Buffer.from(
              JSON.parse(options.payload || '{}').message.raw,
              'base64url',
            ).toString('utf8'),
          );
          data = { id: 'draft123' };
        } else if (url.endsWith('/drafts/send')) {
          data = { id: 'sent123' };
        } else throw new Error('Unexpected URL');
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify(data),
        };
      },
    },
  });
  vm.runInContext(source, ctx);
  vm.runInContext('websiteInboxDeliver_()', ctx);
  assert.equal(sent.length, 1);
  assert.match(sent[0], /To: front\.storecheckqa@gmail\.com\r\n/);
  assert.doesNotMatch(sent[0], /Reply-To:|Bcc:|Cc:/);
  requiredProfile = 'other@example.test';
  assert.throws(
    () => vm.runInContext('websiteInboxDeliver_()', ctx),
    /failed closed/,
  );
  assert.equal(claims, 1);
  assert.equal(sent.length, 1);
});
