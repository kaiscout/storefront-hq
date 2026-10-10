# Storefront HQ

Storefront HQ sells a four-product ladder for online sellers:

- **Store Launch Kit — £39 one-time:** seven editable launch resources, available after confirmed payment.
- **Product Page Rescue — £79 one-time:** a focused rewrite and public review of one live product page, delivered within two business days.
- **Store Emergency Check — £99 one-time:** an evidence-backed diagnosis of one urgent public-storefront problem, with an initial diagnosis within 24 hours and one public retest after repair.
- **Seller Campaign Club — £19/month:** a monthly campaign pack of practical prompts, templates and a simple launch plan, cancellable through Stripe with no minimum term.

The canonical catalogue lives in [`lib/products.ts`](./lib/products.ts). New-customer copy, checkout configuration and fulfilment must match those names, prices, billing terms and deliverables. [`lib/offer.ts`](./lib/offer.ts) is retained only to reconcile and fulfil any genuine historical Storefront QA Sprint orders; that offer is retired for new customers.

## Checkout and fulfilment safety

- A product is not buyable until its exact live Stripe Payment Link URL and object ID are configured together with the public legal seller name and trading/postal address.
- A success-page visit or payment email is not proof of payment. The Stripe webhook must match live mode, the configured Payment Link ID, GBP currency and the exact product amount.
- Digital downloads require a cleared, deduplicated Storefront HQ order.
- Service work starts only after a safely matched cleared order. Storefront HQ works from public URLs and does not require merchant-admin access.
- The `/start` form is an enquiry route only. It does not verify email ownership or grant permission for an automated email.

## What is automated

- Enquiry capture, suppression and consent-aware Gmail thread handling
- Signed Stripe and booking webhook handling
- Exact per-product payment classification and durable `commerce_orders`
- Protected launch-kit and member-pack downloads after confirmed payment
- Service onboarding from the confirmed-order success page
- Six-hour operations monitoring and one ordinary-web buyer-intent discovery pass per UTC day
- Historical payment and delivery reconciliation for genuine prior orders

## What is deliberately not automated

- Cold email, scraped contacts or unsolicited public posting
- Publishing marketplace, community or social replies without human approval
- Discounts, custom scope, refunds, disputes or legal/tax decisions
- Claims of guaranteed conversion or revenue uplift
- Unlocking a download or starting work from an unverified payment signal
- Firecrawl spending for routine monitoring, discovery or diagnostics

See [RUNBOOK.md](./RUNBOOK.md) for the operating plan and [automations/google-apps-script/SETUP.md](./automations/google-apps-script/SETUP.md) for the dedicated Gmail bridge.

## Local checks

```bash
npm test
npm run lint
npm run build
```
