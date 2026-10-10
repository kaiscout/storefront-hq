# Storefront HQ product operating plan

The current goal is to generate trustworthy first revenue with four bounded products instead of relying on one high-ticket offer. A sale is a target, not a guarantee.

## Canonical catalogue

| Product | Price | Fulfilment |
| --- | ---: | --- |
| Store Launch Kit | £39 one-time | Seven editable resources unlocked after confirmed payment |
| Product Page Rescue | £79 one-time | One live product page; delivered within 2 business days |
| Store Emergency Check | £99 one-time | One public-storefront problem; initial diagnosis within 24 hours and one retest |
| Seller Campaign Club | £19/month | One practical campaign pack each month; cancel through Stripe, no minimum term |

[`lib/products.ts`](./lib/products.ts) is canonical. Never change names, prices, billing terms or deliverables without Deniz's approval. The former £895 Storefront QA Sprint is retired for new customers; honour only safely verified historical obligations under their original terms.

## Launch gate

Before enabling any buy button:

1. Publish the exact legal seller/business name and public trading or postal address.
2. Create the correct live Stripe product and price: £39, £79, £99 or £19 monthly in GBP.
3. Configure the matching live Payment Link URL and `plink_...` ID in production.
4. Configure the Stripe completion redirect to `/success?session_id={CHECKOUT_SESSION_ID}`.
5. For digital content, collect the buyer's express consent to immediate supply and acknowledgement of the applicable cancellation-right effect.
6. Enable a practical subscription cancellation route through Stripe.
7. Verify webhook signing and exact order classification without treating a success-page visit or email as proof of payment.

Until the gate is complete, product pages collect enquiries and truthfully state that online checkout is being connected.

## Fulfilment

### Store Launch Kit

- Unlock only for a `cleared_expected` order matching the live Store Launch Kit Payment Link, GBP and 3,900 pence.
- Deliver the protected roadmap, copy frameworks, photography planner, trust checklist, campaign planner, sales tracker and QA checklist.

### Product Page Rescue

- Confirm the one public product URL and the buyer's main concern.
- Deliver the rewritten title, description and benefit hierarchy; FAQ/objection copy; search metadata draft; image brief; five campaign hooks; and public usability observations with acceptance checks within two business days.
- The buyer or their team publishes changes; do not request store-admin access.

### Store Emergency Check

- Confirm one reported public journey or defect.
- Record exact URL, time, browser/environment, reproduction steps and observed result.
- Deliver the impact assessment with uncertainty, prioritized repair direction and acceptance test within 24 hours.
- Perform one public retest of the same issue after the buyer reports the repair.

### Seller Campaign Club

- Unlock the member starter pack only after a cleared £19 live subscription checkout.
- Publish one new practical campaign pack each month.
- Respect cancellation and failed-renewal signals; never represent an inactive subscription as current.

## Acquisition priorities

Use one ordinary-web discovery pass per UTC day and existing inbound channels. Look for recent explicit needs that map cleanly to one product: launching a store, improving one product page, diagnosing an urgent public buying-path issue, or needing consistent ecommerce campaign material.

Public comments, DMs, marketplace messages and community posts remain drafts until Deniz approves the exact final text. Gmail may answer only genuine, unambiguous human inbound in the same thread after the dedicated-account identity, consent, suppression and deduplication gates pass. Never cold-email or use scraped/public addresses as consent.

## Payment and exception rules

- Match live mode, exact Payment Link ID, GBP currency, exact amount and a supported signed event.
- `cleared_expected` is confirmed money; `cleared_needs_reconciliation` is confirmed money with an urgent exception; `pending_expected` is potential; `failed_expected` is actionable recovery.
- Deduplicate by Stripe event and Checkout Session/effective outcome.
- Never unlock delivery from a checkout redirect, screenshot or payment email alone.
- Draft and escalate discounts, custom scope, refunds, disputes, complaints and legal/tax questions.

## Stop conditions

- Stop outreach immediately after any opt-out or channel objection.
- Do not work around platform rules, rotate identities or mine private contacts.
- Do not start service fulfilment or unlock protected files until payment is safely confirmed.
- Do not promise revenue, fabricate results, imply Shopify endorsement or invent scarcity.
- Do not spend Firecrawl credits for routine monitoring, discovery, retries or diagnostics.
