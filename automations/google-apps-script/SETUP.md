# Dedicated Gmail + Apps Script setup

## Website inbox notifications (19 October 2026)

The isolated `WebsiteInbox.gs` module delivers queued Contact
and Reviews form notifications to **front.storecheckqa@gmail.com only**. It checks
the live Gmail profile before claiming work, uses the already approved Gmail
scope, never uses a visitor-supplied destination or Reply-To, and acknowledges the
confirmed Gmail message ID. The public form does not email its submitter, verify
email ownership, create email consent or publish a review.

Add `WebsiteInbox.gs` to the existing dedicated-account project without replacing
its saved bridge code, then run `installWebsiteInboxTrigger` once. This creates
one idempotently installed five-minute notification trigger and leaves existing
triggers unchanged. No new scope or public web-app deployment is needed.
`sendWebsiteNotifications` can run once to
check a clearly marked operator-only test. Verify the resulting message in the
business inbox and the row's `notification_state = sent`; a build is not proof of
email delivery. An uncertain send is not automatically replayed: check Gmail Sent
and reconcile the message ID before a manual retry.

Private submissions and review moderation are at `/ops/website`, behind the same
operator identity allowlist as the existing control room. Only a review with
separate publication permission can be published. Pending/private records stay
off public queries. The existing privacy-cleanup job removes nonpublished website
records after 90 days and expires anti-abuse counters; the operator handles inbox
retention and withdrawal requests. Never count a form, test, draft or review as a
sale.

The older setup notes below describe the original bridge. The saved code now also
supports tightly gated same-thread replies and these fixed-destination internal
notifications; statements below that it contains no send call are historical.

Use one new, legitimate business account with a truthful sender identity. Do not create burner accounts, rotate accounts, or bypass phone/recovery verification. Google may require verification even when a new number or recovery email was not planned.

Gmail is used only for:

- creating human-reviewable drafts for explicit direct-email requests;
- labelling those threads; and
- syncing replies from those labelled threads.

The script never calls `send()`.

The project manifest pins the Gmail permission to `gmail.modify` instead of
the broader `mail.google.com` scope. Google describes `gmail.modify` as able to
read, compose and send mail; this script uses it only to read labelled threads,
create unsent drafts and apply the `rt10-watch` label. It contains no Gmail
send or permanent-delete call.

## Setup

1. In the dedicated Google account, open Apps Script and create a blank project.
2. Paste `Code.gs` into the project.
3. Under **Project Settings → Script Properties**, add:
   - `API_BASE`: the deployed HTTPS Site origin, without a trailing slash;
   - `AUTOMATION_SECRET`: the same high-entropy value configured on the Site;
   - `BUSINESS_EMAIL`: the dedicated inbox address.
4. Run `installTriggers()` once and approve only the requested Gmail and external-request scopes. The installer is idempotent: re-running it adds only missing jobs and preserves existing managed triggers.
5. Run `createProposalDrafts()` manually once. Confirm that a draft is created but not sent.
6. Run `syncInboundReplies()` with a labelled test thread and confirm the control room changes.

Resource-saving policy (September 22, 2026): the existing daily discovery and
hourly source-watch timers remain compatible, but their Site endpoints return
explicit HTTP 200 policy deferrals without calling Firecrawl or checking source
content. A successful timer execution is not a successful public-source check.
The separate business monitor runs every six hours, reviews existing public
conversations with ordinary web tools, and performs fresh ordinary-web discovery
once per UTC day. Verified opportunities can use manual discovery intake; targeted
operator qualification remains budgeted and is used only when ordinary checks
prove insufficient. No Apps Script trigger reinstallation is required for this
server-side policy.

Daily regression watch still uses Firecrawl only for paid, client-approved routes
entered in the control room. An hourly SLA check summarizes paid work approaching
or exceeding 48 hours, and a daily cleanup applies the published 30/90-day privacy
rules while retaining suppression and paid/contract records. The 5-minute reply
ingestion trigger and 15-minute draft trigger run on Google's infrastructure,
so the local computer can be off. Ingestion alone is not an immediate consultant
response or an operator notification.

When a human sends a reviewed Gmail draft, the next reconciliation records the sent thread in the Site ledger before applying the watch label. Reconciliation is idempotent and the script still contains no send call.

In Firecrawl account webhook settings, configure the same HMAC secret stored as `FIRECRAWL_WEBHOOK_SECRET` on the Site. Configure Cal and Stripe to call the deployed `/api/webhooks/cal` and `/api/webhooks/stripe` URLs with their matching Site secrets. Intake remains closed until every value in `.env.example` is configured, including the operator allowlist.
