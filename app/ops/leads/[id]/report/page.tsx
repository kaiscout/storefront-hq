import { ArrowLeft, CircleCheck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import {
  FindingEditor,
  RemoveFindingButton,
} from '@/components/ops/finding-editor';
import { ReportActions } from '@/components/ops/report-actions';
import { Badge } from '@/components/ui/badge';
import { getLead, listFindings, listWatchRoutes } from '@/lib/database';
import { offer } from '@/lib/offer';
import { currentOperator } from '@/lib/operator-auth';
import {
  evidenceSummary,
  isEvidencePackReady,
  sortEvidenceFindings,
  toEvidenceFindings,
} from '@/lib/report';

export const dynamic = 'force-dynamic';

function severityTone(severity: string) {
  if (severity === 'critical') return 'bg-[#ff6b35] text-white';
  if (severity === 'high') return 'bg-[#f2c14e] text-[#10261f]';
  if (severity === 'medium') return 'bg-[#d9e8c8] text-[#244a32]';
  return 'bg-stone-200 text-stone-700';
}

export default async function EvidenceReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const operator = await currentOperator();
  if (!operator.authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#10261f] px-5 text-[#f8f4e8]">
        <div className="max-w-md rounded-3xl bg-[#f8f4e8] p-8 text-[#10261f]">
          <ShieldCheck className="mb-4 size-8" />
          <h1 className="text-2xl font-black">Operator access only</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Evidence packs contain client and storefront records.
          </p>
          {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- SIWC must use a top-level plain anchor. */}
          <a
            href="/signin-with-chatgpt?return_to=/ops"
            target="_top"
            className="mt-5 inline-flex rounded-full bg-[#10261f] px-5 py-3 font-bold text-white"
          >
            Sign in with ChatGPT
          </a>
        </div>
      </main>
    );
  }

  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5">
        <p className="font-bold">Lead not found.</p>
      </main>
    );
  }
  const [findingRows, watchRows] = await Promise.all([
    listFindings(id),
    listWatchRoutes(),
  ]);
  const findings = sortEvidenceFindings(toEvidenceFindings(findingRows)).slice(
    0,
    offer.selectedFindings,
  );
  const summary = evidenceSummary(findings);
  const readiness = isEvidencePackReady(findings, offer.selectedFindings);
  const watchRoutes = watchRows
    .filter((row) => row.lead_id === id)
    .map((row) => row.url);
  const deliveredAt =
    lead.status === 'delivered'
      ? new Date(lead.updated_at).toLocaleString('en-GB')
      : null;

  return (
    <main className="report-shell min-h-screen bg-[#ece8df] px-5 py-8 text-[#10261f] sm:px-8 sm:py-12">
      <article className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#10261f]/15 bg-[#f8f4e8] shadow-[12px_12px_0_rgba(16,38,31,0.12)]">
        <header className="bg-[#10261f] px-6 py-7 text-[#f8f4e8] sm:px-10 sm:py-10">
          <div className="report-actions mb-8 flex items-center justify-between gap-4">
            <Link
              href="/ops"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#cdeca5]"
            >
              <ArrowLeft className="size-4" /> Control room
            </Link>
            <ReportActions
              leadId={id}
              status={lead.status}
              ready={readiness.ready}
            />
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a8d66d]">
            {offer.brandName} · Public storefront evidence pack
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                {lead.company_name}
              </h1>
              <p className="mt-3 break-all text-sm text-[#b9c6b7]">
                {lead.store_url}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <div className="text-3xl font-black">{findings.length}</div>
                <div className="mt-1 text-xs text-[#b9c6b7]">
                  selected findings
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <div className="text-3xl font-black">{watchRoutes.length}</div>
                <div className="mt-1 text-xs text-[#b9c6b7]">watch routes</div>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-10 px-6 py-8 sm:px-10 sm:py-10">
          <section className="grid gap-4 sm:grid-cols-4">
            {[
              ['Critical', summary.critical],
              ['High', summary.high],
              ['Medium', summary.medium],
              ['Other', summary.low + summary.other],
            ].map(([label, count]) => (
              <div key={label} className="rounded-2xl border bg-white/65 p-5">
                <div className="text-3xl font-black">{count}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
              </div>
            ))}
          </section>

          <section
            className={`rounded-2xl border p-5 ${
              readiness.ready
                ? 'border-[#477a5b]/30 bg-[#d9e8c8]/60'
                : 'border-[#ff6b35]/35 bg-[#ff6b35]/10'
            }`}
          >
            <div className="flex gap-3">
              <CircleCheck className="mt-0.5 size-5 shrink-0" />
              <div>
                <h2 className="font-black">
                  {readiness.ready
                    ? 'Evidence pack passes the delivery gate'
                    : `${readiness.missing} complete finding${
                        readiness.missing === 1 ? '' : 's'
                      } still required`}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Delivery requires {offer.selectedFindings} findings with an
                  affected URL, evidence, and a fix-ready recommendation. The
                  evidence guarantee remains {offer.minimumFindings} actionable
                  issues minimum.
                </p>
              </div>
            </div>
          </section>

          {lead.store_url && ['paid', 'fulfilling'].includes(lead.status) ? (
            <FindingEditor leadId={id} storeUrl={lead.store_url} />
          ) : null}

          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#477a5b]">
                  Prioritized repair queue
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">
                  Reproducible findings
                </h2>
              </div>
              {deliveredAt ? <Badge>Delivered {deliveredAt}</Badge> : null}
            </div>
            <div className="space-y-4">
              {findings.length ? (
                findings.map((finding, index) => (
                  <article
                    key={finding.id}
                    className="report-finding break-inside-avoid rounded-2xl border bg-white/70 p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <Badge
                        className={`border-0 capitalize ${severityTone(
                          finding.severity,
                        )}`}
                      >
                        {finding.severity}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {finding.category.replaceAll('-', ' ')}
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-xl font-black tracking-[-0.025em]">
                      {finding.title}
                    </h3>
                    <p className="mt-2 break-all font-mono text-xs text-[#477a5b]">
                      {finding.url}
                    </p>
                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">
                          Evidence
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {finding.evidence}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">
                          Recommended fix
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {finding.recommendation ||
                            'Operator recommendation required.'}
                        </p>
                      </div>
                    </div>
                    {finding.screenshot_url ? (
                      <a
                        href={finding.screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="report-screenshot mt-4 inline-flex text-sm font-bold text-[#477a5b] underline underline-offset-4"
                      >
                        Open timestamped screenshot
                      </a>
                    ) : null}
                    {['paid', 'fulfilling'].includes(lead.status) ? (
                      <div className="report-actions mt-5 border-t pt-4">
                        <RemoveFindingButton
                          leadId={id}
                          findingId={finding.id}
                        />
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                  The audit has not produced any stored findings yet.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 border-t pt-8 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-black">30-day regression watch</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Daily public checks run for {offer.watchDays} days after payment
                on up to {offer.watchRouteLimit} client-approved routes.
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              {watchRoutes.length ? (
                watchRoutes.map((route) => (
                  <li
                    key={route}
                    className="break-all rounded-xl bg-[#10261f]/5 px-4 py-3 font-mono text-xs"
                  >
                    {route}
                  </li>
                ))
              ) : (
                <li className="rounded-xl bg-[#f2c14e]/25 px-4 py-3 font-semibold">
                  Add the agreed critical routes after the findings handoff.
                </li>
              )}
            </ul>
          </section>

          <footer className="border-t pt-7 text-xs leading-5 text-muted-foreground">
            Public-storefront QA only. No Shopify admin access, code changes,
            checkout completion, analytics attribution, or guaranteed revenue
            outcome.
          </footer>
        </div>
      </article>
    </main>
  );
}
