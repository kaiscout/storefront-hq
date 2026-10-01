import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Clock3,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { agencyInquiryMailto, businessContactEmail } from '@/lib/contact';
import { publicConfig } from '@/lib/config';
import { offer } from '@/lib/offer';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Independent Shopify QA for agencies | Storefront HQ',
  description:
    'A fixed-scope, public-storefront QA release gate for Shopify agencies: 12 fix-ready findings in 48 hours for £895.',
};

const agencyUses = [
  {
    label: 'Before client handoff',
    detail:
      'Give your delivery team a reproducible repair queue before the final walkthrough.',
  },
  {
    label: 'After a theme change',
    detail:
      'Check product, collection, navigation and cart journeys on the live public storefront.',
  },
  {
    label: 'Before a campaign or launch',
    detail:
      'Test the paths that will receive attention before more visitors reach them.',
  },
];

const fixedScope = [
  `Up to ${offer.pageLimit} public storefront pages`,
  `${offer.selectedFindings} curated, fix-ready findings`,
  `Delivery within ${offer.deliveryHours} hours after cleared payment and confirmed scope`,
  `${offer.handoffMinutes}-minute findings handoff`,
  `${offer.watchDays}-day regression watch on up to ${offer.watchRouteLimit} approved public routes`,
  `£${offer.priceGbp} GBP, paid before work`,
];

export default function AgencyPartnersPage() {
  const config = publicConfig();
  const mailto = agencyInquiryMailto(config.contactEmail);

  return (
    <main className="min-h-screen bg-[#f8f4e8] text-[#10261f]">
      <header className="border-b border-[#10261f]/15 bg-[#f8f4e8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold"
          >
            <ArrowLeft className="size-4" /> {offer.brandName}
          </Link>
          <Link
            href="/sample-report"
            className="text-sm font-bold underline decoration-[#ff6b35] decoration-2 underline-offset-4"
          >
            Inspect the demonstration
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b-2 border-[#10261f] bg-[#10261f] text-[#f8f4e8]">
        <div
          className="absolute inset-0 qa-grid opacity-10"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#a8d66d]">
              Independent public-storefront QA for Shopify agencies
            </p>
            <h1 className="mt-5 max-w-4xl text-balance text-[clamp(2.8rem,5.7vw,5.4rem)] font-black leading-[0.96] tracking-[-0.05em]">
              A release gate your team can act on.
            </h1>
            <p className="mt-7 max-w-3xl text-pretty text-lg leading-8 text-white/75 sm:text-xl">
              Add an independent QA pass before launch or client handoff. We
              inspect the public storefront and return a prioritised evidence
              pack; your team keeps implementation and the client relationship.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {mailto ? (
                <a
                  href={mailto}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-12 rounded-full bg-[#ff6b35] px-6 text-base font-black text-white hover:bg-[#e95725]',
                  )}
                >
                  Check an agency project’s fit{' '}
                  <ArrowRight className="size-4" />
                </a>
              ) : null}
              <Link
                href="/sample-report"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/35 px-6 text-base font-bold text-white hover:bg-white/10"
              >
                See the evidence format
              </Link>
            </div>
            <p className="mt-5 flex max-w-2xl items-start gap-2 text-sm leading-6 text-white/60">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#a8d66d]" />
              No Shopify admin access, shopper records or implementation work.
              Independent service; not affiliated with or endorsed by Shopify.
            </p>
          </div>

          <div className="rounded-[1.75rem] border-2 border-white/20 bg-white/5 p-6 shadow-[14px_14px_0_rgba(168,214,109,0.18)] sm:p-8">
            <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-5">
              <div>
                <p className="text-sm font-bold text-[#a8d66d]">
                  Agency release card
                </p>
                <h2 className="mt-1 text-2xl font-black">One fixed sprint</h2>
              </div>
              <span className="rounded-full bg-[#f2c14e] px-3 py-1.5 font-mono text-xs font-black text-[#10261f]">
                £{offer.priceGbp}
              </span>
            </div>
            <ul className="mt-5 space-y-4">
              {fixedScope.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm font-semibold leading-6 sm:text-base"
                >
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#a8d66d] text-[#10261f]">
                    <Check className="size-3.5 stroke-[3]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#477a5b]">
              Where it fits
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">
              Bring us in at the risky edge.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The sprint is designed for a defined public journey and a team
              ready to implement. It does not replace development, analytics
              work or merchant-admin testing.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {agencyUses.map((item, index) => (
              <article
                key={item.label}
                className="rounded-2xl border border-[#10261f]/15 bg-white/55 p-5"
              >
                <span className="font-mono text-xs text-[#477a5b]">
                  0{index + 1}
                </span>
                <h3 className="mt-3 text-xl font-black">{item.label}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#10261f]/15 bg-[#d9e8c8]/55">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:px-10">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#477a5b]">
              Clean division of responsibility
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">
              We find and document. Your team fixes and ships.
            </h2>
            <ul className="mt-6 space-y-4 text-base leading-7">
              {[
                'Storefront HQ works only from public storefront evidence.',
                'Each selected finding includes reproduction, risk, repair direction and an acceptance check.',
                'Your agency decides implementation, client communication and release timing.',
                'The regression watch covers only the client-approved public routes in scope.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <CircleCheck className="mt-1 size-5 shrink-0 text-[#477a5b]" />{' '}
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/shopify-launch-migration-qa-checklist"
              className="mt-6 inline-flex items-center gap-2 font-bold underline decoration-[#ff6b35] decoration-2 underline-offset-4"
            >
              Use the free launch and migration checklist
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="rounded-[1.75rem] border-2 border-[#10261f] bg-[#f8f4e8] p-6 sm:p-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#477a5b]">
              Fit before payment
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Send the public store and release context.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              We will confirm whether the project fits the fixed
              public-storefront scope before sharing the payment link. Include
              the deadline, priority market and journey, and who will implement
              findings.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {mailto ? (
                <a
                  href={mailto}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-auto min-h-12 rounded-full px-5 py-3 text-center font-bold',
                  )}
                >
                  <Mail className="size-4" /> Email the project brief
                </a>
              ) : null}
              <Link
                href="/start"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#10261f]/25 px-5 py-3 font-bold"
              >
                Merchant fit check
              </Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              This opens your email app; nothing is sent until you send it. You
              can also write to{' '}
              <span className="break-all font-semibold text-[#10261f]">
                {businessContactEmail}
              </span>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f2c14e]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div>
            <div className="flex flex-wrap gap-4 font-mono text-[11px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Clock3 className="size-4" /> {offer.deliveryHours}-hour
                turnaround
              </span>
              <span className="flex items-center gap-2">
                <CircleCheck className="size-4" /> £{offer.priceGbp} fixed fee
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Make the handoff easier to defend.
            </h2>
          </div>
          <Link
            href="/sample-report"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#10261f] px-6 font-bold text-white hover:bg-[#1d4539]"
          >
            Inspect the controlled demo <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
