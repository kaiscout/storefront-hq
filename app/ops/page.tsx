import {
  ArrowUpRight,
  CalendarCheck2,
  CircleDollarSign,
  Flame,
  Inbox,
  LockKeyhole,
  Radar,
  SearchCheck,
} from 'lucide-react';

import { LeadActions } from '@/components/ops/lead-actions';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { integrationState, publicConfig } from '@/lib/config';
import {
  listLeads,
  listRecentStripeEvents,
  listWatchRoutes,
  pipelineCounts,
} from '@/lib/database';
import { offer } from '@/lib/offer';
import { deliverySlaSummary } from '@/lib/operations';
import { currentOperator } from '@/lib/operator-auth';
import {
  formatGbpPence,
  parsePaymentSignal,
  paymentSignalLabel,
  type PaymentSignalOutcome,
} from '@/lib/payment-signals';
import { buildProposal, type PipelineStatus } from '@/lib/pipeline';

export const dynamic = 'force-dynamic';

const stages: Array<{
  key: PipelineStatus;
  label: string;
  icon: typeof Radar;
}> = [
  { key: 'discovered', label: 'Intent found', icon: Radar },
  { key: 'qualified', label: 'Qualified', icon: SearchCheck },
  { key: 'drafted', label: 'Proposed', icon: Inbox },
  { key: 'booked', label: 'Booked', icon: CalendarCheck2 },
  { key: 'paid', label: 'Paid', icon: CircleDollarSign },
];

function statusTone(status: PipelineStatus) {
  if (['paid', 'fulfilling', 'delivered'].includes(status))
    return 'bg-[#d9e8c8] text-[#244a32]';
  if (['replied', 'booked'].includes(status))
    return 'bg-[#f2c14e]/35 text-[#6d4c00]';
  if (['closed_lost', 'suppressed'].includes(status))
    return 'bg-stone-200 text-stone-600';
  return 'bg-[#ff6b35]/12 text-[#a43712]';
}

function paymentSignalTone(outcome: PaymentSignalOutcome) {
  if (outcome === 'cleared_expected') return 'bg-[#d9e8c8] text-[#244a32]';
  if (outcome === 'cleared_needs_reconciliation')
    return 'bg-[#ff6b35]/15 text-[#a43712]';
  if (outcome === 'pending_expected') return 'bg-[#f2c14e]/35 text-[#6d4c00]';
  return 'bg-red-100 text-red-700';
}

const paymentSignalTime = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

