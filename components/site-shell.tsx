import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { SiteNavigation } from '@/components/site-navigation';
import { BrandSignature } from '@/components/brand';
import { publicConfig } from '@/lib/config';

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-[#10261f]/10 bg-[#fbfaf5]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="shrink-0 rounded-xl"
          aria-label="Storefront HQ home"
        >
          <BrandSignature />
        </Link>
        <SiteNavigation />
      </div>
    </header>
  );
}

export function SiteFooter() {
  const config = publicConfig();
  const identityReady = Boolean(config.businessName && config.businessAddress);
  return (
    <footer className="border-t border-white/10 bg-[#10261f] text-[#f8f4e8]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_1fr] lg:px-10">
        <div>
          <Link
            href="/"
            aria-label="Storefront HQ home"
            className="inline-flex rounded-xl"
          >
            <BrandSignature inverse />
          </Link>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#b9c6b7]">
            A clear next step for your online store. Public-storefront
            diagnosis, practical seller resources and a clean handoff to your
            implementer. Independent from Shopify and every ecommerce platform.
          </p>
          {identityReady ? (
            <p className="mt-3 max-w-xl text-xs leading-5 text-[#9fb09c]">
              Seller: {config.businessName}, trading as Storefront HQ ·{' '}
              {config.businessAddress}
            </p>
          ) : null}
        </div>
        <nav
          aria-label="Footer navigation"
          className="grid grid-cols-2 content-start gap-x-6 gap-y-4 text-sm text-[#d8e1d6]"
        >
          <Link href="/products" className="underline-offset-4 hover:underline">
            Products
          </Link>
          <Link href="/triage" className="underline-offset-4 hover:underline">
            Free triage
          </Link>
          <Link
            href="/agency-partners"
            className="underline-offset-4 hover:underline"
          >
            Agencies
          </Link>
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>
          <Link href="/reviews" className="underline-offset-4 hover:underline">
            Reviews & feedback
          </Link>
          <Link href="/contact" className="underline-offset-4 hover:underline">
            Contact
          </Link>
          <Link
            href="/products/store-emergency-check#worked-example"
            className="underline-offset-4 hover:underline"
          >
            Worked example <ArrowUpRight className="inline size-3.5" />
          </Link>
          <Link href="/start" className="underline-offset-4 hover:underline">
            Product enquiry
          </Link>
        </nav>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-5 text-xs leading-5 text-[#b9c6b7] sm:px-8 lg:px-10">
        <p>Public pages only. No merchant-admin access required.</p>
        <p>© {new Date().getFullYear()} Storefront HQ</p>
      </div>
    </footer>
  );
}
