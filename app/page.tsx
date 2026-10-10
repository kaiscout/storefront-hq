import {
  ArrowRight,
  CircleCheck,
  PackageCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';

import { ProductCard } from '@/components/product-card';
import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { products } from '@/lib/products';

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader />
      <section className="relative border-b border-[#10261f]/15">
        <div
          className="qa-grid absolute inset-0 opacity-50"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-10 lg:py-28">
          <div>
            <p className="inline-flex rounded-full border border-[#10261f]/20 bg-white/60 px-3 py-1.5 text-xs font-black uppercase tracking-[0.13em]">
              For online sellers who need the next useful step
            </p>
            <h1 className="mt-7 max-w-4xl text-balance text-[clamp(3rem,6.2vw,5.8rem)] font-black leading-[.92] tracking-[-0.06em]">
              Build a store people can understand—and buy from.
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              Start with a ready-to-use launch system, get one important page
              fixed, diagnose an urgent storefront problem, or keep your
              marketing moving every month.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#products"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff6b35] px-6 text-base font-black text-white shadow-[0_7px_0_#10261f] hover:bg-[#e95725]"
              >
                Choose a product <ArrowRight className="size-4" />
              </a>
              <Link
                href="/start"
                className="px-3 py-3 text-sm font-black underline decoration-[#ff6b35] decoration-2 underline-offset-4"
              >
                Not sure? Tell us what is stuck
              </Link>
            </div>
            <p className="mt-7 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-[#477a5b]" />
              No admin access required for any service. No guaranteed revenue
              claims.
            </p>
          </div>
          <div className="relative">
            <div
              className="absolute -right-8 -top-10 size-32 rounded-full bg-[#f2c14e]/70 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative rotate-1 rounded-[2rem] border-2 border-[#10261f] bg-[#10261f] p-6 text-[#f8f4e8] shadow-[14px_14px_0_#ff6b35] sm:p-8">
              <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-[#a8d66d]">
                One storefront. Four ways forward.
              </p>
              <div className="mt-7 space-y-4">
                {[
                  [PackageCheck, '£39', 'Build the launch basics'],
                  [Sparkles, '£79', 'Strengthen one product page'],
                  [Wrench, '£99', 'Diagnose one urgent issue'],
                  [CircleCheck, '£19/mo', 'Plan the next campaign'],
                ].map(([Icon, price, label]) => {
                  const Glyph = Icon as typeof PackageCheck;
                  return (
                    <div
                      key={String(label)}
                      className="grid grid-cols-[38px_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-4"
                    >
                      <span className="grid size-9 place-items-center rounded-xl bg-[#a8d66d] text-[#10261f]">
                        <Glyph className="size-4" />
                      </span>
                      <span className="text-sm font-bold sm:text-base">
                        {String(label)}
                      </span>
                      <strong className="text-sm text-[#f2c14e]">
                        {String(price)}
                      </strong>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-sm leading-6 text-[#b9c6b7]">
                Buy only the help you need now. Move up only when the next
                problem appears.
              </p>
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
            The Storefront shelf
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-6xl">
            Pick the problem you want solved.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Each product has a narrow job, a clear price and a concrete output.
            The £39 kit is the broadest starting point; the services are for
            focused intervention.
          </p>
        </div>
        <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              featured={product.id === 'store-launch-kit'}
            />
          ))}
        </div>
      </section>
      <section className="border-y border-[#10261f]/15 bg-[#f2c14e]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-10">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[.18em]">
              How to choose
            </p>
            <h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.045em]">
              Start with the bottleneck, not a bundle.
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border-2 border-[#10261f] bg-[#10261f] sm:grid-cols-2">
            {[
              ['Launching or rebuilding?', 'Choose the Store Launch Kit.'],
              ['One product page is weak?', 'Choose Product Page Rescue.'],
              ['Something is broken now?', 'Choose the Store Emergency Check.'],
              ['Marketing keeps stalling?', 'Choose Seller Campaign Club.'],
            ].map(([question, answer]) => (
              <div key={question} className="bg-[#f8f4e8] p-5">
                <p className="text-sm font-bold text-muted-foreground">
                  {question}
                </p>
                <p className="mt-2 text-lg font-black">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-[#477a5b]">
            Useful before you buy
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
            Run the free launch and migration checklist.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            Check the public buying journey yourself first. If the problem is
            still unclear, the paid options are here when you need them.
          </p>
        </div>
        <Link
          href="/shopify-launch-migration-qa-checklist"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-[#10261f] px-6 font-black hover:bg-[#10261f] hover:text-white"
        >
          Open the free checklist <ArrowRight className="size-4" />
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
