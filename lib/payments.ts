import { offer } from './offer.ts';

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

export function isExpectedLiveCheckoutPayment(
  payment: CheckoutPayment,
  expectedPaymentLinkId: string,
) {
  const paymentLinkId = expectedPaymentLinkId.trim();
  return Boolean(
    isClearedCheckoutPayment(payment.eventType, payment.paymentStatus) &&
    payment.livemode === true &&
    paymentLinkId &&
    payment.paymentLink === paymentLinkId &&
    payment.amountTotal === offer.amountPence &&
    payment.currency === 'gbp',
  );
}
