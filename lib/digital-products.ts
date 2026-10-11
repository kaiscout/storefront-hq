import type { ProductId } from './products.ts';

export type DigitalAsset = {
  filename: string;
  title: string;
  contentType: string;
  body: string;
};

const launchRoadmap = `# Storefront HQ — 14-Day Store Launch Roadmap

Use this plan in order. Mark an item complete only when its acceptance check is true.

## Days 1–2: Positioning
- Write one sentence: “For [buyer], this shop provides [result] through [product difference].”
- Choose one primary buyer and one primary use case for launch.
- Remove homepage claims you cannot prove.

Acceptance check: a first-time visitor can say what you sell, who it is for and why it is different after five seconds.

## Days 3–4: Offer and catalogue
- Select the 3–8 products you will actively launch.
- Record price, variant, stock, fulfilment time and margin assumptions.
- Choose one primary product for every campaign link.

Acceptance check: every advertised variant can be selected and added to cart at the displayed price.

## Days 5–6: Product pages
- Complete the Product Page Framework for each launch product.
- Add original product images covering scale, detail, context and packaging.
- Put delivery timing, returns and material/care details near the buying decision.

Acceptance check: the page answers “Is it for me?”, “What arrives?”, “When?” and “What if it is wrong?” without opening another tab.

## Days 7–8: Trust and policies
- Publish contact, shipping, returns and privacy pages.
- Match every promotional promise to policy and checkout behaviour.
- Remove fabricated scarcity, unsupported reviews and copied badges.

Acceptance check: no promise contradicts another public page.

## Days 9–10: Buying journey
- Test homepage → collection → product → cart on mobile and desktop.
- Test every variant, discount and delivery threshold used at launch.
- Check empty, error and sold-out states.

Acceptance check: a new visitor can reach the payment step without confusion or a broken path.

## Days 11–12: Campaign build
- Complete the Campaign Planner.
- Write one message for one audience and one destination page.
- Prepare launch, reminder and final-call versions without false urgency.

Acceptance check: every campaign link lands on a page that continues the same promise.

## Days 13–14: Rehearsal and release
- Run the QA checklist in a clean browser and on a real phone.
- Fix launch blockers first; record non-blocking improvements separately.
- Record baseline orders, conversion and returns only from systems you lawfully control.

Acceptance check: the named owner approves the launch checklist and knows how to pause promotion if the buying path fails.
`;

const pageFramework = `# Storefront HQ — Product Page Copy Framework

## 1. Product title
Use the clearest product name first. Add a meaningful differentiator only when it helps selection.

## 2. One-line promise
[Product] helps [specific buyer] achieve [observable result] without [important friction].

## 3. Three decision-making benefits
1. **Benefit:** what improves for the buyer. **Proof:** feature, material, specification or demonstration that supports it.
2. **Benefit:** …
3. **Benefit:** …

## 4. What arrives
- Quantity and dimensions
- Materials or ingredients
- Included accessories
- Packaging and condition

## 5. Best for / not for
**Best for:** [three honest use cases]
**Not designed for:** [important limitation]

## 6. Selection help
Explain variants in buyer language. Include size, fit, colour or compatibility guidance before the add-to-cart control.

## 7. Delivery and returns
- Dispatch estimate:
- Delivery estimate and region:
- Return window and condition:
- Exceptions:

## 8. FAQ
Answer the five questions that could stop a reasonable customer buying. Avoid questions invented only to repeat marketing claims.

## 9. Search fields
SEO title (approximately 50–60 characters):
Meta description (approximately 140–160 characters):

## Acceptance check
Ask someone unfamiliar with the product to describe what they would receive, which option to select, the likely delivery window and the return rule.
`;

const homeFramework = `# Storefront HQ — Homepage Framework

1. **Announcement:** one current operational or promotional fact; link its terms.
2. **Hero:** what you sell, who it helps, one credible reason to care, one primary action.
3. **Shop path:** 3–6 categories or use cases written in customer language.
4. **Proof:** specific materials, process, independent evidence or verified customer feedback. Label demonstrations honestly.
5. **Featured product:** a real buying choice, not another “learn more” loop.
6. **Delivery and returns:** the essential promise in plain language with policy links.
7. **About:** why this shop exists and who is accountable.
8. **Footer:** contact, shipping, returns, privacy, terms and business details where required.

## Five-second check
Cover the logo and ask: What does this business sell? Who is it for? What should I click next?
`;

