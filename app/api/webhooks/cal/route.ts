import {
  advanceLead,
  claimWebhookEvent,
  completeWebhookEvent,
  failWebhookEvent,
  getLeadByEmail,
  setLeadNextAction,
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
  const bookingId = event.payload?.uid ?? event.payload?.bookingUid ?? 'none';
  const eventId = `${bookingId}:${eventType}:${event.createdAt ?? ''}`;
  if (!(await claimWebhookEvent('cal', eventId, eventType)))
    return Response.json({ ok: true, duplicate: true });
  try {
    const email = event.payload?.attendees?.[0]?.email;
    const lead = email ? await getLeadByEmail(email) : null;
    if (lead) {
      if (
        eventType === 'BOOKING_CREATED' ||
        eventType === 'BOOKING_RESCHEDULED'
      ) {
        await advanceLead(
          lead.id,
          'booked',
          'Run the fit call and send the payment link',
        );
      } else if (eventType === 'BOOKING_CANCELLED') {
        await setLeadNextAction(
          lead.id,
          'Booking cancelled; decide whether to follow up',
          ['replied', 'booked'],
        );
      }
    }
    await completeWebhookEvent('cal', eventId);
    return Response.json({ ok: true, matched: Boolean(lead) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Webhook processing failed';
    await failWebhookEvent('cal', eventId, message);
    return Response.json({ error: message }, { status: 500 });
  }
}
