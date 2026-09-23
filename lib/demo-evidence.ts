import type { EvidenceFinding } from './report';

export function demoFindings(checkedAt: string): EvidenceFinding[] {
  return [
    {
      id: 'demo-variant', url: '/demo/before', title: 'Navy selection adds the Natural variant', severity: 'high', category: 'variant-selection',
      evidence: 'In the controlled fixture, selecting Navy and adding the bag produces a cart line labelled Natural. This is a seeded defect, not a merchant observation.',
      recommendation: 'Fix: Pass the selected variant into the cart action instead of a fixed default.\nWhy it matters: A selection mismatch could cause an unwanted order or make a customer abandon the journey. No customer behavior or revenue was measured.\nSuggested owner: Theme / storefront developer\nEffort: Fixture correction is a small state-binding change; a merchant implementation requires theme and app review.\nRetest: Add Navy and Natural separately in fresh sessions. Each cart line must match the selected colour on mobile and desktop.',
      screenshot_url: '/demo-evidence/before-mobile.png', found_at: checkedAt,
    },
    {
      id: 'demo-shipping', url: '/demo/before', title: 'Free-delivery promise conflicts with the cart charge', severity: 'high', category: 'delivery-promise',
      evidence: 'The fixture promises free delivery over £60. Its £69 item still produces a £6 delivery charge and £75 total before correction.',
      recommendation: 'Fix: Use the same delivery rule for the promise and cart calculation.\nWhy it matters: Unexpected charges can undermine confidence in the offer. This is a potential friction assessment, not proof of lost sales.\nSuggested owner: Merchant shipping owner + storefront developer\nEffort: Confirm the actual destinations, thresholds and delivery rules before estimating merchant work.\nRetest: For this £69 fixture order, delivery must be £0 and total £69. In a merchant store also test below/at/above each real threshold and supported market.',
      screenshot_url: '/demo-evidence/before-mobile.png', found_at: checkedAt,
    },
    {
      id: 'demo-guide', url: '/demo/before/size-guide', referring_url: '/demo/before', title: 'Linked size guide returns HTTP 404', severity: 'medium', category: 'broken-route', status_code: 404,
      evidence: 'The fixture product’s “Read the size guide” link leads to a missing page. The corrected version serves the bag dimensions.',
      recommendation: 'Fix: Restore the intended guide and point the product link to the working destination.\nWhy it matters: A buyer cannot confirm dimensions through this route. We have not measured the effect on purchases.\nSuggested owner: Merchant content owner + theme developer\nEffort: Content and link repair; confirm theme publishing access and check other links before estimating.\nRetest: Follow the size-guide link from the corrected product. Require HTTP 200, visible bag dimensions, and a working return link on mobile and desktop.',
      screenshot_url: '/demo-evidence/before-guide.png', found_at: checkedAt,
    },
  ];
}
