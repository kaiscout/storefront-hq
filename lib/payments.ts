export function isClearedCheckoutPayment(
  eventType: string,
  paymentStatus?: string,
) {
  return (
    eventType === 'checkout.session.async_payment_succeeded' ||
    (eventType === 'checkout.session.completed' && paymentStatus === 'paid')
  );
}
