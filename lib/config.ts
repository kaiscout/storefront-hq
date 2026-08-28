export function publicConfig() {
  const operatorName = process.env.PUBLIC_OPERATOR_NAME?.trim() ?? '';
  const contactEmail = process.env.PUBLIC_CONTACT_EMAIL?.trim() ?? '';
  return {
    operatorName,
    contactEmail,
    calUrl: process.env.CAL_BOOKING_URL?.trim() ?? '',
    checkoutUrl: process.env.CHECKOUT_URL?.trim() ?? '',
    siteUrl: process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '',
    launchReady: Boolean(operatorName && contactEmail),
  };
}

export function integrationState() {
  return {
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
    gmail: Boolean(process.env.AUTOMATION_SECRET),
    cal: Boolean(process.env.CAL_BOOKING_URL && process.env.CAL_WEBHOOK_SECRET),
    payments: Boolean(
      process.env.CHECKOUT_URL && process.env.STRIPE_WEBHOOK_SECRET,
    ),
    identity: publicConfig().launchReady,
  };
}
