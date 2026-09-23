import {
  ArrowRight,
  Check,
  CircleCheck,
  Clock3,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { SprintContact } from '@/components/sprint-contact';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { publicConfig } from '@/lib/config';
import { offer } from '@/lib/offer';
import { cn } from '@/lib/utils';

const scope = [
  `Up to ${offer.pageLimit} public product, collection and policy pages`,
  `${offer.selectedFindings} confirmed findings with exact URLs and reproduction steps`,
  'Mobile screenshots, severity and fix-ready recommendations',
  'Top-three repair brief, retest checks, redirect CSV and copy-ready corrections',
  `${offer.handoffMinutes}-minute findings handoff`,
  `${offer.watchDays}-day regression watch on up to ${offer.watchRouteLimit} client-approved public routes`,
];

const findings = [
  {
    severity: 'Selection',
    path: 'Selected colour → cart',
    signal: 'Before: Navy selection adds Natural. After: the cart retains Navy.',
    tone: 'bg-[#ff6b35] text-white',
  },
  {
    severity: 'Delivery',
    path: 'Free-delivery promise → total',
    signal: 'Before: £6 delivery on a qualifying £69 order. After: £0 delivery.',
    tone: 'bg-[#f2c14e] text-[#10261f]',
  },
  {
    severity: 'Navigation',
    path: 'Product → size guide',
    signal: 'Before: guide returns 404. After: dimensions load successfully.',
    tone: 'bg-[#d9e8c8] text-[#10261f]',
  },
];

export default function Home() {
  const config = publicConfig();
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="border-b border-foreground/15 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <a
            href="#top"
            className="flex items-center gap-3"
            aria-label={`${offer.brandName} home`}
          >
            <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">
              {offer.deliveryHours}
            </span>
            <span className="text-sm font-bold tracking-[-0.02em] sm:text-base">
              {offer.brandName}
            </span>
          </a>
          <nav className="flex items-center gap-2" aria-label="Main navigation">
            <a
              href="#scope"
              className="hidden px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              What you get
            </a>
            <Link
              href="/sample-report"
              className="hidden px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              Proof & sample report
            </Link>
            <Link
              href="/start"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-10 rounded-full bg-[#ff6b35] px-4 font-bold text-white hover:bg-[#e95725]',
              )}
            >
              Check fit · £{offer.priceGbp} <ArrowRight data-icon="inline-end" />
            </Link>
          </nav>
        </div>
      </header>

      <section id="top" className="relative border-b border-foreground/15">
        <div
          className="qa-grid absolute inset-0 opacity-45"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:py-28">
          <div>
            <Badge
              variant="outline"
              className="mb-6 h-auto rounded-full border-foreground/20 bg-background px-3 py-1 text-sm font-bold"
            >
              Independent public-storefront QA · Shopify
            </Badge>
            <h1 className="max-w-4xl text-balance text-[clamp(2.7rem,5vw,4.8rem)] font-black leading-[1.04] tracking-[-0.045em]">
              Changed your Shopify store?
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              Know what needs fixing before your next campaign. In{' '}
              {offer.deliveryHours} hours, get a prioritised, evidence-backed
              repair plan your developer can act on. £{offer.priceGbp} fixed
              fee, paid before work. No admin access required.
            </p>
            <p className="mt-4 text-base leading-7 text-muted-foreground">Diagnosis and repair guidance. Your team implements the changes. No guaranteed sales uplift.</p>
            <div className="mt-7 flex flex-wrap gap-3 sm:items-center">
              <Link
                href="/start"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-12 rounded-full bg-[#ff6b35] px-6 text-base font-bold text-white shadow-[0_8px_0_#10261f] hover:bg-[#e95725]',
                )}
              >
                Check my store’s fit · £{offer.priceGbp}{' '}
                <ArrowRight data-icon="inline-end" />
              </Link>
              <Link
                href="/sample-report"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-[#10261f] underline decoration-[#ff6b35] decoration-2 underline-offset-4"
              >
                See real checks: before → after
              </Link>
              <span className="flex w-full items-start gap-2 py-3 text-sm leading-6 text-muted-foreground">
                <ShieldCheck className="size-4 text-[#477a5b]" />
                Fewer than {offer.minimumFindings} reproducible in-scope issues?
                Request a full refund within seven days.{' '}
                <Link href="/terms" className="underline underline-offset-2">
                  Terms
                </Link>
              </span>
            </div>
          </div>

          <div className="relative lg:pl-8">
            <div className="absolute -left-2 -top-5 hidden rotate-[-7deg] rounded-full border-2 border-foreground bg-[#f2c14e] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0_#10261f] sm:block lg:left-1">
              Reproduced & retested
            </div>
            <Card className="gap-0 overflow-hidden rounded-[1.75rem] border-2 border-foreground/90 bg-[#10261f] py-0 text-[#f8f4e8] shadow-[14px_14px_0_rgba(16,38,31,0.14)] ring-0">
              <CardHeader className="gap-4 border-b border-white/15 px-5 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#b9c6b7]">
                      Our controlled demonstration
                    </p>
                    <CardTitle className="mt-2 text-xl font-bold text-white">
                      See the issue. Check the repair.
                    </CardTitle>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
                    Before / after
                  </span>
                </div>
                <CardDescription className="text-[#b9c6b7]">
                  Three intentional defects in our own test storefront, checked
                  in mobile and desktop browsers. Not a client case study or a
                  claim of increased sales.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-white/10 px-0">
                {findings.map((finding, index) => (
                  <article
                    key={finding.path}
                    className="grid grid-cols-[42px_1fr] gap-3 px-5 py-5 sm:px-7"
                  >
                    <span className="font-mono text-xs text-white/45">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                            finding.tone,
                          )}
                        >
                          {finding.severity}
                        </span>
                        <code className="text-xs text-[#a8d66d]">
                          {finding.path}
                        </code>
                      </div>
                      <p className="text-sm font-semibold leading-6 text-white sm:text-base">
                        {finding.signal}
                      </p>
                    </div>
                  </article>
                ))}
              </CardContent>
              <div className="border-t border-white/15 px-5 py-5 sm:px-7">
                <Link href="/sample-report" className="text-base font-bold text-[#a8d66d] underline underline-offset-4">Try the demo and inspect the evidence</Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section aria-labelledby="fit-heading" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <h2 id="fit-heading" className="text-3xl font-black tracking-tight sm:text-4xl">For a store with a decision to make.</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">Best suited to an established store or an agency release with a defined public journey to check and someone ready to act on the findings.</p>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {[
            ['A theme change or migration', 'Check public product, collection and cart journeys after changes. Give your developer reproducible issues instead of vague reports.'],
            ['A launch or paid campaign', 'Review the public buying path and the consistency of product, delivery and returns information before directing more traffic to it.'],
            ['An agency client release', 'Get an independent public-storefront QA pass. Your team keeps implementation; the evidence pack provides repair and acceptance-check guidance.'],
          ].map(([title, description]) => <article key={title} className="rounded-2xl border border-foreground/15 bg-white/50 p-6"><h3 className="text-xl font-bold">{title}</h3><p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p></article>)}
        </div>
        <p className="mt-6 text-base leading-7 text-muted-foreground">Need a developer to implement changes, analyse private analytics, access your admin or complete a checkout? Those are outside this sprint.</p>
      </section>

      <section id="scope" className="bg-[#10261f] text-[#f8f4e8]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:px-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#a8d66d]">
              Fixed scope. Fixed fee.
            </p>
            <h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.04em] sm:text-5xl">
              A repair queue,
              <br />
              not another score.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-[#b9c6b7]">
              Automated scanners are good at generating warnings. This sprint
              turns observable storefront failures into evidence your developer
              can reproduce and fix.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 sm:grid-cols-2">
            {scope.map((item, index) => (
              <div key={item} className="flex gap-4 bg-[#10261f] p-5 sm:p-6">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#a8d66d] text-[#10261f]">
                  <Check className="size-4 stroke-[3]" />
                </span>
                <div>
                  <span className="font-mono text-[10px] text-white/40">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-1 text-sm font-semibold leading-6 sm:text-base">
                    {item}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="operator-heading" className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:px-10">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#477a5b]">Who is behind Storefront HQ?</p>
          <h2 id="operator-heading" className="mt-3 text-3xl font-black tracking-tight">Run by {config.operatorName || 'Deniz Izci'}.</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">Storefront HQ provides independent public-storefront quality assurance. The work focuses on observable behaviour, reproducible evidence and practical repair guidance—not an unexplained score.</p>
          <p className="mt-4 text-base leading-7 text-muted-foreground">First we confirm fit and scope. Once payment has cleared and your live store, priority market and critical routes are confirmed, the {offer.deliveryHours}-hour delivery window begins. You receive the evidence pack and {offer.handoffMinutes}-minute handoff; your team owns implementation.</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Independent service. Not affiliated with or endorsed by Shopify. <Link href="/terms" className="underline underline-offset-2">Read the existing service terms</Link>.</p>
        </div>
        <SprintContact contactEmail={config.contactEmail} />
      </section>

      <section
        id="start"
        className="border-b border-foreground/15 bg-[#f2c14e]"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10">
          <div>
            <div className="mb-4 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Clock3 className="size-4" /> {offer.deliveryHours}-hour
                delivery
              </span>
              <span className="flex items-center gap-2">
                <CircleCheck className="size-4" /> £{offer.priceGbp} one-off
              </span>
            </div>
            <h2 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.045em] sm:text-6xl">
              Bring a clear question. Leave with a prioritised repair plan.
            </h2>
          </div>
          <Link
            href="/start"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-12 rounded-full bg-[#10261f] px-6 text-base font-bold text-white hover:bg-[#1d4539]',
            )}
          >
            Check fit before paying <ExternalLink data-icon="inline-end" />
          </Link>
        </div>
      </section>

      <footer className="bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <div>
            <p>
              {offer.brandName} ·{' '}
              {config.operatorName || 'Independent public-storefront QA'} · Not
              affiliated with or endorsed by Shopify.
            </p>
            <nav className="mt-2 flex gap-4">
              <Link href="/privacy" className="underline underline-offset-2">
                Privacy
              </Link>
              <Link href="/terms" className="underline underline-offset-2">
                Terms
              </Link>
            </nav>
          </div>
          <p>No checkout completion · No shopper records · No backend access</p>
        </div>
      </footer>
    </main>
  );
}
