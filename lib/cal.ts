export const calBookingEventTypes = [
  'BOOKING_CREATED',
  'BOOKING_RESCHEDULED',
  'BOOKING_CANCELLED',
] as const;

export type CalBookingEventType = (typeof calBookingEventTypes)[number];

export function isCalBookingEventType(
  eventType: string,
): eventType is CalBookingEventType {
  return (calBookingEventTypes as readonly string[]).includes(eventType);
}

export function calBookingEventRank(eventType: CalBookingEventType) {
  if (eventType === 'BOOKING_CANCELLED') return 3;
  if (eventType === 'BOOKING_RESCHEDULED') return 2;
  return 1;
}

export function calBookingStatus(eventType: CalBookingEventType) {
  return eventType === 'BOOKING_CANCELLED' ? 'cancelled' : 'booked';
}

export function parseCalEventCreated(value?: string) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : null;
}

export function shouldApplyCalBookingEvent(
  current: { eventCreated: number; eventType: CalBookingEventType },
  incoming: { eventCreated: number; eventType: CalBookingEventType },
) {
  return (
    incoming.eventCreated > current.eventCreated ||
    (incoming.eventCreated === current.eventCreated &&
      calBookingEventRank(incoming.eventType) >
        calBookingEventRank(current.eventType))
  );
}
