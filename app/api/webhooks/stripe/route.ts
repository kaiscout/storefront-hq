import {
  advanceLead,
  claimWebhookEvent,
  completeWebhookEvent,
  failWebhookEvent,
  getLead,
} from '@/lib/database';
import { isClearedCheckoutPayment } from '@/lib/payments';
import { verifyStripeSignature } from '@/lib/security';

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object?: {
      id?: string;
      client_reference_id?: string | null;
      customer_details?: { email?: string | null } | null;
      payment_status?: string;
    };
  };
};

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
  const event = JSON.parse(raw) as StripeEvent;
  if (!(await claimWebhookEvent('stripe', event.id, event.type)))
    return Response.json({ ok: true, duplicate: true });

  try {
    let result: Record<string, unknown> = { ok: true, ignored: true };
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const object = event.data.object;
      const paymentCleared = isClearedCheckoutPayment(
        event.type,
        object?.payment_status,
      );
      if (!paymentCleared) {
        result = { ok: true, ignored: 'payment_pending' };
      } else {
        const lead = object?.client_reference_id
          ? await getLead(object.client_reference_id)
          : null;
        if (lead)
          await advanceLead(lead.id, 'paid', 'Start the Firecrawl audit');
        result = { ok: true, matched: Boolean(lead) };
      }
    }
    await completeWebhookEvent('stripe', event.id);
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Webhook processing failed';
    await failWebhookEvent('stripe', event.id, message);
    return Response.json({ error: message }, { status: 500 });
  }
}
