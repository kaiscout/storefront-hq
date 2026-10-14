import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { agencyInquiryMailto } from '@/lib/contact';
import { publicConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Agency Partners | Storefront HQ',
  description:
    'Independent public-store diagnosis for Shopify agencies, developers and ecommerce implementers before release or client handoff.',
};

export default function AgencyPartnersPage() {
  const config = publicConfig();
  const mailto = agencyInquiryMailto(config.contactEmail);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="relative border-b border-[#10261f]/15">
        <div className="qa-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[.18em] text-[#477a5b]">
              For Shopify agencies and implementers
            </p>
            <h1 className="mt-4 text-balance text-5xl font-black leading-[.94] tracking-[-0.055em] sm:text-7xl">
              An independent public-store check before handoff.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              Bring one reported public-storefront issue. Storefront HQ returns
              reproduction evidence, repair direction and an acceptance check;
              your team keeps the client relationship and implements the fix.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/products/store-emergency-check"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff6b35] px-6 text-sm font-black text-white shadow-[0_6px_0_#10261f] hover:bg-[#e95725]"
              >
                Review the £99 scope <ArrowRight className="size-4" />
              </Link>
              {mailto ? (
                <a
                  href={mailto}
                  className="inline-flex h-12 items-center px-3 text-sm font-black underline decoration-[#ff6b35] decoration-2 underline-offset-4"
                >
                  Ask about project fit
                </a>
              ) : null}
            </div>
          </div>
          <aside className="rounded-[2rem] border-2 border-[#10261f] bg-[#10261f] p-7 text-[#f8f4e8] shadow-[12px_12px_0_#f2c14e] sm:p-9">
            <p className="font-mono text-xs font-black uppercase tracking-[.18em] text-[#a8d66d]">
              Clean responsibility split
            </p>
            <ul className="mt-6 space-y-4">
              {[
                'Storefront HQ tests the agreed public issue only',
                'Your team owns implementation and client decisions',
                'The output includes a fix-ready acceptance check',
                'One public retest follows your completed repair',
                'No store admin, customer data or private analytics',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#a8d66d] text-[#10261f]">
                    <Check className="size-3.5 stroke-[3]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['Before release', 'Check one high-risk public journey after a theme, app, market or migration change.'],
            ['During incident response', 'Get a second set of public-browser evidence without adding another person to the client backend.'],
            ['Before client handoff', 'Give the implementer an acceptance check that can be repeated after repair.'],
          ].map(([title, description], index) => (
            <article
              key={title}
              className="rounded-[1.5rem] border-2 border-[#10261f]/20 bg-white/55 p-6"
            >
              <span className="font-mono text-xs font-black text-[#477a5b]">
                0{index + 1}
              </span>
              <h2 className="mt-3 text-2xl font-black">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-[2rem] border-2 border-[#10261f] bg-[#eaf2dc] p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-black tracking-[-0.04em]">
              A fixed service, not a competing implementation pitch.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Store Emergency Check remains £99 one-time: one reported public
              storefront issue, initial diagnosis within 24 hours and one public
              retest after your repair. Storefront HQ does not contact your
              client, enter their admin or promise a commercial outcome.
            </p>
          </div>
          <div className="mt-6 flex shrink-0 items-start gap-3 rounded-2xl bg-white/70 p-4 text-sm leading-6 lg:mt-0 lg:max-w-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#477a5b]" />
            <p>
              Enquiries stay in the business inbox. No list enrolment or
              automated follow-up without a new human reply.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