export default async function OpsPage() {
  const operator = await currentOperator();
  if (!operator.authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#10261f] px-5 text-[#f8f4e8]">
        <Card className="max-w-md bg-[#f8f4e8] text-[#10261f]">
          <CardHeader>
            <LockKeyhole className="mb-3 size-8" />
            <CardTitle className="text-2xl font-black">
              Operator access only
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-muted-foreground">
            <p>
              This board contains lead and reply data. Sign in with the ChatGPT
              identity explicitly allowlisted for this Site.
            </p>
            {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- SIWC must use a top-level plain anchor. */}
            <a
              href="/signin-with-chatgpt?return_to=/ops"
              target="_top"
              className="inline-flex rounded-full bg-[#10261f] px-5 py-3 font-bold text-white"
            >
              Sign in with ChatGPT
            </a>
          </CardContent>
        </Card>
      </main>
    );
  }

  const [leads, counts, watchRouteRows, stripeEvents] = await Promise.all([
    listLeads(),
    pipelineCounts(),
    listWatchRoutes(),
    listRecentStripeEvents(),
  ]);
  const paymentSignals = stripeEvents
    .flatMap((event) => {
      const signal = parsePaymentSignal(event);
      return signal ? [signal] : [];
    })
    .slice(0, 6);
  const watchRoutesByLead = new Map<string, string[]>();
  for (const row of watchRouteRows)
    watchRoutesByLead.set(row.lead_id, [
      ...(watchRoutesByLead.get(row.lead_id) ?? []),
      row.url,
    ]);
  const config = publicConfig();
  const integrations = integrationState();
  const paid =
    Number(counts.paid ?? 0) +
    Number(counts.fulfilling ?? 0) +
    Number(counts.delivered ?? 0);
  const gross = paid * offer.priceGbp;

  return (
    <main className="min-h-screen bg-[#ece8df] text-[#10261f]">
      <header className="border-b border-[#10261f]/15 bg-[#10261f] text-[#f8f4e8]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[#a8d66d]">
              <span className="size-2 rounded-full bg-[#a8d66d]" /> Intent-only
              sales engine
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Seven-day control room
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(integrations).map(([name, connected]) => (
              <span
                key={name}
                className={`rounded-full border px-3 py-1.5 font-mono uppercase tracking-wider ${connected ? 'border-[#a8d66d]/40 bg-[#a8d66d]/10 text-[#cdeca5]' : 'border-white/15 bg-white/5 text-white/45'}`}
              >
                {name} · {connected ? 'ready' : 'setup'}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-7 sm:px-8 lg:px-10">
        <Link href="/ops/website" className="button-primary">
          Open website inbox & review moderation
        </Link>
        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="grid gap-3 sm:grid-cols-5">
            {stages.map(({ key, label, icon: Icon }) => (
              <Card key={key} className="gap-2 rounded-2xl bg-[#f8f4e8] py-4">
                <CardHeader className="px-4">
                  <div className="flex items-center justify-between">
                    <Icon className="size-4 text-[#477a5b]" />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      7D
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="text-3xl font-black tracking-tight">
                    {counts[key] ?? 0}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="relative gap-3 overflow-hidden rounded-2xl border-0 bg-[#f2c14e] py-5 ring-0">
            <Flame className="absolute -right-5 -top-5 size-28 text-[#10261f]/10" />
            <CardHeader className="px-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em]">
                Gross target
              </p>
              <CardTitle className="text-4xl font-black">
                £{gross.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <div className="h-2 overflow-hidden rounded-full bg-[#10261f]/15">
                <div
                  className="h-full bg-[#10261f] transition-all"
                  style={{ width: `${Math.min(100, paid * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold">
                {paid
                  ? 'One-sale target cleared'
                  : `1 × £${offer.priceGbp} sale is the sprint target`}
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="gap-3 rounded-2xl bg-[#f8f4e8] py-5">
          <CardHeader className="px-5">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="size-4 text-[#477a5b]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#477a5b]">
                Verified payment signals
              </p>
            </div>
            <CardTitle className="text-xl font-black">
              Expected Stripe checkout activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            {paymentSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No verified payment signals
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {paymentSignals.map((signal) => (
                  <div
                    key={signal.eventId}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[#10261f]/10 bg-white/55 px-4 py-3"
                  >
                    <div>
                      <Badge
                        className={`border-0 ${paymentSignalTone(signal.outcome)}`}
                      >
                        {paymentSignalLabel(signal.outcome)}
                      </Badge>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {paymentSignalTime.format(new Date(signal.receivedAt))}
                      </p>
                      {signal.outcome === 'cleared_needs_reconciliation' ? (
                        <p className="mt-1 text-xs font-semibold text-[#a43712]">
                          Do not leave fulfilment unlinked.
                        </p>
                      ) : null}
                    </div>
                    <span className="font-mono text-sm font-black">
                      {formatGbpPence(signal.amountPence)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <section className="rounded-2xl border border-[#10261f]/15 bg-[#f8f4e8]">
          <div className="flex flex-col gap-3 border-b border-[#10261f]/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#477a5b]">
                Opportunity pipeline
              </p>
              <h2 className="mt-1 text-xl font-black">
                Explicit requests, evidence, next action
              </h2>
            </div>
            <div className="rounded-full bg-[#d9e8c8] px-3 py-1.5 text-xs font-semibold text-[#244a32]">
              No auto-send · No tracking pixels · Objections suppress instantly
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="grid min-h-64 place-items-center px-5 text-center text-muted-foreground">
              <div>
                <Radar className="mx-auto mb-4 size-8" />
                <p className="font-semibold text-foreground">
                  No opportunities yet.
                </p>
                <p className="mt-1 text-sm">
                  Review fresh public requests using ordinary web tools, then
                  record verified opportunities. Routine discovery does not use
                  Firecrawl credits.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b bg-[#10261f]/[0.035] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Opportunity</th>
                    <th className="px-4 py-3">Fit</th>
                    <th className="px-4 py-3">Proof</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10261f]/10">
                  {leads.map((lead) => {
                    const proposal = buildProposal({
                      companyName: lead.company_name,
                      sourceTitle: lead.source_title,
                      proofSummary: lead.proof_summary,
                      storeUrl: lead.store_url,
                      calUrl:
                        lead.contact_channel === 'source-platform'
                          ? undefined
                          : process.env.CAL_BOOKING_URL,
                      operatorName: process.env.PUBLIC_OPERATOR_NAME,
                    });
                    const deliverySla =
                      lead.paid_at &&
                      ['paid', 'fulfilling'].includes(lead.status)
                        ? deliverySlaSummary(lead.paid_at)
                        : null;
                    return (
                      <tr key={lead.id} className="align-top hover:bg-white/50">
                        <td className="max-w-[330px] px-5 py-4">
                          <div className="font-bold">{lead.company_name}</div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {lead.source_title}
                          </div>
                          {lead.source_url.startsWith('http') ? (
                            <a
                              href={lead.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#477a5b]"
                            >
                              Open source <ArrowUpRight className="size-3" />
                            </a>
                          ) : (
                            <span className="mt-2 block text-xs text-muted-foreground">
                              Inbound request
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-black">
                            {lead.fit_score}
                            <span className="text-xs text-muted-foreground">
                              /100
                            </span>
                          </div>
                          <p className="mt-1 max-w-40 text-xs leading-5 text-muted-foreground">
                            {lead.fit_reason ||
                              (lead.explicit_intent
                                ? 'Inbound / confirmed'
                                : 'Awaiting review')}
                          </p>
                        </td>
                        <td className="max-w-[320px] px-4 py-4">
                          <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
                            {lead.proof_summary ||
                              'Run the mobile Firecrawl preview after verifying buyer intent.'}
                          </p>
                          {lead.proof_url ? (
                            <a
                              href={lead.proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#477a5b]"
                            >
                              Evidence route <ArrowUpRight className="size-3" />
                            </a>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            className={`border-0 capitalize ${statusTone(lead.status)}`}
                          >
                            {lead.status.replaceAll('_', ' ')}
                          </Badge>
                          {deliverySla ? (
                            <p
                              className={`mt-2 max-w-52 text-xs font-bold leading-5 ${
                                deliverySla.state === 'overdue'
                                  ? 'text-red-700'
                                  : deliverySla.state === 'approaching'
                                    ? 'text-amber-700'
                                    : 'text-[#477a5b]'
                              }`}
                            >
                              Delivery {deliverySla.state.replace('_', ' ')} ·{' '}
                              {deliverySla.hoursRemaining > 0
                                ? `${deliverySla.hoursRemaining}h left`
                                : `${Math.abs(deliverySla.hoursRemaining)}h late`}
                            </p>
                          ) : null}
                          <p className="mt-2 max-w-44 text-xs leading-5 text-muted-foreground">
                            {lead.next_action}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <LeadActions
                            lead={{
                              id: lead.id,
                              status: lead.status,
                              companyName: lead.company_name,
                              storeUrl: lead.store_url ?? '',
                              contactEmail: lead.contact_email ?? '',
                              contactChannel: lead.contact_channel,
                            }}
                            proposal={`${proposal.subject}\n\n${proposal.body}`}
                            checkoutUrl={config.checkoutUrl}
                            watchRoutes={watchRoutesByLead.get(lead.id) ?? []}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
