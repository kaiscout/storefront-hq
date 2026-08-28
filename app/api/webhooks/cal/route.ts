import {
  getLeadByEmail,
  recordWebhookOnce,
  transitionLead,
} from '@/lib/database';
import { verifyHexHmac } from '@/lib/security';

type CalPayload = {
  triggerEvent?: string;
  createdAt?: string;
  payload?: {
    uid?: string;
    bookingUid?: string;
    attendees?: Array<{ email?: string }>;
  };
};

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.CAL_WEBHOOK_SECRET ?? '';
  const signature = request.headers.get('x-cal-signature-256');
  if (!(await verifyHexHmac(secret, raw, signature))) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  const event = JSON.parse(raw) as CalPayload;
  const eventType = event.triggerEvent ?? 'UNKNOWN';
  const eventId =
    event.payload?.uid ??
    event.payload?.bookingUid ??
    `${eventType}:${event.createdAt ?? ''}`;
  if (!(await recordWebhookOnce('cal', eventId, eventType)))
    return Response.json({ ok: true, duplicate: true });

  const email = event.payload?.attendees?.[0]?.email;
  const lead = email ? await getLeadByEmail(email) : null;
  if (lead) {
    if (
      eventType === 'BOOKING_CREATED' ||
      eventType === 'BOOKING_RESCHEDULED'
    ) {
      await transitionLead(lead.id, 'booked', {
        force: true,
        nextAction: 'Run the fit call and send the payment link',
      });
    } else if (eventType === 'BOOKING_CANCELLED') {
      await transitionLead(lead.id, 'replied', {
        force: true,
        nextAction: 'Booking cancelled; decide whether to follow up',
      });
    }
  }
  return Response.json({ ok: true, matched: Boolean(lead) });
}
