'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function DemoStorefront({ corrected }: { corrected: boolean }) {
  const [variant, setVariant] = useState('Natural');
  const [cartVariant, setCartVariant] = useState<string | null>(null);
  const mode = corrected ? 'after' : 'before';
  const shipping = corrected ? 0 : 6;
  return (
    <main className="min-h-screen bg-[#ece8df] px-5 py-8 text-[#10261f] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-bold underline" href="/sample-report">
          ← Evidence report and retest results
        </Link>
        <header className="my-6 rounded-2xl bg-[#10261f] p-6 text-white">
          <p className="text-sm font-bold uppercase tracking-wider text-[#cdeca5]">
            Storefront HQ controlled test fixture
          </p>
          <h1 className="mt-3 text-3xl font-black">
            {corrected ? 'After correction' : 'Before correction'} · test
            storefront
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-white/80">
            An intentionally built demonstration, not a client store or a
            Shopify installation. No orders, payment details or customer data
            are collected. The before version contains three seeded defects.
          </p>
          <nav
            className="mt-5 flex flex-wrap gap-3"
            aria-label="Compare test versions"
          >
            <Link
              aria-current={!corrected ? 'page' : undefined}
              className="rounded-lg border border-white/40 px-4 py-2 font-bold underline"
              href="/demo/before"
            >
              Before: reproduce defects
            </Link>
            <Link
              aria-current={corrected ? 'page' : undefined}
              className="rounded-lg border border-white/40 px-4 py-2 font-bold underline"
              href="/demo/after"
            >
              After: retest corrections
            </Link>
          </nav>
        </header>
        <p
          data-testid="delivery-promise"
          className="rounded-t-2xl bg-[#f2c14e] p-4 text-center font-bold"
        >
          Demo delivery: free on orders over £60
        </p>
        <div className="grid gap-6 rounded-b-2xl border bg-white p-6 md:grid-cols-2 sm:p-8">
          <section aria-labelledby="product-title">
            <p className="text-sm font-bold uppercase tracking-wider text-[#477a5b]">
              Test product · not for sale
            </p>
            <h2 id="product-title" className="mt-3 text-3xl font-black">
              Everyday carry bag
            </h2>
            <p className="mt-3 text-2xl font-bold">£69</p>
            <p className="mt-4 leading-7 text-muted-foreground">
              Choose Navy, add the bag, then compare the selected colour and
              delivery promise with the demo cart. Follow the size-guide link to
              check the supporting route.
            </p>
            <fieldset className="mt-6">
              <legend className="mb-3 font-bold">Colour</legend>
              <div className="flex gap-3">
                {['Natural', 'Navy'].map((colour) => (
                  <Button
                    key={colour}
                    type="button"
                    variant={variant === colour ? 'default' : 'outline'}
                    aria-pressed={variant === colour}
                    onClick={() => setVariant(colour)}
                    className="h-11 px-5 text-base"
                  >
                    {colour}
                  </Button>
                ))}
              </div>
            </fieldset>
            <p data-testid="selected-variant" className="mt-3 text-sm">
              Selected: {variant}
            </p>
            <Button
              data-testid="add-to-cart"
              onClick={() => setCartVariant(corrected ? variant : 'Natural')}
              className="mt-6 h-12 w-full text-base"
            >
              Add to demo cart
            </Button>
            <Link
              data-testid="size-guide"
              href={`/demo/${mode}/size-guide`}
              className="mt-5 inline-block font-bold underline"
            >
              Read the size guide
            </Link>
          </section>
          <section
            aria-labelledby="cart-title"
            aria-live="polite"
            className="rounded-xl bg-[#ece8df] p-5 sm:p-6"
          >
            <h2 id="cart-title" className="text-2xl font-black">
              Demo cart
            </h2>
            {cartVariant ? (
              <>
                <p className="mt-5 font-bold">Everyday carry bag</p>
                <p data-testid="cart-variant" className="mt-2">
                  Colour: {cartVariant}
                </p>
                <dl className="mt-6 space-y-3 border-y border-[#10261f]/20 py-4">
                  <div className="flex justify-between">
                    <dt>Item</dt>
                    <dd>£69</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Delivery</dt>
                    <dd data-testid="cart-shipping">£{shipping}</dd>
                  </div>
                  <div className="flex justify-between text-xl font-black">
                    <dt>Total</dt>
                    <dd data-testid="cart-total">£{69 + shipping}</dd>
                  </div>
                </dl>
                <Button
                  variant="outline"
                  className="mt-5 h-11 text-base"
                  onClick={() => setCartVariant(null)}
                >
                  Clear demo cart
                </Button>
              </>
            ) : (
              <p className="mt-5 leading-7">
                Your demo cart is empty. Choose a colour and add the test
                product.
              </p>
            )}
            <p className="mt-6 text-sm leading-6 text-muted-foreground">
              Demonstration stops here. There is no checkout or purchase.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
