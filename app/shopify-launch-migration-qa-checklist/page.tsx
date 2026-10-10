import type { Metadata } from 'next';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Clock3,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

const pagePath = '/shopify-launch-migration-qa-checklist';

export const metadata: Metadata = {
  title: 'Shopify launch & migration QA checklist | Storefront HQ',
  description:
    'A practical public-storefront QA checklist for Shopify launches, migrations, theme updates and campaigns: URLs, variants, cart, shipping, policies, mobile and regression checks.',
  alternates: { canonical: pagePath },
  openGraph: {
    type: 'article',
    url: pagePath,
    title: 'Shopify launch & migration QA checklist',
    description:
      'Public-storefront acceptance checks for the buying paths most likely to break after a Shopify change.',
  },
};

const stages = [
  {
    number: '01',
    title: 'Define the release surface',
    summary:
      'Write down the exact market, device, browser and public journeys that changed. A useful test plan is narrower than “check the whole store”.',
    checks: [
      'List the homepage, priority collections, representative products, cart and every campaign landing page.',
      'Include edge-case products: multiple variants, sold-out items, subscriptions, bundles, discounts or personalisation where relevant.',
      'Record the production release time, theme or migration change, primary market and who owns each repair.',
    ],
    acceptance:
      'A developer can see which public routes and customer journeys are in scope without asking for clarification.',
  },
  {
    number: '02',
    title: 'Protect URLs, navigation and discovery',
    summary:
      'Migrations and theme changes often leave shoppers on missing, redirected or disconnected pages even when the homepage looks correct.',
    checks: [
      'Open old high-value URLs and confirm each resolves to the intended new page—not the homepage or an unrelated collection.',
      'Follow header, menu, search, collection, breadcrumb, footer and policy links on mobile and desktop.',
      'Check campaign links without relying on a logged-in session, cached page or merchant-admin access.',
    ],
    acceptance:
      'Every tested link reaches the intended public destination with no unexplained 404, redirect loop or generic fallback.',
  },
  {
    number: '03',
    title: 'Verify product choice and price state',
    summary:
      'The selected product state must remain consistent from the product page through the cart.',
    checks: [
      'Choose representative size, colour, selling-plan or personalised options and confirm availability, media, SKU and price update together.',
      'Add the selection to cart and compare the product, variant, quantity, price, discount and fulfilment message with the product page.',
      'Repeat with a sold-out or unavailable combination and confirm the store blocks the impossible purchase clearly.',
    ],
    acceptance:
      'The cart contains exactly the option the shopper selected, at the displayed price, with no stale or contradictory state.',
  },
  {
    number: '04',
    title: 'Test cart and checkout handoff',
    summary:
      'The public buying path should survive quantity changes, removal, discounts and the handoff to Shopify checkout.',
    checks: [
      'Change quantity, remove an item, return to shopping and reopen the cart; totals and item state should remain correct.',
      'Test any public discount, free-shipping threshold or cart message against the actual cart total and stated conditions.',
      'Confirm the checkout button opens the expected secure Shopify checkout. Do not place a real order unless the merchant has authorised a test transaction.',
    ],
    acceptance:
      'Cart totals recalculate correctly and the intended public cart reaches the expected checkout without losing its selected items.',
  },
  {
    number: '05',
    title: 'Reconcile trust and fulfilment claims',
    summary:
      'A store can be technically functional while still presenting conflicting delivery, returns or product information at the decision point.',
    checks: [
      'Compare delivery, returns, guarantees, subscriptions and product claims across the product page, cart, footer and policy pages.',
      'Place turnaround time, photo or personalisation requirements, approval steps and exclusions beside the action they affect.',
      'Verify reviews or proof used near the purchase action support the exact claim being made; do not turn one review into a universal promise.',
    ],
    acceptance:
      'A first-time shopper can understand what they will receive, what it costs, when it should arrive and what happens if something goes wrong.',
  },
  {
    number: '06',
    title: 'Run the mobile and regression pass',
    summary:
      'Retest the same journey on a real mobile viewport, then preserve a compact baseline for the routes that matter after release.',
    checks: [
      'Check that overlays, cookie notices, menus, selectors and sticky actions do not hide the product, price or add-to-cart control.',
      'Inspect representative pages for missing accessible names, broken focus order, unreadable contrast and unexpected console or network failures.',
      'After fixes, rerun the original reproduction steps and retain the URL, environment, observed result and pass condition for regression checks.',
    ],
    acceptance:
      'The priority journey passes on the agreed mobile and desktop environments, and each repaired issue has a repeatable acceptance check.',
  },
];

