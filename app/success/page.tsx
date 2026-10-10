import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { publicConfig } from '@/lib/config';
import { getCommerceOrder } from '@/lib/database';
import { digitalAssets } from '@/lib/digital-products';
import { getProduct } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const sessionId = (await searchParams).session_id?.trim() ?? '';
  const validSession = /^cs_live_[A-Za-z0-9_-]{8,255}$/.test(sessionId);
  const order = validSession ? await getCommerceOrder(sessionId) : null;
  const product = order ? getProduct(order.product_id) : null;
  const cleared = order?.outcome === 'cleared_expected';
  const assets = product ? (digitalAssets[product.id] ?? []) : [];
  const config = publicConfig();
  const onboardingBody = product
    ? [
        `I have paid for ${product.name}.`,
        '',
        `Stripe Checkout Session: ${sessionId}`,
        '',
        'Public store URL:',
        product.id === 'product-page-rescue'
          ? 'Product page URL:'
          : 'Problem URL / journey:',
        'What I need help with:',
        'Important deadline or market:',
        '',
        'I will not send passwords, customer records or store-admin access.',
      ].join('\n')
    : '';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-20">
        <section className="rounded-[2rem] border-2 border-[#10261f] bg-white/55 p-6 shadow-[12px_12px_0_#10261f] sm:p-10">
          {cleared && product ? (
            <>
              <CheckCircle2 className="size-12 text-[#477a5b]" />
              <p className="mt-6 font-mono text-xs font-black uppercase tracking-[.17em] text-[#477a5b]">
                Payment confirmed
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                Your {product.name} is ready.
              </h1>
              {assets.length ? (
                <div className="mt-8">
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                    Download and save your files now. Each file is editable in a
                    plain-text editor or spreadsheet app.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {assets.map((asset) => (
                      <a
                        key={asset.filename}
                        href={`/api/download/${encodeURIComponent(asset.filename)}?session_id=${encodeURIComponent(sessionId)}`}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-[#10261f]/20 bg-[#f8f4e8] p-4 font-bold hover:border-[#10261f]"
                      >
                        <span>{asset.title}</span>
                        <Download className="size-4 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl bg-[#e9f4dc] p-6">
                  <h2 className="text-2xl font-black">
                    Send the details we need to begin.
                  </h2>
                  <p className="mt-3 text-sm leading-6">
                    Your payment is recorded. Reply from the same email used at
                    checkout and include the public URLs and context requested
                    in the prepared message.
                  </p>
                  <a
                    href={`mailto:${config.contactEmail}?subject=${encodeURIComponent(`${product.name} onboarding — ${sessionId}`)}&body=${encodeURIComponent(onboardingBody)}`}
                    className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[#10261f] px-5 font-black text-white"
                  >
                    Open onboarding email <ArrowRight className="size-4" />
                  </a>
                </div>
              )}
              <div className="mt-8 flex gap-3 border-t pt-6 text-sm leading-6 text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#477a5b]" />
                <p>
                  Keep your Stripe receipt and session reference. Storefront HQ
                  never needs your card details or store password.
                </p>
              </div>
            </>
          ) : (
            <>
              <Clock3 className="size-12 text-[#477a5b]" />
              <p className="mt-6 font-mono text-xs font-black uppercase tracking-[.17em] text-[#477a5b]">
                Verifying payment
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                We have not unlocked the order yet.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                The signed Stripe event may still be arriving, or this page does
                not contain a valid live Checkout Session. Refresh once after a
                short wait. A success-page visit alone is never treated as proof
                of payment.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={
                    validSession
                      ? `/success?session_id=${encodeURIComponent(sessionId)}`
                      : '/'
                  }
                  className="inline-flex h-11 items-center rounded-full bg-[#10261f] px-5 font-black text-white"
                >
                  Check again
                </a>
                <Link
                  href="/start"
                  className="inline-flex h-11 items-center px-4 font-black underline underline-offset-4"
                >
                  Contact Storefront HQ
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
