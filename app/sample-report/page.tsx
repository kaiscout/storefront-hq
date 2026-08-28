import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { offer } from '@/lib/offer';
import { cn } from '@/lib/utils';

const sampleFindings = [
  {
    severity: 'Critical',
    tone: 'bg-[#ff6b35] text-white',
    category: 'Broken buying path',
    route: '/collections/summer-edit',
    finding: 'Featured product destination returns HTTP 404 on mobile',
    evidence:
      'The collection card links to /products/linen-set-blue. The destination returned HTTP 404 during the captured public mobile check.',
    capturedAt: '28 Aug 2026 · 10:15 UTC',
    screenshotRef: 'IMG-001 · mobile 390 × 844',
    steps: [
      'Open the Summer Edit collection at a mobile viewport.',
      'Select the featured blue linen-set card.',
      'Observe the 404 response at /products/linen-set-blue.',
    ],
    recommendation:
      'Redirect the retired handle to the live product and update the collection-card destination so the journey does not depend on the redirect.',
  },
  {
    severity: 'High',
    tone: 'bg-[#f2c14e] text-[#10261f]',
    category: 'Offer consistency',
    route: '/products/linen-set',
    finding: 'Sale message conflicts with the price shown later in the journey',
    evidence:
      'The product page example advertises £69 while the captured cart state displays £79 for the same selected variant.',
    capturedAt: '28 Aug 2026 · 10:22 UTC',
    screenshotRef: 'IMG-002 · mobile 390 × 844',
    steps: [
      'Open the linen-set product route and select the blue / medium variant.',
      'Confirm the promotional message shows £69.',
      'Add the variant and compare the £79 cart line price.',
    ],
    recommendation:
      'Use one variant-aware price source for the promotional message, product price and cart line item; remove cached sale copy when the promotion ends.',
  },
  {
    severity: 'Medium',
    tone: 'bg-[#d9e8c8] text-[#10261f]',
    category: 'Delivery promise',
    route: '/pages/shipping',
    finding: 'Delivery window disagrees with the storefront announcement',
    evidence:
      'The shipping page example says 3–5 working days while the announcement bar promises dispatch and delivery within 48 hours.',
    capturedAt: '28 Aug 2026 · 10:31 UTC',
    screenshotRef: 'IMG-003 · mobile 390 × 844',
    steps: [
      'Read the delivery promise in the storefront announcement bar.',
      'Open /pages/shipping in the same market and session.',
      'Compare the 48-hour promise with the 3–5 working-day window.',
    ],
    recommendation:
      'Separate dispatch time from delivery time and reuse the same market-specific wording in the announcement, policy and product template.',
  },
] as const;

const coverage = [
  ['/', '200', 'Home'],
  ['/collections/summer-edit', '200', 'Collection'],
  ['/products/linen-set', '200', 'Product'],
  ['/products/linen-set-blue', '404', 'Broken destination'],
  ['/pages/shipping', '200', 'Policy'],
  ['/policies/refund-policy', '200', 'Policy'],
] as const;

