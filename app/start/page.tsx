import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { StartForm } from '@/components/start-form';
import { SprintContact } from '@/components/sprint-contact';
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
              A recent theme change, store launch or campaign coming up? We
              provide diagnosis and repair guidance for your implementation
              team—not code changes. The fixed fee is £{offer.priceGbp}, paid
              before work. You will never be asked for Shopify admin access.
            </p>
          </div>
          <SprintContact contactEmail={config.contactEmail} />
          <section aria-labelledby="fit-form-heading">
            <h2 id="fit-form-heading" className="text-2xl font-black">Or use the fit-check form.</h2>
            <p className="mb-6 mt-3 text-base leading-7 text-muted-foreground">After submitting, confirm from your own email or book a fit call. This form alone does not trigger an automatic email.</p>
            <StartForm
              enabled={config.launchReady}
              contactEmail={config.contactEmail}
            />
          </section>
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