const trustChecklist = `# Storefront HQ — Shipping, Returns and Trust Checklist

## Shipping
- [ ] Dispatch time is separate from carrier transit time.
- [ ] Regions, fees and free-shipping thresholds are explicit.
- [ ] Product-page, announcement and checkout promises agree.
- [ ] Duties and import-tax uncertainty is explained where relevant.

## Returns
- [ ] Return window starts from a clearly defined event.
- [ ] Product-condition requirements are understandable.
- [ ] Exclusions and return postage responsibility are explicit.
- [ ] Refund timing and method are stated.

## Product trust
- [ ] Claims are supported and limitations are visible.
- [ ] Reviews are genuine, attributable and not selectively misleading.
- [ ] Images accurately represent the supplied product.
- [ ] Safety, compatibility and age restrictions are shown where relevant.

## Business trust
- [ ] A working contact route is easy to find.
- [ ] Policies identify the responsible business where legally required.
- [ ] Privacy and cookie behaviour match the site.
- [ ] Payment, platform or certification endorsement is never implied without permission.

This checklist is operational guidance, not legal advice. Check the rules that apply to your products and selling regions.
`;

const qaChecklist = `# Storefront HQ — Pre-Launch QA Checklist

Test on a real phone and desktop in a clean browser. Record the exact URL, time, browser, steps, observed result and expected result for every failure.

- [ ] Homepage primary action reaches the intended page.
- [ ] Collection filters, sorting and pagination preserve valid results.
- [ ] Product media loads and meaningful images have useful alternative text.
- [ ] Every available variant selects, prices and adds correctly.
- [ ] Sold-out combinations cannot be bought accidentally.
- [ ] Cart retains product, variant, quantity and displayed price.
- [ ] Promotion codes and thresholds match public claims.
- [ ] Delivery and returns links work from product and footer areas.
- [ ] Contact and policy pages load without placeholder content.
- [ ] Forms show a useful success and failure state.
- [ ] Keyboard focus is visible and controls have understandable names.
- [ ] Campaign URLs open the intended live page with no redirect loop.
- [ ] Checkout can be reached, but do not place a real order unless authorised.
- [ ] Analytics and consent tools are checked by an authorised owner.

Prioritise blockers to product selection, cart, checkout, pricing or trust before cosmetic inconsistencies.
`;

const campaignPlanner = `campaign_name,audience,customer_problem,offer_or_message,destination_url,launch_date,owner,primary_metric,status,notes
Example launch campaign,First-time buyers,Unsure which option fits,Plain-language comparison guide,https://example.com/pages/compare,YYYY-MM-DD,Name,Qualified product-page visits,Draft,Replace this row
`;

const salesTracker = `date,channel,campaign,spend_gbp,sessions,orders,revenue_gbp,refunds_gbp,notes
YYYY-MM-DD,Email,Example launch,0,0,0,0,0,Use figures from systems you control
`;

const photoPlanner = `shot_number,purpose,scene_or_angle,product_detail_to_prove,format,owner,status,notes
1,Cover image,Clear product on uncluttered background,Shape and supplied colour,Square,Name,Planned,
2,Scale,Product beside familiar object or in use,Real-world size,Portrait,Name,Planned,
3,Detail,Close-up,Material or finish,Square,Name,Planned,
4,Use,Primary use case,How the product works,Portrait,Name,Planned,
5,Package,Everything the buyer receives,Included contents,Landscape,Name,Planned,
`;

const monthlyCampaigns = [
  ['January reset', 'Help customers choose one useful improvement for the new year.'],
  ['Small act of care', 'Show how the product helps someone make an honest, thoughtful gesture.'],
  ['Spring refresh', 'Connect the product to a practical seasonal reset without inventing urgency.'],
  ['Buyer confidence', 'Remove the leading objection with clear selection help and proof.'],
  ['Everyday upgrade', 'Demonstrate a small, repeatable improvement in ordinary use.'],
  ['Mid-year favourite', 'Give one proven product a focused story instead of promoting everything.'],
  ['Summer use', 'Show the product in a real seasonal situation, including its limitations.'],
  ['Back-to-routine', 'Help customers prepare for a return to work, school or regular habits.'],
  ['Autumn preparation', 'Solve one concrete preparation problem before colder or busier weeks.'],
  ['Helpful comparison', 'Make it easier to choose between options before peak-season campaigns.'],
  ['Gift decision help', 'Explain who the product suits, what arrives and the delivery cut-off.'],
  ['Year-end thanks', 'Combine a genuine thank-you with a clear final useful offer for the year.'],
] as const;