const faq = [
  {
    question: 'Is this a Shopify admin checklist?',
    answer:
      'No. It focuses on evidence visible from the public storefront. Admin settings, private analytics, customer records and back-office workflows need separate authorised testing.',
  },
  {
    question: 'Should every product be tested?',
    answer:
      'Start with representative risk groups: best sellers, complex variants, sold-out states, subscriptions, bundles, personalisation and campaign products. Expand only when the evidence shows a wider pattern.',
  },
  {
    question: 'What makes a QA finding fix-ready?',
    answer:
      'Record the exact URL, time, device or viewport, reproduction steps, observed result, expected result, uncertainty, first repair direction and a clear acceptance check.',
  },
  {
    question: 'Does Storefront HQ implement the fixes?',
    answer:
      'No. Storefront HQ diagnoses public-storefront problems and returns evidence your developer or agency can implement. Shopify admin access and implementation are outside the focused services.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'HowTo',
      name: 'Shopify launch and migration public-storefront QA checklist',
      description:
        'A six-stage acceptance-check workflow for Shopify launches, migrations, theme changes and campaign releases.',
      totalTime: 'PT90M',
      step: stages.map((stage) => ({
        '@type': 'HowToStep',
        position: Number(stage.number),
        name: stage.title,
        text: `${stage.summary} ${stage.acceptance}`,
        url: `https://storefronthq.co.uk${pagePath}#stage-${stage.number}`,
      })),
    },
    {
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ],
};

