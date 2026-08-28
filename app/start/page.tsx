import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { StartForm } from '@/components/start-form';
import { publicConfig } from '@/lib/config';
import { offer } from '@/lib/offer';

export const dynamic = 'force-dynamic';

export default function StartPage() {
  const config = publicConfig();
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to the scope
        </Link>
        <div className="mt-10 grid gap-9 rounded-[2rem] border-2 border-foreground bg-card p-6 shadow-[10px_10px_0_#10261f] sm:p-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#477a5b]">
              {offer.brandName} · {offer.productName} · No commitment
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.045em] sm:text-6xl">
              Is your store a fit for the {offer.deliveryHours}-hour sprint?
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Share the public storefront and a work email. We check the £
              {offer.priceGbp} fixed scope before sending a payment link. You
              will never be asked for Shopify admin access.
            </p>
          </div>
          <StartForm enabled={config.launchReady} />
          <div className="flex gap-3 border-t pt-5 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#477a5b]" />
            <p>
              No trackers or mailing-list enrollment. Details are used only to
              assess and respond to this request.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
