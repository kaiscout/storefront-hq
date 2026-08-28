# Dedicated Gmail + Apps Script setup

Use one new, legitimate business account with a truthful sender identity. Do not create burner accounts, rotate accounts, or bypass phone/recovery verification. Google may require verification even when a new number or recovery email was not planned.

Gmail is used only for:

- creating human-reviewable drafts for explicit direct-email requests;
- labelling those threads; and
- syncing replies from those labelled threads.

The script never calls `send()`.

## Setup

1. In the dedicated Google account, open Apps Script and create a blank project.
2. Paste `Code.gs` into the project.
3. Under **Project Settings → Script Properties**, add:
   - `API_BASE`: the deployed HTTPS Site origin, without a trailing slash;
   - `AUTOMATION_SECRET`: the same high-entropy value configured on the Site;
   - `BUSINESS_EMAIL`: the dedicated inbox address.
4. Run `installTriggers()` once and approve only the requested Gmail and external-request scopes.
5. Run `createProposalDrafts()` manually once. Confirm that a draft is created but not sent.
6. Run `syncInboundReplies()` with a labelled test thread and confirm the control room changes.

The daily discovery trigger uses Firecrawl through the Site. The 5-minute reply trigger and 15-minute draft trigger run on Google’s infrastructure, so the local computer can be off.
