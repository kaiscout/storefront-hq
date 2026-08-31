import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calBookingEventRank,
  calBookingStatus,
  isCalBookingEventType,
  parseCalEventCreated,
  shouldApplyCalBookingEvent,
} from '../lib/cal.ts';

void test('Cal booking event parsing accepts only state-changing events with valid time', () => {
  assert.equal(isCalBookingEventType('BOOKING_CREATED'), true);
  assert.equal(isCalBookingEventType('BOOKING_RESCHEDULED'), true);
  assert.equal(isCalBookingEventType('BOOKING_CANCELLED'), true);
  assert.equal(isCalBookingEventType('MEETING_ENDED'), false);
  assert.equal(calBookingStatus('BOOKING_CANCELLED'), 'cancelled');
  assert.equal(calBookingStatus('BOOKING_RESCHEDULED'), 'booked');
  assert.equal(
    parseCalEventCreated('2026-08-31T05:00:00.000Z'),
    1_788_152_400_000,
  );
  assert.equal(parseCalEventCreated('not-a-date'), null);
  assert.equal(parseCalEventCreated(), null);
});

void test('Cal booking precedence prevents late and equal-time state regression', () => {
  const created = { eventCreated: 100, eventType: 'BOOKING_CREATED' as const };
  const cancelled = {
    eventCreated: 300,
    eventType: 'BOOKING_CANCELLED' as const,
  };
  const lateReschedule = {
    eventCreated: 200,
    eventType: 'BOOKING_RESCHEDULED' as const,
  };
  assert.equal(shouldApplyCalBookingEvent(cancelled, lateReschedule), false);
  assert.equal(shouldApplyCalBookingEvent(created, lateReschedule), true);
  assert.equal(
    shouldApplyCalBookingEvent(
      { eventCreated: 300, eventType: 'BOOKING_RESCHEDULED' },
      { eventCreated: 200, eventType: 'BOOKING_CANCELLED' },
    ),
    false,
  );
  assert.equal(
    shouldApplyCalBookingEvent(
      { eventCreated: 300, eventType: 'BOOKING_RESCHEDULED' },
      { eventCreated: 300, eventType: 'BOOKING_CANCELLED' },
    ),
    true,
  );
  assert.equal(
    shouldApplyCalBookingEvent(
      { eventCreated: 300, eventType: 'BOOKING_CANCELLED' },
      { eventCreated: 300, eventType: 'BOOKING_CREATED' },
    ),
    false,
  );
  assert.ok(
    calBookingEventRank('BOOKING_CANCELLED') >
      calBookingEventRank('BOOKING_RESCHEDULED'),
  );
});
