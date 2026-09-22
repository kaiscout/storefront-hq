# Firecrawl credit conservation

Effective September 22, 2026. Applies to Site requests, not independent manual
use of the same Firecrawl account/API key.

- Research is limited to 50 reserved credits per UTC day and 1,500 per verified
  Firecrawl billing period. At least 2,000 credits remain unavailable to research.
- Paid audits and paid regression checks have separate priority. Crawls reserve
  all 250 pages before starting; the offer and its payment gates are unchanged.
- The initial verified cycle balance less a 100-credit safety buffer is a durable
  total reservation ceiling. This ceiling is not raised by later status checks.
  Paid delivery that cannot fit is an actionable exception, not silently skipped.
- Discovery searches five results each in the US and UK without automatically
  scraping all results (at most four search credits). It runs at most once per
  23 hours per market, allowing the existing daily scheduler to keep its cadence.
  Freshness, explicit intent, and human evidence review remain mandatory.
- Research URLs are attempted no more than once per two hours. Daily client
  watch routes have a 23-hour cooldown. Cached/duplicate attempts do not update
  snapshot timestamps or pretend to be fresh captures.
- Persistent, atomic D1 reservations prevent concurrent workers or retries from
  exceeding these ceilings. Failed/ambiguous attempts retain their reservation.
  No API key, URL content, customer data, or scraped text is kept in the ledger.
- Credit balance and billing dates are checked live before spending. Missing
  credentials, invalid billing periods or unavailable budget storage stop spend.
- Search-only discovery avoids high-cost result scraping. Scrapes/crawls disable
  PDF parsing; direct X/Twitter scraping is rejected. No LLM extraction or agents.
- A protected `GET /api/operations/firecrawl` refreshes status without scraping.
  Source-watch also refreshes it. The `firecrawl_credit_periods` and
  `firecrawl_spend` tables provide read-only monitoring evidence.
- Research deferrals are normal budget controls. Genuine API failures and paid
  delivery capacity shortages must be escalated. Browser-based public checks,
  Gmail, payments, booking checks and approval-ready drafts can continue.

No pay-as-you-go or billing settings are enabled by these changes. Provider cost
changes, manual account usage, optional account-wide scanning, and external API
clients are outside this application cap; monitor the actual balance as well.
