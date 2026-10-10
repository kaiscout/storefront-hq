export const productIds = [
  'store-launch-kit',
  'product-page-rescue',
  'store-emergency-check',
  'seller-campaign-club',
] as const;

export type ProductId = (typeof productIds)[number];

export type StorefrontProduct = {
  id: ProductId;
  name: string;
  eyebrow: string;
  priceGbp: number;
  amountPence: number;
  billing: 'one-time' | 'monthly';
  kind: 'download' | 'service' | 'membership';
  promise: string;
  description: string;
  turnaround: string;
  cta: string;
  features: readonly string[];
  deliverables: readonly string[];
  envCheckoutUrl: string;
  envPaymentLinkId: string;
};

export const products: readonly StorefrontProduct[] = [
  {
    id: 'store-launch-kit',
    name: 'Store Launch Kit',
    eyebrow: 'Build the essentials once',
    priceGbp: 39,
    amountPence: 3_900,
    billing: 'one-time',
    kind: 'download',
    promise:
      'A practical launch system for getting an online shop ready to sell.',
    description:
      'Seven editable, no-fluff resources covering positioning, product pages, trust, launch planning and storefront QA.',
    turnaround: 'Download after confirmed payment',
    cta: 'Get the launch kit',
    features: [
      'For new shops and rebuilds',
      'Editable Markdown and CSV files',
      'No subscription or admin access',
    ],
    deliverables: [
      '14-day launch roadmap',
      'Homepage and product-page copy frameworks',
      'Product photography shot planner',
      'Shipping, returns and trust checklist',
      'Campaign planner and sales tracker',
      'Pre-launch storefront QA checklist',
    ],
    envCheckoutUrl: 'STORE_LAUNCH_KIT_CHECKOUT_URL',
    envPaymentLinkId: 'STORE_LAUNCH_KIT_PAYMENT_LINK_ID',
  },
  {
    id: 'product-page-rescue',
    name: 'Product Page Rescue',
    eyebrow: 'Fix one page that should sell better',
    priceGbp: 79,
    amountPence: 7_900,
    billing: 'one-time',
    kind: 'service',
    promise: 'Turn one weak product page into a clearer, stronger buying page.',
    description:
      'A focused rewrite and public-page review for one live product URL. You get copy and recommendations ready to implement.',
    turnaround: 'Delivered within 2 business days',
    cta: 'Rescue my product page',
    features: [
      'One public product page',
      'No store-admin access',
      'Your team publishes the changes',
    ],
    deliverables: [
      'Rewritten title, description and benefit hierarchy',
      'FAQ and objection-handling copy',
      'Search title and meta-description draft',
      'Product-image brief',
      'Five campaign hooks',
      'Public usability observations and acceptance checks',
    ],
    envCheckoutUrl: 'PRODUCT_PAGE_RESCUE_CHECKOUT_URL',
    envPaymentLinkId: 'PRODUCT_PAGE_RESCUE_PAYMENT_LINK_ID',
  },
  {
    id: 'store-emergency-check',
    name: 'Store Emergency Check',
    eyebrow: 'When something looks broken now',
    priceGbp: 99,
    amountPence: 9_900,
    billing: 'one-time',
    kind: 'service',
    promise:
      'Get a fast, evidence-backed answer on one urgent storefront problem.',
    description:
      'We reproduce one reported public-storefront issue, isolate the likely failure point and give your implementer a clear repair and retest brief.',
    turnaround: 'Initial diagnosis within 24 hours',
    cta: 'Check my store problem',
    features: [
      'One reported public journey or defect',
      'Browser evidence and reproduction steps',
      'One public retest after your repair',
    ],
    deliverables: [
      'Reproduction result with time, browser and exact URL',
      'Customer-impact assessment with stated uncertainty',
      'Prioritised repair direction',
      'Clear acceptance test',
      'One retest of the same public issue',
    ],
    envCheckoutUrl: 'STORE_EMERGENCY_CHECK_CHECKOUT_URL',
    envPaymentLinkId: 'STORE_EMERGENCY_CHECK_PAYMENT_LINK_ID',
  },
  {
    id: 'seller-campaign-club',
    name: 'Seller Campaign Club',
    eyebrow: 'Never start a sales campaign from a blank page',
    priceGbp: 19,
    amountPence: 1_900,
    billing: 'monthly',
    kind: 'membership',
    promise: 'A fresh, usable campaign pack for online sellers every month.',
    description:
      'Monthly prompts, copy templates and a simple launch plan for the next promotion—built for small teams that need consistent marketing momentum.',
    turnaround: 'New member pack available after confirmed payment',
    cta: 'Join the campaign club',
    features: [
      'Cancel through Stripe',
      'Practical templates, not a course',
      'Works with any ecommerce platform',
    ],
    deliverables: [
      'Monthly campaign calendar',
      'Four adaptable email templates',
      'Twelve social and short-form prompts',
      'Homepage or promotion-banner copy',
      'Launch and measurement checklist',
      'Member pricing on future one-off campaign packs',
    ],
    envCheckoutUrl: 'SELLER_CAMPAIGN_CLUB_CHECKOUT_URL',
    envPaymentLinkId: 'SELLER_CAMPAIGN_CLUB_PAYMENT_LINK_ID',
  },
] as const;

export function isProductId(value: string): value is ProductId {
  return productIds.includes(value as ProductId);
}

export function getProduct(value: string | null | undefined) {
  return products.find((product) => product.id === value) ?? null;
}

export function productPrice(product: StorefrontProduct) {
  return `£${product.priceGbp}${product.billing === 'monthly' ? '/month' : ''}`;
}
