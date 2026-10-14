import type { ProductId } from './products.ts';

export const triageSymptoms = [
  {
    id: 'buying-path',
    label: 'Cart, checkout or another buying step is failing',
  },
  {
    id: 'recent-change',
    label: 'Something changed after a theme, app or release',
  },
  {
    id: 'product-page',
    label: 'One product page is not explaining the offer clearly',
  },
  {
    id: 'launch',
    label: 'I am launching or rebuilding a store',
  },
  {
    id: 'campaign',
    label: 'I need a repeatable campaign plan',
  },
] as const;

export type TriageSymptom = (typeof triageSymptoms)[number]['id'];
export type TriageReach = 'everyone' | 'mobile' | 'desktop' | 'unknown';
export type TriageTiming = 'now' | 'recent' | 'ongoing';

export function isTriageSymptom(value: string): value is TriageSymptom {
  return triageSymptoms.some((option) => option.id === value);
}

export function isTriageReach(value: string): value is TriageReach {
  return ['everyone', 'mobile', 'desktop', 'unknown'].includes(value);
}

export function isTriageTiming(value: string): value is TriageTiming {
  return ['now', 'recent', 'ongoing'].includes(value);
}

export type TriagePlan = {
  title: string;
  summary: string;
  productId: ProductId;
  checks: readonly string[];
  acceptance: string;
  evidence: readonly string[];
};

const plans: Record<TriageSymptom, Omit<TriagePlan, 'summary'>> = {
  'buying-path': {
    title: 'Treat this as a public buying-path incident',
    productId: 'store-emergency-check',
    checks: [
      'Open a private browser window and repeat the exact path from entry page to the point of failure. Stop before placing a real order.',
      'Repeat once on a different device class. Note whether the failure follows the account, browser, device or route.',
      'Check the most recent theme, app, market, payment or shipping change before touching unrelated storefront code.',
    ],
    acceptance:
      'The same public journey reaches the expected next step twice on both mobile and desktop, without losing the selected item, variant, quantity or price.',
    evidence: [
      'Exact public URL and local time',
      'Browser, device and viewport',
      'Expected result versus observed result',
      'Screenshot or short screen recording',
    ],
  },
  'recent-change': {
    title: 'Isolate the release regression before adding another fix',
    productId: 'store-emergency-check',
    checks: [
      'Write down the last known-good time and the first known-bad time; avoid relying on memory after more changes land.',
      'Reproduce the smallest broken public journey and compare it with one unaffected route.',
      'Review only releases, theme edits, app changes and market settings made inside that time window.',
    ],
    acceptance:
      'The original failure no longer reproduces on the affected route, while one neighbouring route still behaves normally after the repair.',
    evidence: [
      'Last known-good and first known-bad times',
      'Affected and unaffected public URLs',
      'Release, theme or app change reference',
      'One clean post-repair retest',
    ],
  },
  'product-page': {
    title: 'Diagnose the page’s buying argument, not the whole store',
    productId: 'product-page-rescue',
    checks: [
      'Read only the first screen: can a new visitor identify the product, intended buyer, main outcome and price without scrolling?',
      'List the three questions a cautious buyer still has after the description, then check whether the page answers them with evidence.',
      'Confirm images explain size, use, contents and important differences rather than repeating the same angle.',
    ],
    acceptance:
      'A new reader can state who the product is for, what changes for them, what is included and what to do next without making an assumption.',
    evidence: [
      'One public product URL',
      'Primary buyer and use case',
      'Most common pre-purchase question',
      'Any claim that must not be changed',
    ],
  },
  launch: {
    title: 'Build the launch essentials before adding more channels',
    productId: 'store-launch-kit',
    checks: [
      'Confirm every promoted product has a complete product page, usable images, price, delivery expectation and returns route.',
      'Run the public path from homepage to cart on mobile and desktop without using store-admin access.',
      'Match every launch promise across the homepage, campaign copy, product page and checkout handoff.',
    ],
    acceptance:
      'A first-time visitor can understand the offer, find the key policy answers and reach the expected checkout handoff from each promoted product.',
    evidence: [
      'Launch date and priority market',
      'Homepage and priority product URLs',
      'Shipping and returns pages',
      'Person responsible for implementing fixes',
    ],
  },
  campaign: {
    title: 'Choose one commercial moment and build a complete campaign',
    productId: 'seller-campaign-club',
    checks: [
      'Define one audience, one problem and one useful reason to act now without inventing urgency.',
      'Choose the destination page before writing channel copy; every message should make the same promise.',
      'Set one primary measure and a review date so the next campaign starts with evidence rather than a blank page.',
    ],
    acceptance:
      'The email, social post, banner and destination page use the same offer, audience, timing and next step.',
    evidence: [
      'Campaign date or commercial moment',
      'Priority product and audience',
      'Destination page URL',
      'Primary measure and review date',
    ],
  },
};

export function createTriagePlan(
  symptom: TriageSymptom,
  reach: TriageReach,
  timing: TriageTiming,
): TriagePlan {
  const base = plans[symptom];
  const reachText =
    reach === 'unknown'
      ? 'The affected environment is still unknown.'
      : reach === 'everyone'
        ? 'The problem appears to affect more than one device class.'
        : `The problem currently appears limited to ${reach}.`;
  const timingText =
    timing === 'now'
      ? 'It is happening now, so preserve evidence before making more changes.'
      : timing === 'recent'
        ? 'It began after a recent change, so the release window is useful evidence.'
        : 'It is ongoing, so establish a repeatable baseline before changing the store.';

  return { ...base, summary: `${reachText} ${timingText}` };
}
