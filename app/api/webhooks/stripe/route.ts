import {
  advanceLead,
  claimWebhookEvent,
  completeWebhookEvent,
  failWebhookEvent,
  getLead,
  getCommerceSubscription,
  listLeadsByEmail,
  recordCommerceOrder,
  recordCommerceSubscriptionFromCheckout,
  recordStripeCheckoutOutcome,
  setLeadNextAction,
  updateCommerceSubscription,
} from '@/lib/database';
import { productCheckoutConfig } from '@/lib/config';
import {
  classifyProductCheckout,
  classifyStripeRevenueOutcome,
  resolveStripePaymentLead,
  stripeBillingPeriod,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeRevenueOutcomeRank,
  stripeWebhookEventSchema,
  type StoredStripeRevenueOutcome,
  type StripePaymentLeadCandidate,
  type StripeRevenueOutcome,
} from '@/lib/payments';
import { verifyStripeSignature } from '@/lib/security';

function isStoredOutcome(
  outcome: StripeRevenueOutcome,
): outcome is StoredStripeRevenueOutcome {
  return outcome in stripeRevenueOutcomeRank;
}

function candidateFromLead(
  lead: Awaited<ReturnType<typeof getLead>>,
): StripePaymentLeadCandidate | null {
  return lead
    ? {
        id: lead.id,
        contactEmail: lead.contact_email,
        contactChannel: lead.contact_channel,
        contactPermission: lead.contact_permission,
        status: lead.status,
      }
    : null;
}

