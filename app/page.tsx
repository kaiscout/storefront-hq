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
  `Daily checks on ${offer.watchRouteLimit} critical pages for ${offer.watchDays} days`,
];

const findings = [
  {
    severity: 'Critical',
    path: '/collections/summer-edit',
    signal: 'Featured product route returns 404 on mobile',
    tone: 'bg-[#ff6b35] text-white',
  },
  {
    severity: 'High',
    path: '/products/linen-set',
    signal: 'Sale copy conflicts with the price shown in cart',
    tone: 'bg-[#f2c14e] text-[#10261f]',
  },
  {
    severity: 'Medium',
    path: '/pages/shipping',
    signal: 'Delivery promise disagrees with checkout messaging',
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
              Check availability <ArrowRight data-icon="inline-end" />
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
              className="mb-6 h-auto rounded-full border-foreground/20 bg-background px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em]"
            >
              {offer.productName} · Shopify · Peak-season readiness ·{' '}
              {offer.deliveryHours} hours
            </Badge>
            <h1 className="max-w-4xl text-balance text-[clamp(3rem,7vw,6.5rem)] font-black leading-[0.88] tracking-[-0.065em]">
              Find the broken buying paths before your customers do.
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              The {offer.productName} is a fixed-scope Shopify storefront QA
              sprint with reproducible evidence, fix-ready recommendations, and{' '}
              {offer.watchDays} days of regression watch. No backend access. No
              retainer. No vague conversion theatre.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/start"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-12 rounded-full bg-[#ff6b35] px-6 text-base font-bold text-white shadow-[0_8px_0_#10261f] hover:bg-[#e95725]',
                )}
              >
                Start the £{offer.priceGbp} sprint{' '}
                <ArrowRight data-icon="inline-end" />
              </Link>
              <Link
                href="/sample-report"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-[#10261f] underline decoration-[#ff6b35] decoration-2 underline-offset-4"
              >
                See real checks: before → after
              </Link>
              <span className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
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
              Example evidence
            </div>
            <Card className="gap-0 overflow-hidden rounded-[1.75rem] border-2 border-foreground/90 bg-[#10261f] py-0 text-[#f8f4e8] shadow-[14px_14px_0_rgba(16,38,31,0.14)] ring-0">
              <CardHeader className="gap-4 border-b border-white/15 px-5 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#b9c6b7]">
                      Evidence ledger · Sample store
                    </p>
                    <CardTitle className="mt-2 text-xl font-bold text-white">
                      Purchase-path findings
                    </CardTitle>
                  </div>
                  <span className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider">
                    <span className="size-2 animate-pulse rounded-full bg-[#a8d66d]" />
                    Illustrative
                  </span>
                </div>
                <CardDescription className="text-[#b9c6b7]">
                  Every item includes a timestamp, source route, screenshot and
                  exact reproduction steps.
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
            </Card>
          </div>
        </div>
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
              Bring a live Shopify store. Leave with a fix-ready evidence pack.
            </h2>
          </div>
          <Link
            href="/start"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-12 rounded-full bg-[#10261f] px-6 text-base font-bold text-white hover:bg-[#1d4539]',
            )}
          >
            Request a slot <ExternalLink data-icon="inline-end" />
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
