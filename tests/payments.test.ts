import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyStripeRevenueOutcome,
  isClearedCheckoutPayment,
  isExpectedLiveCheckoutPayment,
  resolveStripePaymentLead,
  shouldApplyStripeSessionOutcome,
  stripeWebhookEventSchema,
} from '../lib/payments.ts';

void test('only cleared Stripe Checkout events unlock fulfilment', () => {
  assert.equal(
    isClearedCheckoutPayment('checkout.session.completed', 'paid'),
    true,
  );
  assert.equal(
    isClearedCheckoutPayment('checkout.session.completed', 'unpaid'),
    false,
  );
  assert.equal(
    isClearedCheckoutPayment(
      'checkout.session.async_payment_succeeded',
      'paid',
    ),
    true,
  );
  assert.equal(
    isClearedCheckoutPayment('checkout.session.async_payment_failed', 'unpaid'),
    false,
  );
});

void test('expected pending and failed payments remain actionable revenue signals', () => {
  const expected = {
    livemode: true,
    paymentLink: 'plink_live_offer',
    amountTotal: 89_500,
    currency: 'gbp',
  };
  assert.equal(
    classifyStripeRevenueOutcome(
      {
        ...expected,
        eventType: 'checkout.session.completed',
        paymentStatus: 'unpaid',
      },
      expected.paymentLink,
    ),
    'pending_expected',
  );
  assert.equal(
    classifyStripeRevenueOutcome(
      {
        ...expected,
        eventType: 'checkout.session.async_payment_failed',
        paymentStatus: 'unpaid',
      },
      expected.paymentLink,
    ),
    'failed_expected',
  );
  assert.equal(
    classifyStripeRevenueOutcome(
      { ...expected, eventType: 'customer.created' },
      expected.paymentLink,
    ),
    'ignored_event',
  );
});

void test('only the configured live GBP 895 Payment Link can unlock fulfilment', () => {
  const paymentLinkId = 'plink_live_offer';
  const validPayment = {
    eventType: 'checkout.session.completed',
    livemode: true,
    paymentStatus: 'paid',
    paymentLink: paymentLinkId,
    amountTotal: 89_500,
    currency: 'gbp',
  };

  assert.equal(
    isExpectedLiveCheckoutPayment(validPayment, paymentLinkId),
    true,
  );

  for (const [field, value] of [
    ['livemode', false],
    ['paymentLink', 'plink_different_offer'],
    ['amountTotal', 89_499],
    ['currency', 'usd'],
  ] as const) {
    assert.equal(
      isExpectedLiveCheckoutPayment(
        { ...validPayment, [field]: value },
        paymentLinkId,
      ),
      false,
      `wrong ${field} must not unlock fulfilment`,
    );
  }
});

void test('a payment cannot clear without a configured Payment Link ID', () => {
  assert.equal(
    isExpectedLiveCheckoutPayment(
      {
        eventType: 'checkout.session.async_payment_succeeded',
        livemode: true,
        paymentStatus: 'paid',
        paymentLink: 'plink_live_offer',
        amountTotal: 89_500,
        currency: 'gbp',
      },
      '',
    ),
    false,
  );
});

void test('Stripe lead matching treats a supplied reference as authoritative', () => {
  const candidates = [
    {
      id: 'lead-booked',
      contactEmail: 'buyer@example.com',
      contactChannel: 'inbound',
      status: 'booked',
    },
    {
      id: 'lead-other',
      contactEmail: 'buyer@example.com',
      contactChannel: 'direct-email',
      status: 'booked',
    },
  ];
  assert.deepEqual(
    resolveStripePaymentLead(candidates, 'lead-booked', 'BUYER@example.com'),
    { matched: true, leadId: 'lead-booked', alreadyPaid: false },
  );
  assert.deepEqual(
    resolveStripePaymentLead(
      candidates,
      'stale-reference',
      'buyer@example.com',
    ),
    { matched: false, reason: 'reference-not-found' },
  );
  assert.deepEqual(
    resolveStripePaymentLead(candidates, 'lead-booked', 'other@example.com'),
    { matched: false, reason: 'email-mismatch' },
  );
});

