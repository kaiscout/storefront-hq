import { products, type ProductId } from './products.ts';

function operatorOwnerEmails() {
  return (process.env.OPS_OWNER_EMAIL ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function hasUnsafeCheckoutUrlCharacter(value: string) {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      codePoint === 0x2028 ||
      codePoint === 0x2029 ||
      '\\%?#'.includes(character)
    )
      return true;
  }
  return false;
}

function liveStripeCheckoutUrl(value: string) {
  if (
    hasUnsafeCheckoutUrlCharacter(value) ||
    /(?:^|\/)\.{1,2}(?:\/|$)/.test(value)
  )
    return '';

  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname.includes('%') ||
      url.pathname.includes('\\')
    )
      return '';

    if (url.hostname === 'buy.stripe.com') {
      const paymentLink = /^\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
      return paymentLink && !paymentLink[1].toLowerCase().startsWith('test_')
        ? url.href
        : '';
    }

    if (
      url.hostname === 'checkout.stripe.com' &&
      /^\/c\/pay\/cs_live_[A-Za-z0-9_-]+\/?$/.test(url.pathname)
    )
      return url.href;

    return '';
  } catch {
    return '';
  }
}

function liveStripeCustomerPortalUrl(value: string) {
  if (hasUnsafeCheckoutUrlCharacter(value)) return '';
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'billing.stripe.com' ||
      url.username ||
      url.password ||
      url.port ||
      !/^\/p\/login\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
    )
      return '';
    return url.href;
  } catch {
    return '';
  }
}

export function productCheckoutConfig() {
  const customerPortalUrl = liveStripeCustomerPortalUrl(
    process.env.STRIPE_CUSTOMER_PORTAL_URL ?? '',
  );
  return Object.fromEntries(
    products.map((product) => {
      const checkoutUrl = liveStripeCheckoutUrl(
        process.env[product.envCheckoutUrl] ?? '',
      );
      const paymentLinkId = process.env[product.envPaymentLinkId]?.trim() ?? '';
      const sellerIdentityReady = Boolean(
        process.env.PUBLIC_BUSINESS_NAME?.trim() &&
        process.env.PUBLIC_BUSINESS_ADDRESS?.trim(),
      );
      return [
        product.id,
        {
          checkoutUrl,
          paymentLinkId,
          ready: Boolean(
            checkoutUrl &&
              paymentLinkId &&
              sellerIdentityReady &&
              (product.id !== 'seller-campaign-club' || customerPortalUrl),
          ),
        },
      ];
    }),
  ) as Record<
    ProductId,
    { checkoutUrl: string; paymentLinkId: string; ready: boolean }
  >;
}

export function checkoutUrlForProduct(productId: ProductId, leadId?: string) {
  const base = productCheckoutConfig()[productId].checkoutUrl;
  if (!base) return '';
  const url = new URL(base);
  if (leadId) url.searchParams.set('client_reference_id', leadId);
  return url.href;
}

export function publicConfig() {
  const operatorName = process.env.PUBLIC_OPERATOR_NAME?.trim() ?? '';
  const businessName = process.env.PUBLIC_BUSINESS_NAME?.trim() ?? '';
  const businessAddress = process.env.PUBLIC_BUSINESS_ADDRESS?.trim() ?? '';
  const contactEmail = process.env.PUBLIC_CONTACT_EMAIL?.trim() ?? '';
  const calUrl = process.env.CAL_BOOKING_URL?.trim() ?? '';
  const configuredCheckoutUrl = process.env.CHECKOUT_URL ?? '';
  const checkoutUrl = liveStripeCheckoutUrl(configuredCheckoutUrl);
  const customerPortalUrl = liveStripeCustomerPortalUrl(
    process.env.STRIPE_CUSTOMER_PORTAL_URL ?? '',
  );
  const siteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
  const operatorOwners = operatorOwnerEmails();
  const productCheckouts = productCheckoutConfig();
  const intakeReady = Boolean(
    operatorName &&
    contactEmail &&
    operatorOwners.length &&
    process.env.AUTOMATION_SECRET?.trim() &&
    siteUrl.startsWith('https://'),
  );
  const launchReady = Boolean(
    operatorName &&
    contactEmail &&
    operatorOwners.length &&
    process.env.FIRECRAWL_API_KEY?.trim() &&
    process.env.FIRECRAWL_WEBHOOK_SECRET?.trim() &&
    process.env.AUTOMATION_SECRET?.trim() &&
    calUrl.startsWith('https://') &&
    process.env.CAL_WEBHOOK_SECRET?.trim() &&
    checkoutUrl &&
    process.env.STRIPE_PAYMENT_LINK_ID?.trim() &&
    process.env.STRIPE_WEBHOOK_SECRET?.trim() &&
    siteUrl.startsWith('https://'),
  );
  return {
    operatorName,
    businessName,
    businessAddress,
    contactEmail,
    calUrl,
    checkoutUrl,
    customerPortalUrl,
    productCheckouts,
    intakeReady,
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
      config.checkoutUrl &&
      process.env.STRIPE_PAYMENT_LINK_ID?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim(),
    ),
    identity: Boolean(config.operatorName && config.contactEmail),
    operatorAccess: operatorOwnerEmails().length > 0,
    site: config.siteUrl.startsWith('https://'),
  };
}
