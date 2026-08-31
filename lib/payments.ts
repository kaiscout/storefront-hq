import { z } from 'zod';

import { offer } from './offer.ts';

export const stripeWebhookEventSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  created: z.number().int().nonnegative(),
  livemode: z.boolean().optional(),
  data: z.object({
    object: z
      .object({
        id: z.string().min(1).max(255).optional(),
        client_reference_id: z.string().max(255).nullish(),
        customer_details: z
          .object({ email: z.string().max(254).nullish() })
          .nullish(),
        payment_status: z.string().max(50).optional(),
        payment_link: z.string().max(255).nullish(),
        amount_total: z.number().int().nonnegative().nullish(),
        currency: z.string().max(16).nullish(),
      })
      .loose(),
  }),
});

export function isClearedCheckoutPayment(
  eventType: string,
  paymentStatus?: string,
) {
  return (
    eventType === 'checkout.session.async_payment_succeeded' ||
    (eventType === 'checkout.session.completed' && paymentStatus === 'paid')
  );
}

type CheckoutPayment = {
  eventType: string;
  livemode?: boolean;
  paymentStatus?: string;
  paymentLink?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
};

export type StripeRevenueOutcome =
  | 'cleared_expected'
  | 'pending_expected'
  | 'failed_expected'
  | 'unexpected_checkout'
  | 'ignored_event';

export const stripeRevenueOutcomeRank = {
  pending_expected: 1,
  failed_expected: 2,
  cleared_expected: 3,
} as const;

export type StoredStripeRevenueOutcome = keyof typeof stripeRevenueOutcomeRank;

export function shouldApplyStripeSessionOutcome(
  current: { outcome: StoredStripeRevenueOutcome; eventCreated: number },
  incoming: { outcome: StoredStripeRevenueOutcome; eventCreated: number },
) {
  const currentRank = stripeRevenueOutcomeRank[current.outcome];
  const incomingRank = stripeRevenueOutcomeRank[incoming.outcome];
  return (
    incomingRank > currentRank ||
    (incomingRank === currentRank &&
      incoming.eventCreated >= current.eventCreated)
  );
}

export type StripePaymentLeadCandidate = {
  id: string;
  contactEmail?: string | null;
  contactChannel: string;
  contactPermission?: string | null;
  status: string;
};

export type StripePaymentLeadResolution =
  | { matched: true; leadId: string; alreadyPaid: boolean }
  | {
      matched: false;
      reason:
        | 'missing-identity'
        | 'reference-not-found'
        | 'email-mismatch'
        | 'ineligible-channel'
        | 'lead-not-payment-ready'
        | 'email-not-found'
        | 'email-ambiguous';
    };

const stripePaymentChannels = new Set(['direct-email', 'inbound']);
const reconciledPaymentStatuses = new Set([
  'booked',
  'paid',
  'fulfilling',
  'delivered',
]);

function isStripePaymentEligible(candidate: StripePaymentLeadCandidate) {
  return (
    stripePaymentChannels.has(candidate.contactChannel) ||
    candidate.contactPermission === 'scheduled-contact'
  );
}

function normalizedEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

export function resolveStripePaymentLead(
  candidates: StripePaymentLeadCandidate[],
  clientReferenceId?: string | null,
  customerEmail?: string | null,
): StripePaymentLeadResolution {
  const reference = clientReferenceId?.trim() ?? '';
  const email = normalizedEmail(customerEmail);
  if (reference) {
    const lead = candidates.find((candidate) => candidate.id === reference);
    if (!lead) return { matched: false, reason: 'reference-not-found' };
    if (!isStripePaymentEligible(lead))
      return { matched: false, reason: 'ineligible-channel' };
    if (email && normalizedEmail(lead.contactEmail) !== email)
      return { matched: false, reason: 'email-mismatch' };
    if (!reconciledPaymentStatuses.has(lead.status))
      return { matched: false, reason: 'lead-not-payment-ready' };
    return {
      matched: true,
      leadId: lead.id,
      alreadyPaid: ['paid', 'fulfilling', 'delivered'].includes(lead.status),
    };
  }

  if (!email) return { matched: false, reason: 'missing-identity' };
  const eligible = candidates.filter(
    (candidate) =>
      isStripePaymentEligible(candidate) &&
      candidate.status === 'booked' &&
      normalizedEmail(candidate.contactEmail) === email,
  );
  if (!eligible.length) return { matched: false, reason: 'email-not-found' };
  if (eligible.length > 1) return { matched: false, reason: 'email-ambiguous' };
  return { matched: true, leadId: eligible[0].id, alreadyPaid: false };
}

export function classifyStripeRevenueOutcome(
  payment: CheckoutPayment,
  expectedPaymentLinkId: string,
): StripeRevenueOutcome {
  const relevantEvent = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
  ].includes(payment.eventType);
  if (!relevantEvent) return 'ignored_event';

  const paymentLinkId = expectedPaymentLinkId.trim();
  const expectedOffer = Boolean(
    payment.livemode === true &&
    paymentLinkId &&
    payment.paymentLink === paymentLinkId &&
    payment.amountTotal === offer.amountPence &&
    payment.currency?.toLowerCase() === 'gbp',
  );
  if (!expectedOffer) return 'unexpected_checkout';
  if (payment.eventType === 'checkout.session.async_payment_failed')
    return 'failed_expected';
  if (isClearedCheckoutPayment(payment.eventType, payment.paymentStatus))
    return 'cleared_expected';
  return 'pending_expected';
}

export function isExpectedLiveCheckoutPayment(
  payment: CheckoutPayment,
  expectedPaymentLinkId: string,
) {
  return (
    classifyStripeRevenueOutcome(payment, expectedPaymentLinkId) ===
    'cleared_expected'
  );
}
