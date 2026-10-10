import { ArrowRight, Store } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#10261f]/15 bg-[#f8f4e8]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Storefront HQ home"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-[#10261f] text-[#f8f4e8] shadow-[3px_3px_0_#ff6b35]">
            <Store className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-black tracking-[-0.02em]">
              Storefront HQ
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-[#477a5b] sm:block">
              Tools and help for online sellers
            </span>
          </span>
        </Link>
        <nav
          className="flex items-center gap-1 sm:gap-3"
          aria-label="Main navigation"
        >
          <Link
            href="/#products"
            className="hidden px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground sm:block"
          >
            Products
          </Link>
          <Link
            href="/shopify-launch-migration-qa-checklist"
            className="hidden px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground lg:block"
          >
            Free checklist
          </Link>
          <Link
            href="/start"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-10 rounded-full bg-[#ff6b35] px-4 font-black text-white hover:bg-[#e95725]',
            )}
          >
            Find my best fit <ArrowRight className="size-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#10261f] text-[#f8f4e8]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] lg:px-10">
        <div>
          <p className="text-lg font-black">Storefront HQ</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#b9c6b7]">
            Practical products and focused expert help for people building and
            growing online shops. Independent from Shopify and every ecommerce
            platform.
          </p>
        </div>
        <nav className="flex flex-wrap content-start gap-x-5 gap-y-3 text-sm text-[#d8e1d6] md:justify-end">
          <Link
            href="/#products"
            className="underline-offset-4 hover:underline"
          >
            Products
          </Link>
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>
          <Link href="/start" className="underline-offset-4 hover:underline">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
