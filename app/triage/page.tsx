import type { Metadata } from 'next';

import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { TriageTool } from '@/components/triage-tool';
import { productCheckoutConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Free Storefront Triage | Storefront HQ',
  description:
    'Answer three questions and get a practical first-check plan for a broken buying path, weak product page, launch or campaign.',
};

export default function TriagePage() {
  const checkoutReady = Object.fromEntries(
    Object.entries(productCheckoutConfig()).map(([id, config]) => [
      id,
      config.ready,
    ]),
  );
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="border-b border-[#10261f]/15">
        <div className="qa-grid absolute inset-x-0 top-0 h-[34rem] opacity-45" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <p className="font-mono text-xs font-black uppercase tracking-[.18em] text-[#477a5b]">
            Free storefront triage
          </p>
          <h1 className="mt-4 max-w-5xl text-balance text-5xl font-black leading-[.94] tracking-[-0.055em] sm:text-7xl">
            Find the next useful check before you touch the store.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Choose the symptom, reach and timing. You’ll get a focused public-store
            test plan, an acceptance check and the evidence worth preserving.
            Nothing is submitted and no admin access is needed.
          </p>
          <div className="mt-10">
            <TriageTool checkoutReady={checkoutReady} />
          </div>
          <p className="mt-8 max-w-4xl text-sm leading-6 text-muted-foreground">
            This self-guided tool narrows a starting point; it does not inspect
            your store, prove root cause or replace legal, security or
            accessibility advice. Do not place a real order unless the merchant
            has authorised a test transaction.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
