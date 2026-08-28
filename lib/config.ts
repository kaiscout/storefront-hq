function operatorOwnerEmails() {
  return (process.env.OPS_OWNER_EMAIL ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function isLiveStripeCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname.includes('%') ||
      url.pathname.includes('\\')
    )
      return false;

    if (url.hostname === 'buy.stripe.com') {
      const paymentLink = /^\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
      return Boolean(
        paymentLink && !paymentLink[1].toLowerCase().startsWith('test_'),
      );
    }

    if (url.hostname === 'checkout.stripe.com')
      return /^\/c\/pay\/cs_live_[A-Za-z0-9_-]+\/?$/.test(url.pathname);

    return false;
  } catch {
    return false;
  }
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
    isLiveStripeCheckoutUrl(checkoutUrl) &&
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
