# Hosting on Storefront HQ's own Cloudflare account

Return to the [project overview](../../README.md). Commands run from the repository root.

Until November 2026 the site was published through OpenAI Sites (Codex). It now builds and deploys to the owner's Cloudflare account as a Worker named `storefront-hq` with its own D1 database.

| Piece | Value |
| --- | --- |
| Worker | `storefront-hq` |
| Test URL (before domain cutover) | https://storefront-hq.denizeizci.workers.dev |
| D1 database | `storefront-hq` (`a44231ab-57a6-487a-9062-9520dab85d7e`, Western Europe) |
| Worker settings | `vite.config.ts` (`workerConfig`) |
| D1 migration config | `wrangler.d1.jsonc` |
| Operator sign-in | Cloudflare Access, verified in `lib/cloudflare-access.ts` |

## Everyday commands

```sh
npm run verify            # tests + lint
npm run deploy            # build and publish the Worker
npm run db:migrate:remote # apply new drizzle/ migrations to production D1
```

Run `db:migrate:remote` before `deploy` whenever a change adds a migration.

## Operator sign-in (Cloudflare Access)

OpenAI Sites injected a trusted `oai-authenticated-user-email` header. Nothing strips that header on a plain Worker, so the app no longer reads it. Operator pages and APIs accept only a Cloudflare Access token whose signature, issuer, audience and expiry verify, and whose email is in `OPS_OWNER_EMAIL`.

Set up once in the Cloudflare dashboard → Zero Trust:

1. Choose a team name if asked (this gives `<team>.cloudflareaccess.com`).
2. Access → Applications → Add → Self-hosted. Domain `storefronthq.co.uk`, path `ops`. Add a policy: Action Allow, Include → Emails → the operator email. Login method: One-time PIN is enough.
3. Copy the application's **Audience (AUD) tag**.
4. Set the Worker secrets below (`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `OPS_OWNER_EMAIL`).

Only `/ops` needs to be an Access path. The operator API routes check the same `CF_Authorization` cookie the browser sends from `/ops`, and `/api/automation/*` keeps using `AUTOMATION_SECRET`.

Local development: put `OPS_DEV_OPERATOR_EMAIL` and a matching `OPS_OWNER_EMAIL` in `.dev.vars`. Production builds strip that shortcut.

## Secrets and settings

Type each value yourself when prompted; never commit them:

```sh
npx wrangler secret put NAME
```

| Name | Needed for | Where it comes from |
| --- | --- | --- |
| `OPS_OWNER_EMAIL` | Operator dashboard and intake | The operator email(s), comma-separated |
| `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` | Operator sign-in | Zero Trust, as above |
| `AUTOMATION_SECRET` | Gmail bridge and automation APIs | Reuse the current value from OpenAI Sites, or generate a new one and update the Apps Script property to match |
| `STRIPE_WEBHOOK_SECRET` | Payment confirmation | Stripe → Developers → Webhooks → the `https://storefronthq.co.uk/api/webhooks/stripe` endpoint's signing secret |
| `CAL_WEBHOOK_SECRET`, `CAL_BOOKING_URL`, `PUBLIC_CAL_BOOKING_URL` | Bookings | Cal.com, only if bookings are used |
| `FIRECRAWL_API_KEY`, `FIRECRAWL_WEBHOOK_SECRET` | Diagnostics | Firecrawl, only if used |
| `PUBLIC_BUSINESS_NAME`, `PUBLIC_BUSINESS_ADDRESS`, `PUBLIC_OPERATOR_NAME` | Seller disclosure; required before checkout opens | The legal seller name and trading/postal address |
| `*_CHECKOUT_URL`, `*_PAYMENT_LINK_ID`, `STRIPE_CUSTOMER_PORTAL_URL` | Turning on checkout | Stripe Payment Links (see the launch gate in the [runbook](runbook.md)) |

Public, non-secret values (`PUBLIC_SITE_URL`, `PUBLIC_CONTACT_EMAIL`) live in `vite.config.ts` under `vars`. Business name and address can move there too once published.

## Moving the existing data

The production database on OpenAI Sites holds the enquiries, leads, reviews and any orders recorded so far. Wrangler cannot read it from this account.

1. In Codex, ask for a SQL export of the Site's D1 database (data only, `INSERT` statements).
2. Review it, then import it into the new database, which already has the schema:

   ```sh
   npx wrangler d1 execute storefront-hq --remote --file path/to/export.sql
   ```

If the export includes `CREATE TABLE` or `d1_migrations` rows, remove those first. If there is nothing worth keeping, skip this step.

## Domain cutover

Do this after the secrets are set and the test URL works.

1. Find where the `storefronthq.co.uk` zone lives: Cloudflare dashboard → Websites. If it is listed in this account, continue. If not, add the site and switch the registrar's nameservers to the ones Cloudflare gives.
2. Run `npx wrangler login` once so Wrangler can manage the domain.
3. Disconnect the custom domain from the OpenAI Sites project, then delete any DNS records for `storefronthq.co.uk` and `www` that pointed at OpenAI.
4. Add to `workerConfig` in `vite.config.ts`, then run `npm run deploy`:

   ```ts
   routes: [
     { pattern: 'storefronthq.co.uk', custom_domain: true },
     { pattern: 'www.storefronthq.co.uk', custom_domain: true },
   ],
   workers_dev: false,
   ```

5. Check `/`, `/products`, `/reviews`, `/start` and `/ops` (which should ask for an Access login), then send a Stripe test webhook to confirm the signing secret.

Rollback: the OpenAI Sites deployment stays as it was until its domain is disconnected. Reconnect the domain there to go back.
