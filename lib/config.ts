function operatorOwnerEmails() {
  return (process.env.OPS_OWNER_EMAIL ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

export function publicConfig() {
  const operatorName = process.env.PUBLIC_OPERATOR_NAME?.trim() ?? '';
  const contactEmail = process.env.PUBLIC_CONTACT_EMAIL?.trim() ?? '';
  const calUrl = process.env.CAL_BOOKING_URL?.trim() ?? '';
  const checkoutUrl = process.env.CHECKOUT_URL?.trim() ?? '';
  const siteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
  const operatorOwners = operatorOwnerEmails();
  const launchReady = Boolean(
    operatorName &&
    contactEmail &&
    operatorOwners.length &&
    process.env.FIRECRAWL_API_KEY?.trim() &&
    process.env.FIRECRAWL_WEBHOOK_SECRET?.trim() &&
    process.env.AUTOMATION_SECRET?.trim() &&
    calUrl.startsWith('https://') &&
    process.env.CAL_WEBHOOK_SECRET?.trim() &&
    checkoutUrl.startsWith('https://') &&
    process.env.STRIPE_WEBHOOK_SECRET?.trim() &&
    siteUrl.startsWith('https://'),
  );
  return {
    operatorName,
    contactEmail,
    calUrl,
    checkoutUrl,
    siteUrl,
    launchReady,
  };
}

export function integrationState() {
  const config = publicConfig();
  return {
    firecrawl: Boolean(
      process.env.FIRECRAWL_API_KEY && process.env.FIRECRAWL_WEBHOOK_SECRET,
    ),
    gmail: Boolean(process.env.AUTOMATION_SECRET),
    cal: Boolean(process.env.CAL_BOOKING_URL && process.env.CAL_WEBHOOK_SECRET),
    payments: Boolean(
      process.env.CHECKOUT_URL && process.env.STRIPE_WEBHOOK_SECRET,
    ),
    identity: Boolean(config.operatorName && config.contactEmail),
    operatorAccess: operatorOwnerEmails().length > 0,
    site: config.siteUrl.startsWith('https://'),
  };
}
