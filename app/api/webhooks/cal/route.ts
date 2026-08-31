import {
  claimWebhookEvent,
  completeWebhookEvent,
  failWebhookEvent,
  recordCalBookingEvent,
} from '@/lib/database';
import { verifyHexHmac } from '@/lib/security';

type CalPayload = {
  triggerEvent?: string;
  createdAt?: string;
  payload?: {
    uid?: string;
    bookingUid?: string;
    attendees?: Array<{ email?: string }>;
    startTime?: string;
    endTime?: string;
  };
};

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.CAL_WEBHOOK_SECRET ?? '';
  const signature = request.headers.get('x-cal-signature-256');
  if (!(await verifyHexHmac(secret, raw, signature))) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  let event: CalPayload;
  try {
    event = JSON.parse(raw) as CalPayload;
  } catch {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const eventType = event.triggerEvent ?? 'UNKNOWN';
  const bookingId = event.payload?.uid ?? event.payload?.bookingUid;
  if (!bookingId || bookingId.length > 300)
    return Response.json(
      { error: 'Missing booking identity' },
      { status: 400 },
    );
  const eventId = `${bookingId}:${eventType}:${event.createdAt ?? ''}`;
  if (!(await claimWebhookEvent('cal', eventId, eventType)))
    return Response.json({ ok: true, duplicate: true });
  try {
    const email = event.payload?.attendees?.[0]?.email;
    const booking = await recordCalBookingEvent({
      bookingUid: bookingId,
      eventId,
      eventType,
      attendeeEmail: email,
      startsAt: event.payload?.startTime,
      endsAt: event.payload?.endTime,
    });
    await completeWebhookEvent('cal', eventId, booking);
    return Response.json({ ok: true, ...booking });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Webhook processing failed';
    await failWebhookEvent('cal', eventId, message);
    return Response.json({ error: message }, { status: 500 });
  }
}
