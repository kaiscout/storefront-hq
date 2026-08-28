import assert from 'node:assert/strict';
import test from 'node:test';

import { offer } from '../lib/offer.ts';
import {
  formatGbpPence,
  parsePaymentSignal,
  paymentSignalLabel,
} from '../lib/payment-signals.ts';

const receivedAt = '2026-08-28 12:00:00';

void test('parses only processed expected-offer Stripe outcomes', () => {
  for (const outcome of [
    'cleared_expected',
    'cleared_needs_reconciliation',
    'pending_expected',
    'failed_expected',
  ] as const) {
    assert.deepEqual(
      parsePaymentSignal({
        external_id: `evt_${outcome}`,
        status: 'processed',
        received_at: receivedAt,
        result_json: JSON.stringify({
          outcome,
          amountTotal: offer.amountPence,
          currency: 'gbp',
          sessionId: 'cs_live_example',
          matched: true,
          advanced: outcome === 'cleared_expected',
          leadId: 'must-not-be-returned',
        }),
      }),
      {
        eventId: `evt_${outcome}`,
        sessionId: 'cs_live_example',
        outcome,
        amountPence: offer.amountPence,
        receivedAt: '2026-08-28T12:00:00.000Z',
        matched: true,
        advanced: outcome === 'cleared_expected',
      },
    );
  }
});

void test('rejects malformed, unexpected, failed-storage and wrong-offer records', () => {
  const base = {
    external_id: 'evt_base',
    status: 'processed',
    received_at: receivedAt,
    result_json: JSON.stringify({
      outcome: 'cleared_expected',
      amountTotal: offer.amountPence,
      currency: 'gbp',
    }),
  };
  for (const event of [
    { ...base, status: 'failed' },
    { ...base, result_json: '{bad json' },
    {
      ...base,
      result_json: JSON.stringify({
        outcome: 'cleared_expected',
        amountTotal: offer.amountPence,
        currency: 'gbp',
        superseded: true,
      }),
    },
    {
      ...base,
      result_json: JSON.stringify({
        outcome: 'unexpected_checkout',
        amountTotal: offer.amountPence,
        currency: 'gbp',
      }),
    },
    {
      ...base,
      result_json: JSON.stringify({
        outcome: 'cleared_expected',
        amountTotal: offer.amountPence - 1,
        currency: 'gbp',
      }),
    },
    {
      ...base,
      result_json: JSON.stringify({
        outcome: 'cleared_expected',
        amountTotal: offer.amountPence,
        currency: 'usd',
      }),
    },
  ])
    assert.equal(parsePaymentSignal(event), null);
});

void test('uses concise labels and GBP currency formatting', () => {
  assert.equal(paymentSignalLabel('cleared_expected'), 'Confirmed money');
  assert.equal(
    paymentSignalLabel('cleared_needs_reconciliation'),
    'Money cleared — reconcile',
  );
  assert.equal(paymentSignalLabel('pending_expected'), 'Payment pending');
  assert.equal(paymentSignalLabel('failed_expected'), 'Payment failed');
  assert.equal(formatGbpPence(offer.amountPence), '£895.00');
});
