import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { pageMetadata } from '@/lib/metadata';
import { products } from '@/lib/products';

export const metadata = pageMetadata(
  'Products for online sellers',
  'Compare four focused products, from a £99 public-storefront diagnosis to launch resources and monthly campaign packs.',
  '/products',
);
const orderedProducts = [
  'store-emergency-check',
  'product-page-rescue',
  'store-launch-kit',
  'seller-campaign-club',
].map((id) => products.find((p) => p.id === id)!);

export default function ProductsPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="page-intro">
        <div className="site-container">
          <p className="eyebrow">The right help, without the big project</p>
          <h1 className="page-title">
            One clear need.
            <br />
            <span className="text-[#477a5b]">One focused product.</span>
          </h1>
          <p className="page-description">
            Start with the bottleneck. Whether something broke, one page needs
            work or you need a practical launch plan, choose a scope you can
            understand before you pay.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-[#477a5b]" /> GBP pricing. Clear
            deliverables. No revenue promises.
          </p>
        </div>
      </section>
      <section className="site-container py-14 sm:py-20">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {orderedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              featured={product.id === 'store-emergency-check'}
            />
          ))}
        </div>
      </section>
      <section className="site-container pb-20">
        <div className="flex flex-col gap-6 rounded-3xl border border-[#10261f]/10 bg-white/70 p-7 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Not sure what to choose?
            </h2>
            <p className="mt-2 max-w-xl leading-7 text-muted-foreground">
              Try the free triage for a first-check plan, or describe your
              situation. We’ll help you check fit before payment.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/triage" className="button-primary">
              Free triage <ArrowRight className="size-4" />
            </Link>
            <Link href="/contact" className="button-secondary">
              Ask a question
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
