# Storefront HQ

Storefront HQ sells one fixed-price product: the **Storefront QA Sprint**, a **£895, 48-hour Shopify storefront QA sprint plus 30 days of regression watch**.

The canonical brand, product, price, and scope values live in [`lib/offer.ts`](./lib/offer.ts). Public copy and operating documentation must mirror those constants: up to 250 public pages, 12 selected findings, an eight-finding evidence guarantee, a 20-minute handoff, and daily observation of 10 agreed routes for 30 days.

The acquisition model is intent-only. Firecrawl locates recent public requests for Shopify QA/CRO/readiness help. An operator verifies the request and its channel rules, confirms one public-storefront issue, and approves a tailored proposal. Gmail creates a draft but never auto-sends. Replies, Cal bookings, payments and Firecrawl audit events advance a durable D1 pipeline.

## What is automated

- Daily Firecrawl search for fresh, explicit buyer-intent requests
- Dedupe, scoring and a human qualification gate
- Firecrawl mobile preview and evidence capture
- Proposal drafting for an approved reply channel
- Bounded, idempotent Gmail draft creation for qualified requests and consented website enquiries, plus labelled-thread reply sync
- Immediate opt-out suppression and deterministic reply classification
- Signed Cal, Stripe and Firecrawl webhook handling
- Session-level Stripe outcome precedence, exact lead reconciliation, money alerts and payment-to-audit handoff
- A visible reconciliation state when cleared money cannot safely advance fulfilment
- Daily comparison of up to 10 operator-entered, client-approved storefront routes for 30 days after payment

## What is deliberately not automated

- Unsolicited commercial Gmail sending
- Scraping private contact details
- Sending marketplace leads off-platform
- Claims of conversion or revenue uplift
- Final evidence validation, refunds or ambiguous reply decisions
- Resolving an ambiguous or mismatched cleared payment before fulfilment

See [RUNBOOK.md](./RUNBOOK.md) for the seven-day operating plan, [LIVE_OPPORTUNITIES_2026-08-28.md](./LIVE_OPPORTUNITIES_2026-08-28.md) for the time-stamped starting pipeline, and [automations/google-apps-script/SETUP.md](./automations/google-apps-script/SETUP.md) for the dedicated Gmail bridge.

## Local checks

```bash
npm test
npm run lint
npm run build
```
