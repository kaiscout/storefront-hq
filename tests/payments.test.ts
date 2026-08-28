import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isClearedCheckoutPayment,
  isExpectedLiveCheckoutPayment,
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
