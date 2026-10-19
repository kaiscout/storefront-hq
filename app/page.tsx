import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  MousePointerClick,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

import { ProductCard } from '@/components/product-card';
import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { products } from '@/lib/products';

const homepageProducts = [
  products.find((product) => product.id === 'store-emergency-check')!,
  products.find((product) => product.id === 'product-page-rescue')!,
  products.find((product) => product.id === 'store-launch-kit')!,
  products.find((product) => product.id === 'seller-campaign-club')!,
];

const emergencySteps = [
  {
    icon: FileSearch,
    number: '01',
    label: 'Reproduce one reported public-storefront issue',
  },
  {
    icon: AlertTriangle,
    number: '02',
    label: 'Show the likely failure point and customer impact',
  },
  {
    icon: CheckCircle2,
    number: '03',
    label: 'Give your implementer a repair and acceptance brief',
  },
  {
    icon: RotateCw,
    number: '04',
    label: 'Retest the same public issue after your repair',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader />
      <section className="relative border-b border-[#10261f]/10 bg-[#f0f1e8]">
        <div
          className="qa-grid absolute inset-0 opacity-15"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.06fr_.94fr] lg:items-center lg:px-10 lg:py-24">
          <div>
            <p className="inline-flex rounded-full border border-[#10261f]/20 bg-white/60 px-3 py-1.5 text-xs font-black uppercase tracking-[0.13em]">
              One public storefront problem · £99 one-time
            </p>
            <h1 className="mt-7 max-w-4xl text-balance text-[clamp(3rem,5.8vw,5.3rem)] font-extrabold leading-[1.02] tracking-[-0.06em]">
              Something broke.
              <br />
              <span className="text-[#477a5b]">Find the next fix fast.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              Send one public buying-path problem. Storefront HQ reproduces it,
              returns evidence and a repair-ready acceptance check within 24
              hours, then retests the same issue after your fix.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/products/store-emergency-check"
                className="button-primary"
              >
                See the £99 emergency check <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/triage"
                className="px-3 py-3 text-sm font-black underline decoration-[#ff6b35] decoration-2 underline-offset-4"
              >
                Try the free triage first
              </Link>
            </div>
            <Link
              href="/products/store-emergency-check#worked-example"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold underline decoration-[#477a5b] decoration-2 underline-offset-4"
            >
              See the evidence in a controlled demo
              <ArrowRight className="size-4" />
            </Link>
            <p className="mt-7 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#477a5b]" />
              Public pages only. No admin access, implementation or revenue
              promises.
            </p>
          </div>

          <div className="relative">
            <div
              className="absolute -right-8 -top-10 size-32 rounded-full bg-[#f2c14e]/70 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative rounded-[2rem] border border-[#10261f] bg-[#10261f] p-6 text-[#f8f4e8] shadow-2xl shadow-[#10261f]/15 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-[#a8d66d]">
                  Store Emergency Check
                </p>
                <span className="rounded-full bg-[#f2c14e] px-3 py-1 text-xs font-black text-[#10261f]">
                  £99
                </span>
              </div>
              <div className="mt-7 space-y-4">
                {emergencySteps.map(({ icon: Icon, number, label }) => (
                  <div
                    key={number}
                    className="grid grid-cols-[38px_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-4"
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-[#a8d66d] text-[#10261f]">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-bold sm:text-base">
                      {label}
                    </span>
                    <strong className="font-mono text-sm text-[#f2c14e]">
                      {number}
                    </strong>
                  </div>
                ))}
              </div>
              <p className="mt-6 flex gap-2 text-sm leading-6 text-[#b9c6b7]">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-[#f2c14e]" />
                Initial diagnosis within 24 hours after confirmed payment and
                receipt of the required public URLs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#10261f]/10 bg-[#e8eddf]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:px-10">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[.18em]">
              Not sure what is actually wrong?
            </p>
            <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.045em]">
              Triage it in three questions.
            </h2>
          </div>
          <div className="rounded-[1.75rem] border border-[#10261f]/15 bg-[#fffefb] p-6 sm:p-7">
            <div className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#10261f] text-white">
                <MousePointerClick className="size-5" />
              </span>
              <div>
                <p className="font-black">Get a useful first-check plan now</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The free tool gives you tests, an acceptance check and the
                  evidence to preserve. It needs no email, login, crawl or admin
                  access.
                </p>
                <Link
                  href="/triage"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-black underline decoration-[#ff6b35] decoration-2 underline-offset-4"
                >
                  Start free triage <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="products"
        className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24 lg:px-10"
      >
        <div className="max-w-3xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-[#477a5b]">
            Start with the bottleneck
          </p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
            One urgent first step. Three focused alternatives.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Store Emergency Check is the fastest route when a public buying
            journey looks broken. Choose a narrower product only when the real
            need is a page rewrite, a launch system or repeatable campaign
            material.
          </p>
        </div>
        <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
          {homepageProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              featured={product.id === 'store-emergency-check'}
            />
          ))}
        </div>
      </section>

      <section className="border-y border-[#10261f]/15 bg-white/45">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-10">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[.18em] text-[#477a5b]">
              A clean handoff
            </p>
            <h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.045em] sm:text-5xl">
              Your implementer gets evidence, not a vague audit.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              The service stops at public diagnosis and retesting. Your
              developer, agency or in-house owner keeps control of the repair.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[1.75rem] border-2 border-[#10261f] bg-[#10261f] sm:grid-cols-2">
            {[
              [
                'Observed',
                'Exact URL, time, environment and reproduction result.',
              ],
              [
                'Why it matters',
                'Likely customer impact, with uncertainty stated.',
              ],
              [
                'First repair',
                'Prioritised direction for the person implementing the fix.',
              ],
              [
                'Done means',
                'A public acceptance check and one retest after repair.',
              ],
            ].map(([title, description], index) => (
              <article key={title} className="bg-[#f8f4e8] p-6 sm:p-8">
                <span className="font-mono text-xs font-black text-[#477a5b]">
                  0{index + 1}
                </span>
                <h3 className="mt-3 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="rounded-[2rem] border border-[#10261f]/15 bg-[#eaf2dc] p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-black uppercase tracking-[.18em] text-[#477a5b]">
              Agencies and implementers
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Add an independent public-store check before handoff.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Use the fixed £99 scope for one reported issue while your team
              retains implementation ownership. No white-label claims or admin
              access required.
            </p>
          </div>
          <Link
            href="/agency-partners"
            className="mt-6 inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#10261f] px-6 text-sm font-black text-white hover:bg-[#1d4539] lg:mt-0"
          >
            See the agency route <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="site-container pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/contact"
            className="rounded-3xl border border-[#10261f]/15 bg-white/65 p-7 transition-colors hover:bg-white"
          >
            <p className="eyebrow">Talk to us</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              Have a question before you commit?
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Get help with product fit, an existing order or a public
              storefront problem.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">
              Contact Storefront HQ <ArrowRight className="size-4" />
            </span>
          </Link>
          <Link
            href="/reviews"
            className="rounded-3xl border border-[#10261f]/15 bg-white/65 p-7 transition-colors hover:bg-white"
          >
            <p className="eyebrow">Real feedback</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              Used a product or tried free triage?
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Share what helped and what could be better. Reviews stay private
              until permission and moderation.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">
              Reviews & feedback <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
