import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { StartForm } from '@/components/start-form';
import { publicConfig } from '@/lib/config';
import { getProduct } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const config = publicConfig();
  const selected = getProduct((await searchParams).product);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        <Link
          href={selected ? `/products/${selected.id}` : '/#products'}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to{' '}
          {selected ? selected.name : 'products'}
        </Link>
        <div className="mt-8 grid gap-9 rounded-[2rem] border-2 border-foreground bg-card p-6 shadow-[10px_10px_0_#10261f] sm:p-10">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-[#477a5b]">
              Storefront HQ · Product enquiry · No commitment
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[.98] tracking-[-0.05em] sm:text-6xl">
              Tell us what is stopping your store.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              We’ll point you to the narrowest suitable product. If one of the
              focused services fits, you can check fit before paying. Never send
              passwords, customer records or store-admin access.
            </p>
          </div>
          <section aria-labelledby="enquiry-heading">
            <h2 id="enquiry-heading" className="text-2xl font-black">
              Your store and the problem
            </h2>
            <p className="mb-6 mt-3 text-base leading-7 text-muted-foreground">
              Submitting this form stores your request but does not verify your
              email address or trigger an automatic email.
            </p>
            <StartForm
              enabled={config.intakeReady}
              contactEmail={config.contactEmail}
              initialProductId={selected?.id}
            />
          </section>
          <div className="flex gap-3 border-t pt-5 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#477a5b]" />
            <p>
              No marketing-list enrolment. Details are used only to assess and
              respond to this request.
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
