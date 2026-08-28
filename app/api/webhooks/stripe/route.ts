import {
  getLeadByEmail,
  getLead,
  recordWebhookOnce,
  transitionLead,
} from '@/lib/database';
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
  if (!(await recordWebhookOnce('stripe', event.id, event.type)))
    return Response.json({ ok: true, duplicate: true });

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const object = event.data.object;
    const lead = object?.client_reference_id
      ? await getLead(object.client_reference_id)
      : object?.customer_details?.email
        ? await getLeadByEmail(object.customer_details.email)
        : null;
    if (lead) {
      await transitionLead(lead.id, 'paid', {
        force: true,
        nextAction: 'Start the Firecrawl audit',
      });
    }
    return Response.json({ ok: true, matched: Boolean(lead) });
  }
  return Response.json({ ok: true, ignored: true });
}
