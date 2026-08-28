import assert from 'node:assert/strict';
import test from 'node:test';

import { isClearedCheckoutPayment } from '../lib/payments.ts';

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