export default function SampleReportPage() {
  return (
    <main className="min-h-screen bg-[#ece8df] px-5 py-8 text-[#10261f] sm:px-8 sm:py-12">
      <article className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#10261f]/15 bg-[#f8f4e8] shadow-[12px_12px_0_rgba(16,38,31,0.12)]">
        <header className="border-b border-white/15 bg-[#10261f] px-6 py-8 text-[#f8f4e8] sm:px-10 sm:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#cdeca5]"
          >
            <ArrowLeft className="size-4" /> Back to {offer.brandName}
          </Link>
          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-[#a8d66d] text-[#10261f]">
                  Illustrative sample
                </Badge>
                <span className="font-mono text-xs uppercase tracking-[0.15em] text-white/55">
                  No real merchant data
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                Fix-ready storefront evidence pack
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#b9c6b7]">
                This sample shows the structure of a {offer.productName}{' '}
                deliverable: captured routes, reproducible evidence, severity,
                and the next repair action—not a generic automated score.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5 lg:min-w-64">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50">
                Example storefront
              </p>
              <p className="mt-2 text-xl font-black">Northstar Outfitters</p>
              <p className="mt-1 text-sm text-white/55">Public mobile QA</p>
            </div>
          </div>
        </header>

        <div className="space-y-10 px-6 py-8 sm:px-10 sm:py-10">
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              ['Routes captured', '6'],
              ['Example findings', '3'],
              ['Repair format', 'Developer-ready'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border bg-white/70 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#477a5b]">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-3 rounded-2xl border border-[#10261f]/15 bg-[#10261f] p-5 text-[#f8f4e8] sm:grid-cols-4 sm:p-6">
            {[
              ['Fixed fee', `£${offer.priceGbp}`],
              ['Delivery', `${offer.deliveryHours} hours`],
              ['Full crawl', `Up to ${offer.pageLimit} pages`],
              [
                'Delivered pack',
                `${offer.selectedFindings} findings + ${offer.watchDays}-day watch`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50">
                  {label}
                </p>
                <p className="mt-2 font-black">{value}</p>
              </div>
            ))}
          </section>

          <section>
            <div className="flex items-center gap-3">
              <FileSearch className="size-6 text-[#477a5b]" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#477a5b]">
                  Coverage appendix
                </p>
                <h2 className="text-2xl font-black">
                  What was actually checked
                </h2>
              </div>
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border bg-white/70">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b bg-[#10261f]/[0.04] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Route</th>
                    <th className="px-5 py-3">HTTP</th>
                    <th className="px-5 py-3">Page type / result</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {coverage.map(([route, status, result]) => (
                    <tr key={route}>
                      <td className="px-5 py-3 font-mono text-xs">{route}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-1 font-mono text-xs font-black ${
                            status === '200'
                              ? 'bg-[#d9e8c8] text-[#244a32]'
                              : 'bg-[#ff6b35]/15 text-[#a43712]'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3">{result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#477a5b]">
              Prioritized repair queue
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Evidence your developer can reproduce
            </h2>
            <div className="mt-5 space-y-4">
              {sampleFindings.map((item, index) => (
                <article
                  key={item.finding}
                  className="rounded-2xl border bg-white/70 p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider',
                          item.tone,
                        )}
                      >
                        {item.severity}
                      </span>
                      <span className="text-xs font-bold text-[#477a5b]">
                        {item.category}
                      </span>
                    </div>
                    <code className="text-xs text-muted-foreground">
                      {item.route}
                    </code>
                  </div>
                  <h3 className="mt-5 text-xl font-black">{item.finding}</h3>
                  <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider text-[#477a5b]">
                    <span className="rounded-full border border-[#477a5b]/25 px-2.5 py-1">
                      Captured {item.capturedAt}
                    </span>
                    <span className="rounded-full border border-[#477a5b]/25 px-2.5 py-1">
                      {item.screenshotRef}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl bg-[#ece8df] p-4">
                      <p className="text-xs font-black uppercase tracking-wider">
                        Captured evidence
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.evidence}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#e9f4dc] p-4">
                      <p className="text-xs font-black uppercase tracking-wider">
                        Fix-ready recommendation
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.recommendation}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f4efdf] p-4 md:col-span-2">
                      <p className="text-xs font-black uppercase tracking-wider">
                        Exact reproduction steps
                      </p>
                      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
                        {item.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#477a5b]">
              Repair and watch outputs
            </p>
            <h2 className="mt-1 text-2xl font-black">
              The pack continues beyond the finding cards
            </h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border bg-white/70 p-5">
                <p className="text-xs font-black uppercase tracking-wider">
                  Redirect CSV row
                </p>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-[#10261f] p-4 font-mono text-[11px] leading-5 text-[#cdeca5]">
                  {`from,to,reason\n/products/linen-set-blue,/products/linen-set,broken collection card`}
                </pre>
              </div>
              <div className="rounded-2xl border bg-white/70 p-5">
                <p className="text-xs font-black uppercase tracking-wider">
                  Copy-ready correction
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  “Dispatches within 48 hours. Estimated delivery: 3–5 working
                  days.” One market-specific promise for the announcement and
                  policy.
                </p>
              </div>
              <div className="rounded-2xl border bg-white/70 p-5">
                <p className="text-xs font-black uppercase tracking-wider">
                  Regression-watch baseline
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Daily public checks on up to {offer.watchRouteLimit} agreed
                  routes for {offer.watchDays} days, with an operator alert when
                  the observed status or content fingerprint changes.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl bg-[#f2c14e] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <div>
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="size-5" /> Truthful scope
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
                Your pack contains only captured, reproducible evidence.
              </h2>
              <p className="mt-3 max-w-3xl leading-7">
                Automated signals are reviewed before delivery. Unverified
                hypotheses and conversion-uplift promises are excluded.
              </p>
            </div>
            <Link
              href="/start"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 rounded-full bg-[#10261f] px-6 text-white hover:bg-[#1d4539]',
              )}
            >
              Request a fit check <ExternalLink data-icon="inline-end" />
            </Link>
          </section>

          <div className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#477a5b]" />
            <p>
              The paid £{offer.priceGbp} pack expands this structure to up to{' '}
              {offer.pageLimit} public pages, {offer.selectedFindings} selected
              findings, downloadable CSV/JSON evidence and daily observation of{' '}
              {offer.watchRouteLimit} agreed routes for {offer.watchDays} days.{' '}
              <Link href="/terms" className="underline underline-offset-2">
                Read the service terms.
              </Link>
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}
