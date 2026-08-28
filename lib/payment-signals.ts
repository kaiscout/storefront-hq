import { offer } from './offer.ts';

export const paymentSignalOutcomes = [
  'cleared_expected',
  'cleared_needs_reconciliation',
  'pending_expected',
  'failed_expected',
] as const;

export type PaymentSignalOutcome = (typeof paymentSignalOutcomes)[number];

type StoredStripeEvent = {
  external_id: string;
  status: string;
  result_json: string | null;
  received_at: string;
};

export type PaymentSignal = {
  eventId: string;
  sessionId: string | null;
  outcome: PaymentSignalOutcome;
  amountPence: number;
  receivedAt: string;
  matched: boolean;
  advanced: boolean;
};

function storedTimestamp(value: string) {
  const trimmed = value.trim();
  const normalized = /(?:z|[+-]\d\d:\d\d)$/i.test(trimmed)
    ? trimmed
    : `${trimmed.replace(' ', 'T')}Z`;
  return Date.parse(normalized);
}

export function parsePaymentSignal(
  event: StoredStripeEvent,
): PaymentSignal | null {
  if (event.status !== 'processed' || !event.result_json) return null;
  try {
    const parsed: unknown = JSON.parse(event.result_json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return null;
    const result = parsed as Record<string, unknown>;
    if (
      result.superseded === true ||
      !paymentSignalOutcomes.includes(result.outcome as PaymentSignalOutcome) ||
      result.currency !== 'gbp' ||
      result.amountTotal !== offer.amountPence
    )
      return null;
    const receivedTimestamp = storedTimestamp(event.received_at);
    if (!Number.isFinite(receivedTimestamp)) return null;
    return {
      eventId: event.external_id,
      sessionId: typeof result.sessionId === 'string' ? result.sessionId : null,
      outcome: result.outcome as PaymentSignalOutcome,
      amountPence: offer.amountPence,
      receivedAt: new Date(receivedTimestamp).toISOString(),
      matched: result.matched === true,
      advanced: result.advanced === true,
    };
  } catch {
    return null;
  }
}

export function paymentSignalLabel(outcome: PaymentSignalOutcome) {
  if (outcome === 'cleared_expected') return 'Confirmed money';
  if (outcome === 'cleared_needs_reconciliation')
    return 'Money cleared — reconcile';
  if (outcome === 'pending_expected') return 'Payment pending';
  return 'Payment failed';
}

export function formatGbpPence(amountPence: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amountPence / 100);
}