function paidOrDelivering(status: string) {
  return ['paid', 'fulfilling', 'delivered'].includes(status);
}

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
  if (
    !(await verifyStripeSignature(
      secret,
      raw,
      request.headers.get('stripe-signature'),
    ))
  ) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: 'Invalid Stripe event JSON' },
      { status: 400 },
    );
  }
  const parsed = stripeWebhookEventSchema.safeParse(payload);
  if (!parsed.success)
    return Response.json({ error: 'Invalid Stripe event' }, { status: 400 });
  const event = parsed.data;
  if (!(await claimWebhookEvent('stripe', event.id, event.type)))
    return Response.json({ ok: true, duplicate: true });

  try {
    const object = event.data.object;
    const subscriptionId = stripeSubscriptionId(object);
    const subscriptionEvent = [
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
    ].includes(event.type);
    if (subscriptionEvent) {
      const subscription = subscriptionId
        ? await getCommerceSubscription(subscriptionId)
        : null;
      if (
        !subscriptionId ||
        !subscription ||
        subscription.product_id !== 'seller-campaign-club'
      ) {
        const result = {
          ok: true,
          commerce: true,
          subscription: true,
          applied: false,
          reason: subscriptionId
            ? 'subscription-not-linked'
            : 'missing-subscription-id',
          subscriptionId,
        };
        await completeWebhookEvent('stripe', event.id, result);
        return Response.json(result);
      }

      const period = stripeBillingPeriod(object);
      const invoiceEvent = event.type.startsWith('invoice.');
      const expectedInvoice =
        !invoiceEvent ||
        (event.livemode === true &&
          object.amount_paid === 1_900 &&
          object.currency?.toLowerCase() === 'gbp');
      if (!expectedInvoice) {
        const result = {
          ok: true,
          commerce: true,
          subscription: true,
          applied: false,
          outcome: 'needs_reconciliation',
          reason: 'unexpected-renewal-amount',
          subscriptionId,
          amountPaid: object.amount_paid ?? null,
          currency: object.currency?.toLowerCase() ?? null,
        };
        await completeWebhookEvent('stripe', event.id, result);
        return Response.json(result);
      }

      const status =
        event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : event.type === 'invoice.paid'
            ? 'active'
            : event.type === 'invoice.payment_failed'
              ? 'past_due'
              : (object.status ?? null);
      const update = await updateCommerceSubscription({
        subscriptionId,
        eventId: event.id,
        eventCreated: event.created,
        status,
        customerId: stripeCustomerId(object),
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: object.cancel_at_period_end,
        latestInvoiceId: invoiceEvent ? (object.id ?? null) : null,
      });
      const result = {
        ok: true,
        commerce: true,
        subscription: true,
        applied: update.applied,
        outcome:
          event.type === 'invoice.payment_failed'
            ? 'failed_expected'
            : status === 'canceled'
              ? 'canceled_expected'
              : 'subscription_updated',
        subscriptionId,
        status: update.subscription?.status ?? status,
        currentPeriodEnd: update.subscription?.current_period_end ?? null,
        cancelAtPeriodEnd: Boolean(
          update.subscription?.cancel_at_period_end,
        ),
      };
      await completeWebhookEvent('stripe', event.id, result);
      return Response.json(result);
    }

    const commerceConfig = productCheckoutConfig();
    const productCheckout = classifyProductCheckout(
      {
        eventType: event.type,
        livemode: event.livemode,
        paymentStatus: object.payment_status,
        paymentLink: object.payment_link,
        amountTotal: object.amount_total,
        currency: object.currency,
      },
      Object.fromEntries(
        Object.entries(commerceConfig).map(([productId, config]) => [
          productId,
          config.paymentLinkId,
        ]),
      ),
    );
    if (
      productCheckout.productId &&
      isStoredOutcome(productCheckout.outcome) &&
      object.id
    ) {
      const customerEmail = object.customer_details?.email ?? null;
      const referencedLead = object.client_reference_id
        ? await getLead(object.client_reference_id)
        : null;
      const order = await recordCommerceOrder({
        sessionId: object.id,
        productId: productCheckout.productId,
        eventId: event.id,
        eventCreated: event.created,
        outcome: productCheckout.outcome,
        leadId: referencedLead?.id ?? null,
        customerEmail,
        amountTotal: object.amount_total,
        currency: object.currency,
        paymentStatus: object.payment_status,
      });
      let subscriptionApplied: boolean | null = null;
      if (
        productCheckout.productId === 'seller-campaign-club' &&
        subscriptionId
      ) {
        const subscription = await recordCommerceSubscriptionFromCheckout({
          subscriptionId,
          productId: productCheckout.productId,
          checkoutSessionId: object.id,
          customerId: stripeCustomerId(object),
          customerEmail,
          status:
            productCheckout.outcome === 'cleared_expected'
              ? 'active'
              : productCheckout.outcome === 'failed_expected'
                ? 'past_due'
                : 'incomplete',
          eventId: event.id,
          eventCreated: event.created,
        });
        subscriptionApplied = subscription.applied;
      }
      const result = {
        ok: true,
        commerce: true,
        productId: productCheckout.productId,
        outcome: productCheckout.outcome,
        sessionId: object.id,
        applied: order.applied,
        subscriptionId,
        subscriptionApplied,
        leadId: referencedLead?.id ?? null,
        amountTotal: object.amount_total ?? null,
        currency: object.currency?.toLowerCase() ?? null,
        paymentStatus: object.payment_status ?? null,
      };
      await completeWebhookEvent('stripe', event.id, result);
      return Response.json(result);
    }
    const observedOutcome = classifyStripeRevenueOutcome(
      {
        eventType: event.type,
        livemode: event.livemode,
        paymentStatus: object.payment_status,
        paymentLink: object.payment_link,
        amountTotal: object.amount_total,
        currency: object.currency,
      },
      process.env.STRIPE_PAYMENT_LINK_ID ?? '',
    );
    const actionable = isStoredOutcome(observedOutcome);
    const customerEmail = object.customer_details?.email ?? null;
    const referenceLead =
      actionable && object.client_reference_id
        ? await getLead(object.client_reference_id)
        : null;
    const emailLeads =
      actionable && customerEmail
        ? await listLeadsByEmail(customerEmail, 10)
        : [];
    const candidateMap = new Map<string, StripePaymentLeadCandidate>();
    const referenceCandidate = candidateFromLead(referenceLead);
    if (referenceCandidate)
      candidateMap.set(referenceCandidate.id, referenceCandidate);
    for (const emailLead of emailLeads) {
      const candidate = candidateFromLead(emailLead);
      if (candidate) candidateMap.set(candidate.id, candidate);
    }
    const candidates = Array.from(candidateMap.values());
    const resolution = actionable
      ? resolveStripePaymentLead(
          candidates,
          object.client_reference_id,
          customerEmail,
        )
      : null;
    let lead =
      resolution?.matched === true
        ? (referenceLead ??
          emailLeads.find((candidate) => candidate.id === resolution.leadId) ??
          null)
        : null;

    const sessionState =
      actionable && object.id
        ? await recordStripeCheckoutOutcome({
            sessionId: object.id,
            eventId: event.id,
            eventCreated: event.created,
            outcome: observedOutcome,
            leadId: lead?.id,
            amountTotal: object.amount_total,
            currency: object.currency,
            paymentStatus: object.payment_status,
          })
        : null;
    const superseded = Boolean(sessionState && !sessionState.applied);
    let outcome: StripeRevenueOutcome | 'cleared_needs_reconciliation' =
      observedOutcome;
    let advanced = false;
    let reconciliationReason: string | null = null;

    if (actionable && !object.id) {
      reconciliationReason = 'missing-session-id';
      if (observedOutcome === 'cleared_expected')
        outcome = 'cleared_needs_reconciliation';
      lead = null;
    } else if (actionable && !superseded) {
      if (observedOutcome === 'cleared_expected') {
        if (!lead || !resolution?.matched) {
          outcome = 'cleared_needs_reconciliation';
          reconciliationReason =
            resolution && !resolution.matched
              ? resolution.reason
              : 'lead-not-found';
        } else if (!resolution.alreadyPaid) {
          const transition = await advanceLead(
            lead.id,
            'paid',
            'Start the Firecrawl audit',
          );
          advanced = transition.advanced;
          if (!advanced) {
            lead = await getLead(lead.id);
            if (!lead || !paidOrDelivering(lead.status)) {
              outcome = 'cleared_needs_reconciliation';
              reconciliationReason = 'lead-transition-blocked';
            }
          }
        }
      } else if (lead && resolution?.matched && !resolution.alreadyPaid) {
        await setLeadNextAction(
          lead.id,
          observedOutcome === 'pending_expected'
            ? '[Payment] Checkout started; wait for cleared payment before fulfilment'
            : '[Payment] Payment failed; offer the existing checkout link if the buyer asks to retry',
          ['booked'],
        );
      }
    }

    const result: Record<string, unknown> = {
      ok: true,
      outcome,
      effectiveOutcome: sessionState?.outcome ?? observedOutcome,
      matched: Boolean(lead && resolution?.matched),
      leadId: lead?.id ?? null,
      advanced,
      superseded,
      reconciliationReason,
      sessionId: object.id ?? null,
      eventCreated: event.created,
      amountTotal: object.amount_total ?? null,
      currency: object.currency?.toLowerCase() ?? null,
      paymentStatus: object.payment_status ?? null,
    };
    await completeWebhookEvent('stripe', event.id, result);
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Webhook processing failed';
    await failWebhookEvent('stripe', event.id, message);
    return Response.json({ error: message }, { status: 500 });
  }
}