export default function ShopifyLaunchMigrationQaChecklistPage() {
  return (
    <main className="min-h-screen bg-[#f8f4e8] text-[#10261f]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="border-b border-[#10261f]/15 bg-[#f8f4e8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold"
          >
            <ArrowLeft className="size-4" /> Storefront HQ
          </Link>
          <Link
            href="/sample-report"
            className="text-sm font-bold underline decoration-[#ff6b35] decoration-2 underline-offset-4"
          >
            See a fix-ready finding
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b-2 border-[#10261f] bg-[#10261f] text-[#f8f4e8]">
        <div
          className="absolute inset-0 qa-grid opacity-10"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-10">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#a8d66d]">
              Free public-storefront resource
            </p>
            <h1 className="mt-5 max-w-5xl text-balance text-[clamp(2.7rem,5.8vw,5.7rem)] font-black leading-[0.95] tracking-[-0.05em]">
              Shopify launch &amp; migration QA checklist
            </h1>
            <p className="mt-7 max-w-3xl text-pretty text-lg leading-8 text-white/75 sm:text-xl">
              Six evidence-led stages for checking the public buying path after
              a migration, theme change, launch or campaign release. No email
              gate and no admin access required.
            </p>
          </div>
          <aside className="rounded-[1.5rem] border border-white/20 bg-white/5 p-6">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#a8d66d]">
              Use before traffic arrives
            </p>
            <ul className="mt-5 space-y-3 text-sm font-semibold leading-6 text-white/80">
              {[
                'Theme or platform migration',
                'New-store or campaign launch',
                'Major app or navigation change',
                'Agency handoff and release review',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-[#a8d66d]" />{' '}
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-white/55">
              <Clock3 className="mt-0.5 size-3.5 shrink-0" /> Reviewed 1 October
              2026. Recheck platform-specific behaviour at release time.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [
              'Evidence first',
              'Record the exact URL, time and environment before assigning impact or cause.',
            ],
            [
              'Representative paths',
              'Cover risk groups and edge states instead of clicking every page without a test question.',
            ],
            [
              'Acceptance checks',
              'A fix is complete only when the original reproduction no longer fails in the agreed environment.',
            ],
          ].map(([title, detail]) => (
            <article
              key={title}
              className="rounded-2xl border border-[#10261f]/15 bg-white/55 p-6"
            >
              <CircleCheck className="size-6 text-[#477a5b]" />
              <h2 className="mt-4 text-xl font-black">{title}</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                {detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#10261f]/15 bg-[#d9e8c8]/40">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#477a5b]">
              The six-stage pass
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Test the journey, not just the pages.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Run these stages against the same priority product and buying
              path. Add routes only when the evidence suggests the defect is
              wider.
            </p>
          </div>

          <div className="mt-10 space-y-6">
            {stages.map((stage) => (
              <article
                id={`stage-${stage.number}`}
                key={stage.number}
                className="scroll-mt-6 rounded-[1.5rem] border-2 border-[#10261f] bg-[#f8f4e8] p-6 shadow-[7px_7px_0_rgba(16,38,31,0.1)] sm:p-8"
              >
                <div className="grid gap-6 lg:grid-cols-[0.33fr_0.67fr]">
                  <div>
                    <span className="font-mono text-sm font-black text-[#ff6b35]">
                      {stage.number}
                    </span>
                    <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                      {stage.title}
                    </h3>
                    <p className="mt-4 text-base leading-7 text-muted-foreground">
                      {stage.summary}
                    </p>
                  </div>
                  <div>
                    <ol className="space-y-4">
                      {stage.checks.map((check, index) => (
                        <li
                          key={check}
                          className="flex gap-4 text-base leading-7"
                        >
                          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#10261f] font-mono text-xs font-black text-white">
                            {index + 1}
                          </span>
                          <span>{check}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-6 rounded-xl border border-[#477a5b]/30 bg-[#d9e8c8]/65 p-4">
                      <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#477a5b]">
                        Acceptance check
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6">
                        {stage.acceptance}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:px-10">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#477a5b]">
            Finding format
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Turn each failure into a repair decision.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Avoid screenshots without context. A developer should be able to
            reproduce the issue, understand the uncertainty and know how to
            prove the repair.
          </p>
          <Link
            href="/sample-report"
            className="mt-6 inline-flex items-center gap-2 font-bold underline decoration-[#ff6b35] decoration-2 underline-offset-4"
          >
            Inspect the controlled demonstration{' '}
            <ExternalLink className="size-4" />
          </Link>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[#10261f]/20 bg-[#10261f]/15 sm:grid-cols-2">
          {[
            'Exact public URL and timestamp',
            'Device, viewport, browser and market',
            'Numbered reproduction steps',
            'Observed and expected result',
            'Customer-impact hypothesis, labelled as uncertain',
            'First repair direction and acceptance check',
          ].map((item, index) => (
            <div key={item} className="flex gap-3 bg-[#f8f4e8] p-5">
              <span className="font-mono text-xs font-black text-[#477a5b]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="text-sm font-semibold leading-6 sm:text-base">
                {item}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#10261f]/15 bg-white/35">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#477a5b]">
            Questions
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Shopify storefront QA checklist FAQ
          </h2>
          <div className="mt-8 divide-y divide-[#10261f]/15 border-y border-[#10261f]/15">
            {faq.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="cursor-pointer list-none pr-8 text-lg font-black marker:hidden">
                  {item.question}
                </summary>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f2c14e]">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-10">
          <div>
            <p className="flex items-start gap-2 text-sm font-bold">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" /> Independent
              public-storefront QA. No Shopify admin access or implementation.
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              Need the evidence collected and prioritised for you?
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7">
              The £99 Store Emergency Check investigates one reported public
              storefront problem, documents browser evidence and repair
              direction, and includes one public retest after your repair. If
              the problem is launch planning rather than a defect, the £39 Store
              Launch Kit is the more suitable starting point.
            </p>
          </div>
          <Link
            href="/start"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#10261f] px-6 py-3 font-bold text-white hover:bg-[#1d4539]"
          >
            See the focused options <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
