import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  ShieldCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { productCheckoutConfig } from '@/lib/config';
import { getProduct, productPrice, products } from '@/lib/products';

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = getProduct((await params).slug);
  return product
    ? { title: `${product.name} | Storefront HQ`, description: product.promise }
    : {};
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const checkoutReady = productCheckoutConfig()[product.id].ready;
  const isService = product.kind === 'service';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="border-b border-[#10261f]/15">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20 lg:px-10">
          <Link
            href="/#products"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> All products
          </Link>
          <div className="mt-9 grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[.18em] text-[#477a5b]">
                {product.eyebrow}
              </p>
              <h1 className="mt-4 text-balance text-5xl font-black leading-[.94] tracking-[-0.055em] sm:text-7xl">
                {product.name}
              </h1>
              <p className="mt-6 max-w-2xl text-xl font-semibold leading-8">
                {product.promise}
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                {product.description}
              </p>
              <div className="mt-8 flex flex-wrap items-end gap-x-4 gap-y-2">
                <strong className="text-5xl font-black tracking-[-0.055em]">
                  {productPrice(product)}
                </strong>
                <span className="pb-1 text-sm text-muted-foreground">
                  {product.billing === 'one-time'
                    ? 'one-time payment'
                    : 'billed monthly until cancelled'}
                </span>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                {checkoutReady ? (
                  <Link
                    href={`/buy/${product.id}`}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff6b35] px-6 text-base font-black text-white shadow-[0_6px_0_#10261f] hover:bg-[#e95725]"
                  >
                    {product.cta} <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <Link
                    href={`/start?product=${product.id}`}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#10261f] px-6 text-base font-black text-white"
                  >
                    Ask about availability <ArrowRight className="size-4" />
                  </Link>
                )}
                {isService ? (
                  <Link
                    href={`/start?product=${product.id}`}
                    className="inline-flex h-12 items-center justify-center px-5 text-sm font-black underline decoration-[#ff6b35] decoration-2 underline-offset-4"
                  >
                    Check fit before paying
                  </Link>
                ) : null}
              </div>
              {!checkoutReady ? (
                <p className="mt-5 flex max-w-xl gap-2 rounded-xl border border-[#f2c14e] bg-[#f2c14e]/20 p-4 text-sm leading-6">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  Online checkout is being connected. The enquiry route is open,
                  but we will not pretend a payment is available until the live
                  link is verified.
                </p>
              ) : null}
            </div>
            <aside className="rounded-[2rem] border-2 border-[#10261f] bg-[#10261f] p-6 text-[#f8f4e8] shadow-[12px_12px_0_#f2c14e] sm:p-8">
              <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-[#a8d66d]">
                What you receive
              </p>
              <ul className="mt-6 space-y-4">
                {product.deliverables.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm leading-6 sm:text-base"
                  >
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#a8d66d] text-[#10261f]">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 border-t border-white/15 pt-6 text-sm text-[#b9c6b7]">
                <p className="flex gap-2">
                  <Clock3 className="size-4 shrink-0 text-[#f2c14e]" />
                  {product.turnaround}
                </p>
                <p className="mt-3 flex gap-2">
                  <ShieldCheck className="size-4 shrink-0 text-[#f2c14e]" />
                  Secure payment through Stripe. No card details are handled by
                  Storefront HQ.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:px-10">
        <h2 className="text-3xl font-black tracking-[-0.04em]">
          Before you buy
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {product.features.map((feature, index) => (
            <article
              key={feature}
              className="rounded-2xl border border-[#10261f]/15 bg-white/50 p-5"
            >
              <span className="font-mono text-xs text-[#477a5b]">
                0{index + 1}
              </span>
              <p className="mt-3 font-bold leading-6">{feature}</p>
            </article>
          ))}
        </div>
        <p className="mt-8 max-w-4xl text-sm leading-6 text-muted-foreground">
          Storefront HQ provides templates, public-storefront diagnosis and
          implementation-ready guidance as described above. We do not guarantee
          sales results, access private store data, publish changes to your shop
          or act as your legal adviser. See the product terms before purchase.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