void test('Stripe email fallback requires exactly one booked off-platform lead', () => {
  const booked = {
    id: 'lead-booked',
    contactEmail: 'buyer@example.com',
    contactChannel: 'inbound',
    status: 'booked',
  };
  const closed = {
    id: 'lead-newer-closed',
    contactEmail: 'buyer@example.com',
    contactChannel: 'direct-email',
    status: 'closed_lost',
  };
  assert.deepEqual(
    resolveStripePaymentLead([closed, booked], null, 'buyer@example.com'),
    { matched: true, leadId: 'lead-booked', alreadyPaid: false },
  );
  assert.deepEqual(
    resolveStripePaymentLead(
      [booked, { ...booked, id: 'lead-second' }],
      null,
      'buyer@example.com',
    ),
    { matched: false, reason: 'email-ambiguous' },
  );
  assert.deepEqual(
    resolveStripePaymentLead(
      [
        {
          ...booked,
          id: 'marketplace-lead',
          contactChannel: 'source-platform',
        },
      ],
      null,
      'buyer@example.com',
    ),
    { matched: false, reason: 'email-not-found' },
  );
});

void test('Cal-confirmed leads can reconcile payments without trusting bare intake', () => {
  const scheduled = {
    id: 'cal-booked',
    contactEmail: 'buyer@example.com',
    contactChannel: 'cal-booking',
    contactPermission: 'scheduled-contact',
    status: 'booked',
  };
  assert.deepEqual(
    resolveStripePaymentLead([scheduled], null, 'BUYER@example.com'),
    { matched: true, leadId: 'cal-booked', alreadyPaid: false },
  );
  assert.deepEqual(
    resolveStripePaymentLead(
      [
        {
          ...scheduled,
          id: 'intake-booked',
          contactChannel: 'unverified-inbound',
        },
      ],
      null,
      'buyer@example.com',
    ),
    { matched: true, leadId: 'intake-booked', alreadyPaid: false },
  );
  assert.deepEqual(
    resolveStripePaymentLead(
      [
        {
          ...scheduled,
          id: 'unverified-intake',
          contactChannel: 'unverified-inbound',
          contactPermission: 'unverified-intake',
        },
      ],
      null,
      'buyer@example.com',
    ),
    { matched: false, reason: 'email-not-found' },
  );
  assert.deepEqual(
    resolveStripePaymentLead(
      [scheduled, { ...scheduled, id: 'second-cal-booking' }],
      null,
      'buyer@example.com',
    ),
    { matched: false, reason: 'email-ambiguous' },
  );
});

void test('Stripe session outcome precedence prevents terminal-state regression', () => {
  assert.equal(
    shouldApplyStripeSessionOutcome(
      { outcome: 'pending_expected', eventCreated: 100 },
      { outcome: 'failed_expected', eventCreated: 110 },
    ),
    true,
  );
  assert.equal(
    shouldApplyStripeSessionOutcome(
      { outcome: 'failed_expected', eventCreated: 110 },
      { outcome: 'pending_expected', eventCreated: 120 },
    ),
    false,
  );
  assert.equal(
    shouldApplyStripeSessionOutcome(
      { outcome: 'failed_expected', eventCreated: 110 },
      { outcome: 'cleared_expected', eventCreated: 120 },
    ),
    true,
  );
  assert.equal(
    shouldApplyStripeSessionOutcome(
      { outcome: 'cleared_expected', eventCreated: 120 },
      { outcome: 'failed_expected', eventCreated: 130 },
    ),
    false,
  );
  assert.equal(
    shouldApplyStripeSessionOutcome(
      { outcome: 'pending_expected', eventCreated: 120 },
      { outcome: 'pending_expected', eventCreated: 119 },
    ),
    false,
  );
});

void test('Stripe webhook payloads require stable event identity and session data', () => {
  const valid = {
    id: 'evt_live_123',
    type: 'checkout.session.completed',
    created: 1_787_950_000,
    livemode: true,
    data: {
      object: {
        id: 'cs_live_123',
        client_reference_id: 'lead-123',
        amount_total: 89_500,
        currency: 'gbp',
        extra_from_stripe: true,
      },
    },
  };
  assert.equal(stripeWebhookEventSchema.safeParse(valid).success, true);
  for (const invalid of [
    { ...valid, id: '' },
    { ...valid, type: '' },
    { ...valid, created: -1 },
    { ...valid, data: {} },
  ])
    assert.equal(stripeWebhookEventSchema.safeParse(invalid).success, false);
});
