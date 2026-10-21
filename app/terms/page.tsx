import Link from 'next/link';

import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { publicConfig } from '@/lib/config';
import { products, productPrice } from '@/lib/products';
import { pageMetadata } from '@/lib/metadata';
import { termsSections, termsUpdated } from '@/lib/terms';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata(
  'Terms & Conditions',
  'Storefront HQ product scope, payment, delivery, cancellation, subscription and seller contact terms.',
  '/terms',
);

export default function TermsPage() {
  const config = publicConfig();
  // Terms-only disclosures do not activate checkout or repeat a personal
  // address in the homepage footer. Exact values require owner approval.
  const sellerName =
    process.env.PUBLIC_TERMS_SELLER_NAME?.trim() || config.businessName;
  const sellerAddress =
    process.env.PUBLIC_TERMS_SELLER_ADDRESS?.trim() || config.businessAddress;
  const identityReady = Boolean(sellerName && sellerAddress);
  const checkoutAvailable = Object.values(config.productCheckouts).some(
    (checkout) => checkout.ready,
  );
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <article className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-20 print:max-w-none print:px-0 print:py-0">
        <header className="border-b border-[#10261f]/20 pb-8">
          <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-[#477a5b]">
            Storefront HQ · Product terms
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
            Terms & Conditions
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Last updated {termsUpdated}. English-language version.
          </p>
          <p className="mt-5 text-base leading-8 text-foreground/80">
            Please read these terms before purchasing. They explain the product
            scope, payment and delivery process, subscription cancellation and
            your responsibilities. Mandatory legal rights remain protected.
          </p>
          <p className="mt-4 text-base leading-7">
            <a
              href="#seller-and-contact"
              className="font-bold underline underline-offset-4"
            >
              Seller and contact details
            </a>{' '}
            are in the clearly labelled final section. Use the contents below to
            go directly to any section, or your browser’s Print function to save
            a copy.
          </p>
        </header>

        {!checkoutAvailable ? (
          <aside
            aria-label="Current checkout availability"
            className="mt-7 rounded-xl border border-[#477a5b]/30 bg-[#e9f4dc]/50 p-5 text-base leading-7"
          >
            <strong>Purchases are currently paused.</strong> Product enquiries
            remain available. An enquiry is not an order, and publishing or
            viewing these terms does not activate checkout.
          </aside>
        ) : null}

        <nav
          aria-label="Terms contents"
          className="mt-8 rounded-xl border border-[#10261f]/15 bg-white/50 p-5 sm:p-7"
        >
          <h2 className="text-lg font-bold">Contents</h2>
          <ol className="mt-4 grid gap-x-8 gap-y-3 text-sm leading-6 sm:grid-cols-2">
            <li>
              <a href="#catalogue" className="underline underline-offset-4">
                1. Products and prices
              </a>
            </li>
            {termsSections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={'#' + section.id}
                  className="underline underline-offset-4"
                >
                  {index + 2}. {section.title}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#seller-and-contact"
                className="font-bold underline underline-offset-4"
              >
                {termsSections.length + 2}. Seller and contact
              </a>
            </li>
          </ol>
        </nav>

        <div className="mt-12 space-y-12 text-base leading-8 text-foreground/80 [&_h2]:mb-5 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_p+p]:mt-5 [&_section]:scroll-mt-28 print:space-y-8">
          <section id="catalogue" aria-labelledby="catalogue-heading">
            <h2 id="catalogue-heading">1. Products and prices</h2>
            <div className="space-y-5">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border-l-2 border-[#477a5b]/40 pl-5"
                >
                  <h3 className="font-bold text-foreground">
                    {product.name} — {productPrice(product)} GBP
                    {product.billing === 'one-time' ? ' one-time' : ''}
                  </h3>
                  <p>
                    {product.description} {product.turnaround}.
                  </p>
                  {product.id === 'store-emergency-check' ? (
                    <p>Includes one public retest after repair.</p>
                  ) : null}
                  {product.id === 'seller-campaign-club' ? (
                    <p>
                      A new practical campaign pack each month. Cancel through
                      Stripe; no minimum term.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <p>
              These are the current products for new purchases. Read the
              relevant product page for its stated deliverables. Earlier
              verified purchases remain subject to their accepted scope and
              terms; they are not converted into a different product by this
              page.
            </p>
          </section>

          {termsSections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={section.id + '-heading'}
            >
              <h2 id={section.id + '-heading'}>
                {index + 2}. {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.id === 'subscription' && config.customerPortalUrl ? (
                <p>
                  <a
                    href={config.customerPortalUrl}
                    className="font-bold underline underline-offset-4"
                  >
                    Manage or cancel Seller Campaign Club through Stripe
                  </a>
                  .
                </p>
              ) : null}
              {section.id === 'your-information' ? (
                <p>
                  Read the{' '}
                  <Link
                    href="/privacy"
                    className="font-bold underline underline-offset-4"
                  >
                    privacy notice
                  </Link>{' '}
                  for further information.
                </p>
              ) : null}
            </section>
          ))}

          <section
            id="seller-and-contact"
            aria-labelledby="seller-heading"
            className="rounded-xl border border-[#10261f]/20 bg-white/60 p-5 sm:p-7"
          >
            <h2 id="seller-heading">
              {termsSections.length + 2}. Seller and contact
            </h2>
            {identityReady ? (
              <dl className="space-y-4">
                <div>
                  <dt className="font-bold text-foreground">Legal seller</dt>
                  <dd>{sellerName}, trading as Storefront HQ.</dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground">Postal address</dt>
                  <dd className="whitespace-pre-line">{sellerAddress}</dd>
                </div>
              </dl>
            ) : (
              <p>
                The verified seller name and postal address have not yet been
                published. Checkout remains unavailable while seller disclosure
                and purchase-readiness checks are completed.
              </p>
            )}
            <p className="mt-5">
              For product questions, cancellation notices and complaints, email{' '}
              <a
                href={'mailto:' + config.contactEmail}
                className="font-bold underline underline-offset-4"
              >
                {config.contactEmail}
              </a>
              . You can also use the{' '}
              <Link
                href="/contact"
                className="font-bold underline underline-offset-4"
              >
                Contact page
              </Link>
              . Do not include card details, passwords or private customer
              records.
            </p>
            <p>
              <a href="#catalogue" className="underline underline-offset-4">
                Return to products and prices
              </a>
              .
            </p>
          </section>
        </div>
      </article>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </main>
  );
}