function campaignClubAsset(referenceDate: Date): DigitalAsset {
  const year = referenceDate.getUTCFullYear();
  const monthIndex = referenceDate.getUTCMonth();
  const month = String(monthIndex + 1).padStart(2, '0');
  const monthName = referenceDate.toLocaleString('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  });
  const [campaignName, campaignBrief] = monthlyCampaigns[monthIndex];
  const body = `# Seller Campaign Club — ${monthName} ${year} Campaign Pack

## Campaign: ${campaignName}
${campaignBrief} Choose one customer problem your product genuinely resolves and use one destination page throughout.

## Four adaptable emails
1. **Problem recognition** — Subject: A simpler way to [customer task]. Describe the familiar situation without exaggeration, then link to the most relevant product or guide.
2. **Decision help** — Subject: Which [product type] is right for you? Explain who each option is and is not for, then answer the leading objection.
3. **Proof in use** — Subject: See how [product] works in practice. Show the product in context and name the material, specification or process that supports the claim.
4. **Useful reminder** — Subject: Before you choose [product type]. Summarise the offer, delivery and returns facts, and include only a real deadline if one exists.

## Twelve short-form prompts
1. The most common selection mistake and how to avoid it.
2. A close-up that proves one material or construction claim.
3. Three situations where the product is genuinely useful.
4. Who the product is not designed for.
5. Everything included in the package.
6. One customer question answered in plain language.
7. A simple comparison between two real options.
8. A care or maintenance tip customers can save.
9. A behind-the-scenes quality or packing check.
10. The delivery timeline from order to arrival.
11. A founder decision that improved the product.
12. One limitation customers should know before buying.

## Homepage and promotion banner
**Headline:** [Specific customer result]
**Supporting line:** [Who it is for] + [credible differentiator]
**Button:** Shop [clear category]

## Seven-day launch plan
- Day 1: confirm the audience, claim, evidence and destination URL.
- Day 2: update the destination page so it continues the same promise.
- Day 3: prepare the four emails and twelve short-form variations.
- Day 4: test every link, variant, price, delivery promise and mobile path.
- Day 5: publish the first message and record the baseline.
- Day 6: answer genuine questions and correct confusing copy.
- Day 7: review qualified clicks, product-page sessions, orders and refunds.

## Measurement checklist
- [ ] Campaign links use the intended live destination.
- [ ] Delivered emails and qualified clicks are recorded separately.
- [ ] Orders and refunds come from systems you lawfully control.
- [ ] Customer questions are retained as copy-improvement evidence.
- [ ] Impressions and drafts are not reported as sales.

Do not invent scarcity, testimonials, discounts or revenue claims. Keep a copy of this pack; later access depends on an active subscription.
`;
  return {
    filename: `campaign-club-${year}-${month}.md`,
    title: `${monthName} ${year} campaign pack`,
    contentType: 'text/markdown; charset=utf-8',
    body,
  };
}

export const digitalAssets: Partial<
  Record<ProductId, readonly DigitalAsset[]>
> = {
  'store-launch-kit': [
    {
      filename: '01-14-day-launch-roadmap.md',
      title: '14-day launch roadmap',
      contentType: 'text/markdown; charset=utf-8',
      body: launchRoadmap,
    },
    {
      filename: '02-page-copy-frameworks.md',
      title: 'Homepage and product-page frameworks',
      contentType: 'text/markdown; charset=utf-8',
      body: `${pageFramework}\n\n---\n\n${homeFramework}`,
    },
    {
      filename: '03-shipping-returns-trust.md',
      title: 'Shipping, returns and trust checklist',
      contentType: 'text/markdown; charset=utf-8',
      body: trustChecklist,
    },
    {
      filename: '04-pre-launch-qa.md',
      title: 'Pre-launch QA checklist',
      contentType: 'text/markdown; charset=utf-8',
      body: qaChecklist,
    },
    {
      filename: '05-campaign-planner.csv',
      title: 'Campaign planner',
      contentType: 'text/csv; charset=utf-8',
      body: campaignPlanner,
    },
    {
      filename: '06-sales-tracker.csv',
      title: 'Sales tracker',
      contentType: 'text/csv; charset=utf-8',
      body: salesTracker,
    },
    {
      filename: '07-product-photo-planner.csv',
      title: 'Product photo planner',
      contentType: 'text/csv; charset=utf-8',
      body: photoPlanner,
    },
  ],
};

export function getDigitalAssets(
  productId: ProductId,
  referenceDate = new Date(),
) {
  if (productId === 'seller-campaign-club')
    return [campaignClubAsset(referenceDate)] as const;
  return digitalAssets[productId] ?? [];
}

export function getDigitalAsset(
  productId: ProductId,
  filename: string,
  referenceDate = new Date(),
) {
  return (
    getDigitalAssets(productId, referenceDate).find(
      (asset) => asset.filename === filename,
    ) ?? null
  );
}
