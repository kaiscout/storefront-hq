import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { offer } from '@/lib/offer';

export const dynamic = 'force-dynamic';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.16em] text-[#477a5b]">
          {offer.brandName} · {offer.productName} service terms
        </p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.05em]">
          A bounded QA sprint, without fuzzy promises.
        </h1>
        <div className="prose-qa mt-10 space-y-8 leading-7 text-muted-foreground">
          <section>
            <h2>Service provider and price</h2>
            <p>
              The {offer.productName} is supplied under the {offer.brandName}{' '}
              name by the Storefront HQ team for a fixed £{offer.priceGbp} fee
              unless a written proposal says otherwise.
            </p>
          </section>
          <section>
            <h2>Scope</h2>
            <p>
              Delivery covers up to {offer.pageLimit} public storefront pages,
              an evidence ledger, {offer.selectedFindings} selected findings, a
              redirect/copy fix pack, a {offer.handoffMinutes}-minute handoff
              and daily observation of {offer.watchRouteLimit} agreed public
              routes for {offer.watchDays} days. No admin access, code changes,
              checkout completion, analytics analysis or guaranteed revenue
              result is included.
            </p>
          </section>
          <section>
            <h2>Timing and customer input</h2>
            <p>
              The {offer.deliveryHours}-hour window begins when payment clears
              and the live store, priority market and critical routes are
              confirmed. Delays caused by password protection, bot blocking,
              major live changes or missing input pause the clock.
            </p>
          </section>
          <section>
            <h2>Evidence guarantee</h2>
            <p>
              If the delivered pack contains fewer than {offer.minimumFindings}{' '}
              reproducible, actionable issues within the agreed public scope,
              the customer may request a full refund within seven days of
              delivery. Preference or unverified hypotheses do not count as
              findings.
            </p>
          </section>
          <section>
            <h2>Limit</h2>
            <p>
              This is public-storefront quality assurance, not legal,
              accessibility-conformance, security, tax or financial advice.
              Fixes remain the customer’s decision and responsibility.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
