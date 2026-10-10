import {
  ArrowRight,
  CircleCheck,
  FileCheck2,
  PackageCheck,
  PenLine,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

import { ProductCard } from '@/components/product-card';
import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { products } from '@/lib/products';

const homepageProducts = [
  products.find((product) => product.id === 'product-page-rescue')!,
  products.find((product) => product.id === 'store-launch-kit')!,
  products.find((product) => product.id === 'store-emergency-check')!,
  products.find((product) => product.id === 'seller-campaign-club')!,
];

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
              One public product page · £79 one-time
            </p>
            <h1 className="mt-7 max-w-4xl text-balance text-[clamp(3rem,6.2vw,5.8rem)] font-black leading-[.92] tracking-[-0.06em]">
              Make your best product easier to buy.
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              Send one live product URL. We rewrite the page’s buying argument,
              answer common objections and return copy and checks your team can
              publish—within 2 business days.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/products/product-page-rescue"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff6b35] px-6 text-base font-black text-white shadow-[0_7px_0_#10261f] hover:bg-[#e95725]"
              >
                See the £79 rescue <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/start?product=product-page-rescue"
                className="px-3 py-3 text-sm font-black underline decoration-[#ff6b35] decoration-2 underline-offset-4"
              >
                Check fit before paying
              </Link>
            </div>
            <p className="mt-7 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-[#477a5b]" />
              No admin access. You keep control of implementation. No revenue
              promises.
            </p>
          </div>
          <div className="relative">
            <div
              className="absolute -right-8 -top-10 size-32 rounded-full bg-[#f2c14e]/70 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative rotate-1 rounded-[2rem] border-2 border-[#10261f] bg-[#10261f] p-6 text-[#f8f4e8] shadow-[14px_14px_0_#ff6b35] sm:p-8">
              <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-[#a8d66d]">
                Your Product Page Rescue
              </p>
              <div className="mt-7 space-y-4">
                {[
                  [PenLine, '01', 'Rewrite the title, benefits and description'],
                  [Sparkles, '02', 'Answer objections with FAQ and trust copy'],
                  [PackageCheck, '03', 'Shape the image brief and campaign hooks'],
                  [FileCheck2, '04', 'Add public usability and acceptance checks'],
                ].map(([Icon, number, label]) => {
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
                      <strong className="font-mono text-sm text-[#f2c14e]">
                        {String(number)}
                      </strong>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-sm leading-6 text-[#b9c6b7]">
                One public page. Fixed £79 scope. Delivered within 2 business
                days.
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
            Start narrow
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-6xl">
            One clear first offer. Three useful next steps.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Product Page Rescue is the most direct starting point when a live
            store has traffic but one important page is not doing enough work.
            The other products stay available for launch, emergencies and
            repeatable campaigns.
          </p>
        </div>
        <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
          {homepageProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              featured={product.id === 'product-page-rescue'}
            />
          ))}
        </div>
      </section>
      <section className="border-y border-[#10261f]/15 bg-white/45">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:px-10">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[.18em] text-[#477a5b]">
              Illustrative example · not a client result
            </p>
            <h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.045em] sm:text-5xl">
              The job is clarity, not decoration.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              A rescue turns thin product copy into a buying argument your
              customer can scan, understand and assess without guessing.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[1.75rem] border-2 border-[#10261f] bg-[#10261f] sm:grid-cols-2">
            <article className="bg-[#f8f4e8] p-6 sm:p-8">
              <p className="font-mono text-xs font-black uppercase tracking-[.16em] text-[#a34c2c]">
                Before
              </p>
              <h3 className="mt-4 text-2xl font-black">Premium everyday tote</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Stylish, practical and available in several colours. Perfect
                for work or weekends.
              </p>
            </article>
            <article className="bg-[#eaf2dc] p-6 sm:p-8">
              <p className="font-mono text-xs font-black uppercase tracking-[.16em] text-[#477a5b]">
                After direction
              </p>
              <h3 className="mt-4 text-2xl font-black">
                A structured work tote without the bulk
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Lead with who it helps, what fits, how it carries and the
                questions that delay purchase—then support that story with the
                right image sequence.
              </p>
            </article>
          </div>
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
