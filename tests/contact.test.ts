import assert from 'node:assert/strict';
import test from 'node:test';
import { businessContactEmail, sprintInquiryMailto } from '../lib/contact.ts';

test('enquiry opens only the dedicated business email with useful fit context', () => {
  const href = sprintInquiryMailto(businessContactEmail);
  assert.ok(href);
  const url = new URL(href);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, businessContactEmail);
  assert.match(url.searchParams.get('body') || '', /Public Shopify store URL:/);
  assert.match(url.searchParams.get('body') || '', /Who would implement recommendations:/);
  assert.match(url.searchParams.get('body') || '', /Please reply/);
  assert.equal(url.searchParams.has('cc'), false);
  assert.equal(url.searchParams.has('bcc'), false);
});

test('missing, different or header-injected destinations do not get a mail link', () => {
  for (const email of ['', 'other@example.com', businessContactEmail + '?bcc=other@example.com', businessContactEmail + '\r\nBcc: other@example.com']) {
    assert.equal(sprintInquiryMailto(email), null);
  }
});
